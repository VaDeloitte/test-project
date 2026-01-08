import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../../utils/lib/dbconnect';
//import Workflow from '../../../utils/lib/types/workflow.model';
import Workflow2 from '../../../utils/lib/types/workflow_v2.model';
import mongoose from 'mongoose';

/**
 * API endpoint to update workflow settings (e.g., citation, grounding toggles)
 * 
 * Method: PATCH
 * Body: {
 *   workflowId: string,
 *   updates: {
 *     citation?: boolean,
 *     grounding?: boolean,
 *     // ... other fields
 *   }
 * }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { workflowId, updates } = req.body;

    // Validation
    if (!workflowId) {
      return res.status(400).json({ error: 'Workflow ID is required' });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Updates object is required' });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(workflowId)) {
      return res.status(400).json({ error: 'Invalid workflow ID format' });
    }

    // Connect to database
    await connectDB();

    // Update workflow with new settings
    const updatedWorkflow = await Workflow2.findByIdAndUpdate(
      workflowId,
      { 
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      },
      { new: true } // Return the updated document
    );

    if (!updatedWorkflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    console.log(`[API /workflows/update]: Successfully updated workflow ${workflowId}:`, updates);

    return res.status(200).json({ 
      success: true,
      message: 'Workflow updated successfully',
      workflow: updatedWorkflow
    });

  } catch (error) {
    console.error('[API /workflows/update]: Error:', error);
    return res.status(500).json({ 
      error: 'Failed to update workflow',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
