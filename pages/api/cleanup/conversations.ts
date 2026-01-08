import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/utils/lib/dbconnect';
import SecureConversation from '@/utils/lib/types/secure-conversation.model';
import AuditLog from '@/utils/lib/types/audit-log.model';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/cleanup/conversations
 * Cleanup old personal conversations
 * - Soft delete personal conversations > 60 days since last message
 * - Hard delete soft_deleted conversations > 3 days in grace period
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
    softDeletedConversations: 0,
    hardDeletedConversations: 0,
  };

  try {
    // Step 1: Soft delete old personal conversations (> 60 days since last message)
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - 60);

    const oldConversations = await SecureConversation.find({
      'metadata.isPersonalChat': true,
      lastMessageAt: { $lt: retentionDate },
      status: 'active',
    });

    for (const conversation of oldConversations) {
      conversation.status = 'soft_deleted';
      conversation.softDeletedAt = new Date();
      await conversation.save();
      stats.softDeletedConversations++;

      await AuditLog.create({
        eventType: 'conversation_cleanup',
        entityType: 'conversation',
        entityId: conversation._id,
        action: 'soft_delete',
        initiatedBy: {
          source: 'system_cleanup',
        },
        relatedBatchId: batchId,
        reason: 'Personal conversation retention period exceeded (60 days)',
        details: {
          conversationId: conversation.conversationId,
          isPersonalChat: true,
          lastMessageAt: conversation.lastMessageAt,
          messageCount: conversation.metadata.totalMessages,
          participants: conversation.participants.map((p) => p.userEmail),
        },
      });
    }

    // Step 2: Hard delete conversations soft deleted > 3 days ago
    const gracePeriodDate = new Date();
    gracePeriodDate.setDate(gracePeriodDate.getDate() - 3);

    const conversationsToHardDelete = await SecureConversation.find({
      status: 'soft_deleted',
      softDeletedAt: { $lt: gracePeriodDate },
    });

    for (const conversation of conversationsToHardDelete) {
      conversation.status = 'hard_deleted';
      conversation.hardDeletedAt = new Date();
      await conversation.save();
      stats.hardDeletedConversations++;

      await AuditLog.create({
        eventType: 'conversation_cleanup',
        entityType: 'conversation',
        entityId: conversation._id,
        action: 'hard_delete',
        initiatedBy: {
          source: 'system_cleanup',
        },
        relatedBatchId: batchId,
        reason: 'Grace period expired (3 days after soft delete)',
        details: {
          conversationId: conversation.conversationId,
          softDeletedAt: conversation.softDeletedAt,
          messageCount: conversation.metadata.totalMessages,
        },
      });
    }

    return res.status(200).json({
      message: 'Conversation cleanup completed successfully',
      batchId,
      stats,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('Error during conversation cleanup:', error);

    await AuditLog.create({
      eventType: 'conversation_cleanup',
      entityType: 'system',
      action: 'cleanup_failed',
      initiatedBy: {
        source: 'system_cleanup',
      },
      relatedBatchId: batchId,
      reason: 'Error during conversation cleanup',
      details: {
        error: error.message,
        stats,
      },
    });

    return res.status(500).json({
      error: 'Conversation cleanup failed',
      message: error.message,
      partialStats: stats,
    });
  }
}
