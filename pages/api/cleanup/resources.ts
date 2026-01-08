import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/utils/lib/dbconnect';
import SecureResource from '@/utils/lib/types/secure-resource.model';
import AuditLog from '@/utils/lib/types/audit-log.model';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/cleanup/resources
 * Cleanup old personal chat resources
 * - Soft delete personal_chat resources > 60 days old
 * - Hard delete soft_deleted resources > 3 days in grace period
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
    softDeletedResources: 0,
    hardDeletedResources: 0,
  };

  try {
    // Step 1: Soft delete old personal chat resources (> 60 days)
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - 60);

    const oldResources = await SecureResource.find({
      uploadType: 'personal_chat',
      uploadedAt: { $lt: retentionDate },
      status: 'Active',
    });

    for (const resource of oldResources) {
      resource.status = 'SoftDeleted';
      resource.softDeletedAt = new Date();
      await resource.save();
      stats.softDeletedResources++;

      await AuditLog.create({
        eventType: 'resource_cleanup',
        entityType: 'resource',
        entityId: resource._id,
        entityName: resource.fileName,
        action: 'soft_delete',
        initiatedBy: {
          source: 'system_cleanup',
        },
        relatedBatchId: batchId,
        reason: 'Personal chat resource retention period exceeded (60 days)',
        details: {
          resourceId: resource.resourceId,
          uploadType: resource.uploadType,
          uploadedAt: resource.uploadedAt,
          uploadedBy: resource.uploadedBy,
        },
      });
    }

    // Step 2: Hard delete resources soft deleted > 3 days ago
    const gracePeriodDate = new Date();
    gracePeriodDate.setDate(gracePeriodDate.getDate() - 3);

    const resourcesToHardDelete = await SecureResource.find({
      status: 'SoftDeleted',
      softDeletedAt: { $lt: gracePeriodDate },
    });

    for (const resource of resourcesToHardDelete) {
      resource.status = 'HardDeleted';
      resource.hardDeletedAt = new Date();
      await resource.save();
      stats.hardDeletedResources++;

      await AuditLog.create({
        eventType: 'resource_cleanup',
        entityType: 'resource',
        entityId: resource._id,
        entityName: resource.fileName,
        action: 'hard_delete',
        initiatedBy: {
          source: 'system_cleanup',
        },
        relatedBatchId: batchId,
        reason: 'Grace period expired (3 days after soft delete)',
        details: {
          resourceId: resource.resourceId,
          uploadType: resource.uploadType,
          softDeletedAt: resource.softDeletedAt,
          filePath: resource.filePath,
        },
      });
    }

    return res.status(200).json({
      message: 'Resource cleanup completed successfully',
      batchId,
      stats,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('Error during resource cleanup:', error);

    await AuditLog.create({
      eventType: 'resource_cleanup',
      entityType: 'system',
      action: 'cleanup_failed',
      initiatedBy: {
        source: 'system_cleanup',
      },
      relatedBatchId: batchId,
      reason: 'Error during resource cleanup',
      details: {
        error: error.message,
        stats,
      },
    });

    return res.status(500).json({
      error: 'Resource cleanup failed',
      message: error.message,
      partialStats: stats,
    });
  }
}
