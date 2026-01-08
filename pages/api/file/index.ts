// pages/api/files/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../../utils/lib/dbconnect';
import UserFiles from '@/utils/lib/types/files.model';
import { withAuth } from '../../../utils/middleware/auth';

async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { method } = req;

    try {
        await connectDB();

        // Get user info from auth middleware (assuming withAuth attaches this)
        const userId = (req as any).userId;
        
        // Try to get email from middleware first, then fall back to body
        const userEmail = (req as any).email || req.body?.email;
        console.log("======DELETE====== from: ", userEmail);

        // if (!userId) {
        //     return res.status(401).json({ error: 'User not authenticated' });
        // }

        switch (method) {
            case 'GET':
                return await handleGet(req, res, userId);
            
            case 'DELETE':
                return await handleDelete(req, res, userId, userEmail);
            
            default:
                return res.status(405).json({ error: 'Method not allowed' });
        }

    } catch (error: any) {
        console.error('API Error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}

// GET - Retrieve all files for the authenticated user
async function handleGet(
    req: NextApiRequest,
    res: NextApiResponse,
    userId: string
) {
    try {
        // Query files for the user, excluding deleted files
        const files = await UserFiles.find({
            userId: userId,
            isDeleted: false
        }).sort({ uploadedAt: -1 }); // Most recent first

        return res.status(200).json({
            success: true,
            count: files.length,
            data: files
        });

    } catch (error: any) {
        console.error('Error fetching files:', error);
        return res.status(500).json({
            error: 'Failed to fetch files',
            message: error.message
        });
    }
}

// DELETE - Delete a file for the authenticated user
async function handleDelete(
    req: NextApiRequest,
    res: NextApiResponse,
    userId: string,
    userEmail?: string
) {
    try {
        console.log("[handleDelete] -- Deleting...");

        // Get id from query parameters OR body
        const id = req.query.id || req.body?.id;

        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'File id is required' });
        }

        console.log(id, userId, userEmail);

        // Find and delete the file, ensuring it belongs to the user
        const file = await UserFiles.findOneAndUpdate(
            {
                fileId: id,
                userId: userEmail,
                isDeleted: false
            },
            {
                isDeleted: true,
                deletedAt: new Date()
            },
            { new: true }
        );

        if (!file) {
            return res.status(404).json({
                error: 'File not found or already deleted'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'File deleted successfully',
            data: file
        });

    } catch (error: any) {
        console.error('Error deleting file:', error);
        return res.status(500).json({
            error: 'Failed to delete file',
            message: error.message
        });
    }
}

export default withAuth(handler);