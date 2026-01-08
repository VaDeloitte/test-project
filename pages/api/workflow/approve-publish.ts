import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../../utils/lib/dbconnect';
import Workflow2 from '../../../utils/lib/types/workflow_v2.model';

/**
 * API endpoint for Logic App to call after approval
 * This endpoint updates the tgPublish field to 'true' for approved agents
 * 
 * Expected request body from Logic App:
 * {
 *   "workflowId": "string"
 * }
 */

async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await connectDB();

        const { workflowId } = req.body;

        if (!workflowId) {
            return res.status(400).json({ 
                error: 'Missing required field: workflowId' 
            });
        }

        console.log('🔔 [approve-publish]: Processing approval callback:', { workflowId });

        // Fetch workflow from database
        const workflow = await Workflow2.findById(workflowId);
        
        if (!workflow) {
            return res.status(404).json({ 
                error: 'Workflow not found' 
            });
        }

        // Update workflow to published
        workflow.tgPublish = 'true';
        
        await workflow.save();

        console.log('✅ [approve-publish]: Workflow published successfully:', workflowId);

        res.status(200).json({ 
            success: true,
            message: 'Workflow published successfully',
            workflowId: workflowId,
            tgPublish: workflow.tgPublish
        });

    } catch (error: any) {
        console.error('❌ [approve-publish]: Error processing approval:', error);
        res.status(500).json({ 
            error: 'Failed to process approval',
            message: error.message 
        });
    }
}

export default handler;
