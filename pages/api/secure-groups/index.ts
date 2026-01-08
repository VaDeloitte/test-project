import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/utils/lib/dbconnect';
import SecureGroup from '@/utils/lib/types/secure-group.model';
import AuditLog from '@/utils/lib/types/audit-log.model';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/secure-groups - List all groups for a user
 * POST /api/secure-groups - Create a new group
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      const { userEmail } = req.query;

      if (!userEmail || typeof userEmail !== 'string') {
        return res.status(400).json({ error: 'userEmail is required' });
      }

      const groups = await SecureGroup.find({
        'members.userEmail': userEmail,
        status: { $in: ['active', 'expired'] },
      }).sort({ createdAt: -1 });

      return res.status(200).json({
        groups,
        total: groups.length,
      });
    } catch (error: any) {
      console.error('Error fetching groups:', error);
      return res.status(500).json({
        error: 'Failed to fetch groups',
        message: error.message,
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        groupName,
        description,
        createdBy,
        createdByAzureId,
        members,
        space_lifetime = 30,
      } = req.body;

      if (!groupName || !createdBy || !createdByAzureId) {
        return res.status(400).json({
          error: 'groupName, createdBy, and createdByAzureId are required',
        });
      }

      const groupId = uuidv4();

      // Ensure creator is an admin
      const groupMembers = members || [];
      const creatorExists = groupMembers.find(
        (m: any) => m.userEmail === createdBy
      );

      if (!creatorExists) {
        groupMembers.push({
          userEmail: createdBy,
          azureAdId: createdByAzureId,
          role: 'admin',
          joinedAt: new Date(),
          rights: {
            canEdit: true,
            canDelete: true,
            canInvite: true,
            canManageMembers: true,
          },
        });
      }

      const group = await SecureGroup.create({
        groupId,
        groupName,
        description,
        createdBy,
        createdByAzureId,
        members: groupMembers,
        space_lifetime,
        status: 'active',
        metadata: {
          totalMembers: groupMembers.length,
          totalResources: 0,
          lastActivityAt: new Date(),
        },
      });

      // Audit log
      await AuditLog.create({
        eventType: 'group_created',
        entityType: 'group',
        entityId: group._id,
        entityName: groupName,
        action: 'create',
        initiatedBy: {
          email: createdBy,
          userId: createdByAzureId,
        },
        details: {
          groupId,
          space_lifetime,
          memberCount: groupMembers.length,
        },
      });

      return res.status(201).json({
        message: 'Group created successfully',
        group,
      });
    } catch (error: any) {
      console.error('Error creating group:', error);
      return res.status(500).json({
        error: 'Failed to create group',
        message: error.message,
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
