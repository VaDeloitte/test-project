import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/utils/lib/dbconnect';
import SecureResource from '@/utils/lib/types/secure-resource.model';
import AuditLog from '@/utils/lib/types/audit-log.model';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/secure-resources/upload
 * Unified endpoint for all file uploads (project/group_chat/personal_chat)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await dbConnect();

  try {
    const {
      fileName,
      filePath,
      fileSize,
      fileType,
      uploadType,
      uploadedBy,
      uploadedByAzureId,
      groupId,
      conversationId,
      projectId,
      metadata,
    } = req.body;

    // Validation
    if (
      !fileName ||
      !filePath ||
      !fileSize ||
      !fileType ||
      !uploadType ||
      !uploadedBy ||
      !uploadedByAzureId
    ) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: [
          'fileName',
          'filePath',
          'fileSize',
          'fileType',
          'uploadType',
          'uploadedBy',
          'uploadedByAzureId',
        ],
      });
    }

    // Validate upload type
    if (!['project', 'group_chat', 'personal_chat'].includes(uploadType)) {
      return res.status(400).json({
        error: 'Invalid uploadType',
        allowed: ['project', 'group_chat', 'personal_chat'],
      });
    }

    // Validate context
    if (uploadType === 'group_chat' && !groupId) {
      return res.status(400).json({
        error: 'groupId is required for group_chat uploads',
      });
    }

    if (uploadType === 'personal_chat' && !conversationId) {
      return res.status(400).json({
        error: 'conversationId is required for personal_chat uploads',
      });
    }

    if (uploadType === 'project' && !projectId) {
      return res.status(400).json({
        error: 'projectId is required for project uploads',
      });
    }

    const resourceId = uuidv4();

    const resource = await SecureResource.create({
      resourceId,
      fileName,
      filePath,
      fileSize,
      fileType,
      uploadType,
      uploadedBy,
      uploadedByAzureId,
      groupId,
      conversationId,
      projectId,
      status: 'Active',
      uploadedAt: new Date(),
      lastAccessedAt: new Date(),
      metadata: metadata || {},
    });

    // Audit log
    await AuditLog.create({
      eventType: 'resource_uploaded',
      entityType: 'resource',
      entityId: resource._id,
      entityName: fileName,
      action: 'upload',
      initiatedBy: {
        email: uploadedBy,
        userId: uploadedByAzureId,
      },
      details: {
        resourceId,
        uploadType,
        fileSize,
        fileType,
        groupId,
        conversationId,
        projectId,
      },
    });

    return res.status(201).json({
      message: 'Resource uploaded successfully',
      resource: {
        resourceId,
        fileName,
        uploadType,
        status: 'Active',
        uploadedAt: resource.uploadedAt,
      },
    });
  } catch (error: any) {
    console.error('Error uploading resource:', error);
    return res.status(500).json({
      error: 'Failed to upload resource',
      message: error.message,
    });
  }
}
