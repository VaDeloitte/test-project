import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/utils/lib/dbconnect';
import SecureGroup from '@/utils/lib/types/secure-group.model';
import SecureResource from '@/utils/lib/types/secure-resource.model';
import SecureConversation from '@/utils/lib/types/secure-conversation.model';
import AuditLog from '@/utils/lib/types/audit-log.model';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/cleanup/groups
 * Cleanup expired and soft-deleted groups
 * - Mark expired groups as soft_deleted
 * - Hard delete groups soft_deleted > 3 days ago
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cleanup API key
  const apiKey = req.headers['x-cleanup-api-key'];
  if (apiKey !== process.env.CLEANUP_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await dbConnect();

  const batchId = uuidv4();
  const stats = {
    expiredGroups: 0,
    hardDeletedGroups: 0,
    deletedResources: 0,
    deletedConversations: 0,
  };

  try {
    // Step 1: Find and soft delete expired groups
    const expiredGroups = await SecureGroup.find({
      expiresAt: { $lt: new Date() },
      status: 'active',
    });

    for (const group of expiredGroups) {
      group.status = 'soft_deleted';
      group.softDeletedAt = new Date();
      await group.save();
      stats.expiredGroups++;

      // Soft delete group resources
      await SecureResource.updateMany(
        { groupId: group.groupId, status: 'Active' },
        {
          $set: {
            status: 'SoftDeleted',
            softDeletedAt: new Date(),
          },
        }
      );

      // Soft delete group conversations
      await SecureConversation.updateMany(
        { groupId: group.groupId, status: 'active' },
        {
          $set: {
            status: 'soft_deleted',
            softDeletedAt: new Date(),
          },
        }
      );

      await AuditLog.create({
        eventType: 'group_cleanup',
        entityType: 'group',
        entityId: group._id,
        entityName: group.groupName,
        action: 'soft_delete',
        initiatedBy: {
          source: 'system_cleanup',
        },
        relatedBatchId: batchId,
        reason: 'Group expired - space_lifetime exceeded',
        details: {
          groupId: group.groupId,
          expiresAt: group.expiresAt,
          memberCount: group.members.length,
        },
      });
    }

    // Step 2: Find groups soft deleted > 3 days ago
    const gracePeriodDate = new Date();
    gracePeriodDate.setDate(gracePeriodDate.getDate() - 3);

    const groupsToHardDelete = await SecureGroup.find({
      status: 'soft_deleted',
      softDeletedAt: { $lt: gracePeriodDate },
    });

    for (const group of groupsToHardDelete) {
      // Hard delete group resources
      const resources = await SecureResource.find({
        groupId: group.groupId,
        status: 'SoftDeleted',
      });

      for (const resource of resources) {
        resource.status = 'HardDeleted';
        resource.hardDeletedAt = new Date();
        await resource.save();
        stats.deletedResources++;
      }

      // Hard delete group conversations
      const conversations = await SecureConversation.find({
        groupId: group.groupId,
        status: 'soft_deleted',
      });

      for (const conversation of conversations) {
        conversation.status = 'hard_deleted';
        conversation.hardDeletedAt = new Date();
        await conversation.save();
        stats.deletedConversations++;
      }

      // Hard delete the group
      group.status = 'hard_deleted';
      group.hardDeletedAt = new Date();
      await group.save();
      stats.hardDeletedGroups++;

      await AuditLog.create({
        eventType: 'group_cleanup',
        entityType: 'group',
        entityId: group._id,
        entityName: group.groupName,
        action: 'hard_delete',
        initiatedBy: {
          source: 'system_cleanup',
        },
        relatedBatchId: batchId,
        reason: 'Grace period expired (3 days after soft delete)',
        details: {
          groupId: group.groupId,
          softDeletedAt: group.softDeletedAt,
          resourcesDeleted: stats.deletedResources,
          conversationsDeleted: stats.deletedConversations,
        },
      });
    }

    return res.status(200).json({
      message: 'Group cleanup completed successfully',
      batchId,
      stats,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('Error during group cleanup:', error);

    await AuditLog.create({
      eventType: 'group_cleanup',
      entityType: 'system',
      action: 'cleanup_failed',
      initiatedBy: {
        source: 'system_cleanup',
      },
      relatedBatchId: batchId,
      reason: 'Error during group cleanup',
      details: {
        error: error.message,
        stats,
      },
    });

    return res.status(500).json({
      error: 'Group cleanup failed',
      message: error.message,
      partialStats: stats,
    });
  }
}
