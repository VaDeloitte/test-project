import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/utils/lib/dbconnect';
import SecureUser from '@/utils/lib/types/secure-user.model';
import SecureGroup from '@/utils/lib/types/secure-group.model';
import SecureResource from '@/utils/lib/types/secure-resource.model';
import SecureConversation from '@/utils/lib/types/secure-conversation.model';
import AuditLog from '@/utils/lib/types/audit-log.model';
import { v4 as uuidv4 } from 'uuid';

/**
 * DELETE /api/secure-users/[email]
 * Hard delete a user and all associated data
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.query;
  const batchId = uuidv4();

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    await dbConnect();

    // Find user
    const user = await SecureUser.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const deletionStats = {
      user: email,
      removedFromGroups: 0,
      deletedResources: 0,
      deletedConversations: 0,
      timestamp: new Date(),
    };

    // Step 1: Remove user from all groups
    const groups = await SecureGroup.find({
      'members.userEmail': email,
    });

    for (const group of groups) {
      group.members = group.members.filter((m) => m.userEmail !== email);
      group.metadata.totalMembers = group.members.length;
      
      // If no members left, soft delete the group
      if (group.members.length === 0) {
        group.status = 'soft_deleted';
        group.softDeletedAt = new Date();
      }
      
      await group.save();
      deletionStats.removedFromGroups++;

      // Audit log
      await AuditLog.create({
        eventType: 'user_hard_delete',
        entityType: 'group',
        entityId: group._id,
        entityName: group.groupName,
        action: 'user_removed',
        initiatedBy: {
          email: email,
          source: 'system_cleanup',
        },
        relatedBatchId: batchId,
        reason: 'User hard delete',
        details: {
          removedUser: email,
          remainingMembers: group.members.length,
        },
      });
    }

    // Step 2: Hard delete all personal resources
    const personalResources = await SecureResource.find({
      uploadedBy: email,
      uploadType: 'personal_chat',
    });

    for (const resource of personalResources) {
      resource.status = 'HardDeleted';
      resource.hardDeletedAt = new Date();
      await resource.save();
      deletionStats.deletedResources++;

      await AuditLog.create({
        eventType: 'user_hard_delete',
        entityType: 'resource',
        entityId: resource._id,
        entityName: resource.fileName,
        action: 'hard_delete',
        initiatedBy: {
          email: email,
          source: 'system_cleanup',
        },
        relatedBatchId: batchId,
        reason: 'User hard delete - personal resource',
        details: {
          resourceId: resource.resourceId,
          uploadType: resource.uploadType,
        },
      });
    }

    // Step 3: Hard delete all personal conversations
    const personalConversations = await SecureConversation.find({
      'metadata.isPersonalChat': true,
      'participants.userEmail': email,
    });

    for (const conversation of personalConversations) {
      conversation.status = 'hard_deleted';
      conversation.hardDeletedAt = new Date();
      await conversation.save();
      deletionStats.deletedConversations++;

      await AuditLog.create({
        eventType: 'user_hard_delete',
        entityType: 'conversation',
        entityId: conversation._id,
        action: 'hard_delete',
        initiatedBy: {
          email: email,
          source: 'system_cleanup',
        },
        relatedBatchId: batchId,
        reason: 'User hard delete - personal conversation',
        details: {
          conversationId: conversation.conversationId,
          totalMessages: conversation.metadata.totalMessages,
        },
      });
    }

    // Step 4: Hard delete the user
    user.status = 'hard_deleted';
    user.hardDeletedAt = new Date();
    await user.save();

    // Final audit log
    await AuditLog.create({
      eventType: 'user_hard_delete',
      entityType: 'user',
      entityId: user._id,
      entityName: user.username,
      action: 'hard_delete',
      initiatedBy: {
        email: email,
        source: 'system_cleanup',
      },
      relatedBatchId: batchId,
      reason: 'User hard delete completed',
      details: deletionStats,
    });

    return res.status(200).json({
      message: 'User hard deleted successfully',
      batchId,
      stats: deletionStats,
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    
    // Error audit log
    await AuditLog.create({
      eventType: 'user_hard_delete',
      entityType: 'user',
      action: 'hard_delete_failed',
      initiatedBy: {
        email: email as string,
        source: 'system_cleanup',
      },
      relatedBatchId: batchId,
      reason: 'Error during user hard delete',
      details: {
        error: error.message,
      },
    });

    return res.status(500).json({
      error: 'Failed to delete user',
      message: error.message,
    });
  }
}
