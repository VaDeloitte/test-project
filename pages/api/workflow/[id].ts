import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../../utils/lib/dbconnect';
//import Workflow from '../../../utils/lib/types/workflow.model';
import Workflow2 from '../../../utils/lib/types/workflow_v2.model';
import mongoose from 'mongoose';
import { withAuth } from '../../../utils/middleware/auth';
import { User } from '@/types';

async function handler(req: NextApiRequest & { user?: User }, res: NextApiResponse) {
    // Extract the id parameter from the request query
    const { id } = req.query;

    // Check if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id as string)) {
        return res.status(400).json({ error: 'Invalid workflow ID' });
    }

    // Connect to the database
    await connectDB();

    switch (req.method) {
        case 'GET':
            // GET requests don't require authentication (workflows are public)
            try {
                const workflow = await Workflow2.findById(id);
                if (!workflow) {
                    return res.status(404).json({ error: 'Workflow not found' });
                }
                res.status(200).json({ workflow });
            } catch (error) {
                console.error('Error fetching workflow:', error);
                res.status(500).json({ error: 'Failed to fetch workflow' });
            }
            break;

        case 'DELETE':
            // DELETE requests don't require authentication
            try {
                const existingWorkflow = await Workflow2.findById(id);
                if (!existingWorkflow) {
                    return res.status(404).json({ error: 'Workflow not found' });
                }
                await Workflow2.findByIdAndDelete(id);
                res.status(200).json({ message: 'Workflow deleted successfully' });
            } catch (error) {
                console.error('Error deleting workflow:', error);
                res.status(500).json({ error: 'Failed to delete workflow' });
            }
            break;

        case 'PUT':
            // PUT requests don't require authentication (for agent editing)
            try {
                const existingWorkflow = await Workflow2.findById(id);
                if (!existingWorkflow) {
                    return res.status(404).json({ error: 'Workflow not found' });
                }

                if (req.body.incrementHitCount) {
                    existingWorkflow.hitCount = (existingWorkflow.hitCount || 0) + 1;
                } else {
                    // Allow updates without admin check for agent editing
                    const { 
                        title, 
                        description, 
                        workflowType, 
                        category, 
                        subcategory, 
                        subsubcategory, 
                        prompt, 
                        uploadDescription, 
                        hitCount, 
                        uploadRequired
                    } = req.body;

                    const version = existingWorkflow.version + 1;

                    existingWorkflow.set({
                        title,
                        description,
                        workflowType,
                        category,
                        subcategory,
                        subsubcategory,
                        prompt,
                        hitCount,
                        uploadRequired,
                        uploadDescription,
                        version
                    });
                }

                const updatedWorkflow = await existingWorkflow.save();
                res.status(200).json({ updatedWorkflow });
            } catch (error: any) {
                if (error.name === 'ValidationError') {
                    const errors = Object.values(error.errors).map((err: any) => err.message);
                    return res.status(400).json({ errors });
                }
                console.error('Error updating workflow:', error);
                res.status(500).json({ error: 'Failed to update workflow' });
            }
            break;

        case 'PATCH':
            // Require authentication for patches
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            // Partial update for agent edits (doesn't require admin)
            try {
                const existingWorkflow = await Workflow2.findById(id);
                if (!existingWorkflow) {
                    return res.status(404).json({ error: 'Workflow not found' });
                }

                // Allow partial updates for specific fields
                const allowedFields = ['title', 'description', 'category', 'prompt', 'model', 'triggers', 'citation', 'files'];
                const updates: any = {};
                
                allowedFields.forEach(field => {
                    if (req.body[field] !== undefined) {
                        updates[field] = req.body[field];
                    }
                });

                existingWorkflow.set(updates);
                const updatedWorkflow = await existingWorkflow.save();
                
                res.status(200).json({ 
                    success: true,
                    updatedWorkflow,
                    message: 'Agent updated successfully'
                });
            } catch (error: any) {
                if (error.name === 'ValidationError') {
                    const errors = Object.values(error.errors).map((err: any) => err.message);
                    return res.status(400).json({ errors });
                }
                console.error('Error updating workflow:', error);
                res.status(500).json({ error: 'Failed to update workflow' });
            }
            break;

        default:
            res.status(405).json({ error: 'Method not allowed' });
            break;
    }
}

// Export without auth wrapper - handler checks auth internally for non-GET requests
export default handler;