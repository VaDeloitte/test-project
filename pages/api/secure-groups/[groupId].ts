import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/utils/lib/dbconnect';
import SecureGroup from '@/utils/lib/types/secure-group.model';
import SecureResource from '@/utils/lib/types/secure-resource.model';
import SecureConversation from '@/utils/lib/types/secure-conversation.model';
import AuditLog from '@/utils/lib/types/audit-log.model';

/**
 * GET /api/secure-groups/[groupId] - Get group details
 * DELETE /api/secure-groups/[groupId] - Soft delete a group
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { groupId } = req.query;

  if (!groupId || typeof groupId !== 'string') {
    return res.status(400).json({ error: 'groupId is required' });
  }

  await dbConnect();

  if (req.method === 'GET') {
    try {
      const group = await SecureGroup.findOne({
        groupId,
        status: { $in: ['active', 'expired'] },
      });

      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      // Get group resources count
      const resourcesCount = await SecureResource.countDocuments({
        groupId,
        status: 'Active',
      });

      // Get group conversations count
      const conversationsCount = await SecureConversation.countDocuments({
        groupId,
        status: 'active',
      });

      return res.status(200).json({
        group,
        stats: {
          resources: resourcesCount,
          conversations: conversationsCount,
        },
      });
    } catch (error: any) {
      console.error('Error fetching group:', error);
      return res.status(500).json({
        error: 'Failed to fetch group',
        message: error.message,
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { userEmail } = req.body;

      if (!userEmail) {
        return res.status(400).json({ error: 'userEmail is required' });
      }

      const group = await SecureGroup.findOne({ groupId });

      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      // Check if user is admin
      const isAdmin = group.members.some(
        (m) => m.userEmail === userEmail && m.role === 'admin'
      );
      
      if (!isAdmin) {
        return res.status(403).json({
          error: 'Only group admins can delete groups',
        });
      }

      // Soft delete the group
      group.status = 'soft_deleted';
      group.softDeletedAt = new Date();
      await group.save();

      // Soft delete all group resources
      await SecureResource.updateMany(
        { groupId, status: 'Active' },
        {
          $set: {
            status: 'SoftDeleted',
            softDeletedAt: new Date(),
          },
        }
      );

      // Soft delete all group conversations
      await SecureConversation.updateMany(
        { groupId, status: 'active' },
        {
          $set: {
            status: 'soft_deleted',
            softDeletedAt: new Date(),
          },
        }
      );

      // Audit log
      await AuditLog.create({
        eventType: 'group_deleted',
        entityType: 'group',
        entityId: group._id,
        entityName: group.groupName,
        action: 'soft_delete',
        initiatedBy: {
          email: userEmail,
        },
        reason: 'User-initiated group deletion',
        details: {
          groupId,
          memberCount: group.members.length,
        },
      });

      return res.status(200).json({
        message: 'Group soft deleted successfully',
        groupId,
      });
    } catch (error: any) {
      console.error('Error deleting group:', error);
      return res.status(500).json({
        error: 'Failed to delete group',
        message: error.message,
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
