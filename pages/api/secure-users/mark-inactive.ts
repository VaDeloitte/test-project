import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../../utils/lib/dbconnect';
import SecureUser from '../../../utils/lib/types/secure-user.model';
import AuditLog from '../../../utils/lib/types/audit-log.model';
import { v4 as uuidv4 } from 'uuid';

interface Data {
  success: boolean;
  data?: any;
  message?: string;
  batchId?: string;
}

/**
 * Mark users as inactive if they haven't logged in for 60+ days
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  // Optional: Verify API key for automated calls
  const apiKey = req.headers['x-cleanup-api-key'];
  if (apiKey && apiKey !== process.env.CLEANUP_API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
    });
  }

  const batchId = uuidv4();

  try {
    await connectDB();

    // Calculate cutoff date (60 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 60);

    // Find and update inactive users
    const result = await SecureUser.updateMany(
      {
        lastLoginAt: { $lt: cutoffDate },
        status: 'active',
      },
      {
        $set: {
          status: 'inactive',
          updatedAt: new Date(),
        },
      }
    );

    // Log the batch operation
    await AuditLog.create({
      eventType: 'mark_inactive_users',
      entityType: 'user_batch',
      action: 'bulk_update',
      initiatedBy: {
        source: apiKey ? 'system_cleanup' : 'manual_trigger',
      },
      relatedBatchId: batchId,
      timestamp: new Date(),
      details: {
        modified_count: result.modifiedCount,
        cutoff_date: cutoffDate,
      },
    });

    return res.status(200).json({
      success: true,
      message: `${result.modifiedCount} users marked as inactive`,
      batchId,
      data: {
        modifiedCount: result.modifiedCount,
        cutoffDate: cutoffDate,
      },
    });
  } catch (error) {
    console.error('Error marking inactive users:', error);
    const message = error instanceof Error ? error.message : 'An error occurred';
    
    // Error audit log
    await AuditLog.create({
      eventType: 'mark_inactive_users',
      entityType: 'user_batch',
      action: 'bulk_update_failed',
      initiatedBy: {
        source: 'system_cleanup',
      },
      relatedBatchId: batchId,
      reason: 'Error during mark inactive operation',
      details: {
        error: message,
      },
    });
    
    return res.status(500).json({ success: false, message });
  }
}
