import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../../../utils/lib/dbconnect';
//import Workflow from '../../../utils/lib/types/workflow.model';
import Workflow2 from '@/utils/lib/types/workflow_v2.model';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'PATCH') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { id } = req.query;
        
        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'Invalid workflow ID' });
        }

        console.log('📤 Publishing workflow:', id);
        
        //  Connect to database
        await connectDB();

        //  Find and update the workflow
        const updatedWorkflow = await Workflow2.findByIdAndUpdate(
            id,
            { 
                tgPublish: 'true',
                publishedAt: new Date() // Optional: track when it was published
            },
            { 
                new: true, // Return updated document
                runValidators: true // Run model validators
            }
        );

        if (!updatedWorkflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        console.log(' Workflow published successfully:', {
            id: updatedWorkflow._id,
            title: updatedWorkflow.title,
            tgPublish: updatedWorkflow.tgPublish
        });

        res.status(200).json({ 
            success: true,
            message: 'Workflow published successfully',
            workflow: {
                _id: updatedWorkflow._id,
                title: updatedWorkflow.title,
                tgPublish: updatedWorkflow.tgPublish,
                publishedAt: updatedWorkflow.publishedAt
            }
        });

    } catch (error: any) {
        console.error(' Error publishing workflow:', error);
        
        res.status(500).json({ 
            error: 'Failed to publish workflow',
            message: error.message 
        });
    }
}
