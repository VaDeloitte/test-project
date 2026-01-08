//pages/api/workflow/[id]/rate.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../../../utils/lib/dbconnect';
import WorkflowRatings from '../../../../utils/lib/types/workflowRatings.model';
import WorkflowV2 from '../../../../utils/lib/types/workflow_v2.model';
import mongoose from 'mongoose';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { id } = req.query;
        const { rating, version, userId } = req.body;
        
        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'Invalid workflow ID' });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid workflow ID format' });
        }

        if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be a number between 1 and 5' });
        }

        if (!version || typeof version !== 'number') {
            return res.status(400).json({ error: 'Version is required' });
        }

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        // Connect to database
        await connectDB();

        // Check if workflow exists
        const workflow = await WorkflowV2.findById(id);
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        // Create new rating document
        const newRating = await WorkflowRatings.create({
            workflowId: id,
            version,
            userId,
            rating,
            ratedAt: new Date()
        });

        // Calculate new rating statistics for the workflow
        const currentRating = workflow.rating || { avgRating: 0, count: 0, totalRating: 0 };
        const newCount = currentRating.count + 1;
        const newTotalRating = currentRating.totalRating + rating;
        const newAvgRating = newTotalRating / newCount;

        // Update workflow with new rating statistics
        workflow.rating = {
            avgRating: Math.round(newAvgRating * 100) / 100, // Round to 2 decimal places
            count: newCount,
            totalRating: newTotalRating
        };

        await workflow.save();

        return res.status(201).json({
            success: true,
            data: {
                rating: newRating,
                workflowRating: workflow.rating
            }
        });

    } catch (error) {
        console.error('Error saving workflow rating:', error);
        return res.status(500).json({ 
            error: 'Failed to save rating',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}