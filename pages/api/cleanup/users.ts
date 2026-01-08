import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/utils/lib/dbconnect';
import SecureUser from '@/utils/lib/types/secure-user.model';
import AuditLog from '@/utils/lib/types/audit-log.model';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/cleanup/users
 * Cleanup inactive users
 * - Mark users inactive if no login > 60 days
 * - Hard delete users soft_deleted > 3 days in grace period
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
    markedInactive: 0,
    hardDeletedUsers: 0,
  };

  try {
    // Step 1: Mark users inactive (no login > 60 days)
    const inactivityDate = new Date();
    inactivityDate.setDate(inactivityDate.getDate() - 60);

    const result = await SecureUser.updateMany(
      {
        lastLoginAt: { $lt: inactivityDate },
        status: 'active',
      },
      {
        $set: {
          status: 'inactive',
        },
      }
    );

    stats.markedInactive = result.modifiedCount || 0;

    if (stats.markedInactive > 0) {
      await AuditLog.create({
        eventType: 'user_cleanup',
        entityType: 'user',
        action: 'mark_inactive',
        initiatedBy: {
          source: 'system_cleanup',
        },
        relatedBatchId: batchId,
        reason: 'No login activity for 60 days',
        details: {
          usersMarkedInactive: stats.markedInactive,
          inactivityThreshold: inactivityDate,
        },
      });
    }

    // Step 2: Hard delete users soft_deleted > 3 days ago
    const gracePeriodDate = new Date();
    gracePeriodDate.setDate(gracePeriodDate.getDate() - 3);

    const usersToHardDelete = await SecureUser.find({
      status: 'soft_deleted',
      softDeletedAt: { $lt: gracePeriodDate },
    });

    for (const user of usersToHardDelete) {
      user.status = 'hard_deleted';
      user.hardDeletedAt = new Date();
      await user.save();
      stats.hardDeletedUsers++;

      await AuditLog.create({
        eventType: 'user_cleanup',
        entityType: 'user',
        entityId: user._id,
        entityName: user.username,
        action: 'hard_delete',
        initiatedBy: {
          source: 'system_cleanup',
        },
        relatedBatchId: batchId,
        reason: 'Grace period expired (3 days after soft delete)',
        details: {
          email: user.email,
          azureAdId: user.azureAdId,
          softDeletedAt: user.softDeletedAt,
        },
      });
    }

    return res.status(200).json({
      message: 'User cleanup completed successfully',
      batchId,
      stats,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('Error during user cleanup:', error);

    await AuditLog.create({
      eventType: 'user_cleanup',
      entityType: 'system',
      action: 'cleanup_failed',
      initiatedBy: {
        source: 'system_cleanup',
      },
      relatedBatchId: batchId,
      reason: 'Error during user cleanup',
      details: {
        error: error.message,
        stats,
      },
    });

    return res.status(500).json({
      error: 'User cleanup failed',
      message: error.message,
      partialStats: stats,
    });
  }
}
