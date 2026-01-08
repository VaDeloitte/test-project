import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../../utils/lib/dbconnect';
//import Workflow from '../../../utils/lib/types/workflow.model';
import Workflow2 from '../../../utils/lib/types/workflow_v2.model';
import { withAuth } from '../../../utils/middleware/auth';
import { User } from '@/types';

async function handler(
    req: NextApiRequest & { user?: User },
    res: NextApiResponse
) {
    switch (req.method) {
        case 'GET':
            await connectDB();

            const { query } = req;
            const searchFilter: { $or?: Array<{ title: RegExp } | { description: RegExp } | { subsubcategory: RegExp }>, workflowType?: string } | any = {};

            if (query.search) {
                const searchRegex = new RegExp(query.search as string, 'i'); // Case-insensitive search
                searchFilter.$or = [
                    { title: searchRegex },
                    { description: searchRegex },
                    { subsubcategory: searchRegex }
                ];
            }
            

            if (query.filterByUser === 'true') {
                if (!req.user?.email) {
                    // Return empty array instead of all workflows
                    return res.status(200).json({ workflows: [] });
                }
                
                // Filter by user email
                searchFilter.createdBy = req.user.email;
                
                // 🛡️ PRODUCTION SAFETY: Never allow dev emails in production queries
                if (process.env.NODE_ENV === 'production' && req.user.email.includes('@dev.local')) {
                    return res.status(200).json({ workflows: [] });
                }
            }

            try {
                if (query.n) {
                    // Add the filters for subcategory and category
                    searchFilter['subcategory'] = { $ne: "" };
                    
                    // Use category from query parameter if provided, otherwise default to "General Use Cases"
                    if (query.category) {
                        searchFilter['category'] = query.category;
                    }

                    if (query.subcategory) {
                        searchFilter['subcategory'] = query.subcategory;
                    }
                    
                    // Fetch top N workflows by hitCount
                    searchFilter.workflowType = { $in: ['workflow', null] };
                    const workflows = await Workflow2.find(searchFilter)
                        .select('_id title description category subcategory subsubcategory hitCount uploadRequired workflowType uploadDescription createdBy tgPublish model version rating')
                        .sort({ hitCount: -1 })
                        .limit(query.n)
                        .lean(); // Use lean() for better performance

                    //  Clean the response to handle missing fields properly
                    const cleanedWorkflows = workflows.map((workflow: any) => {
                        const cleaned = { ...workflow };
                        
                        // Only include tgpublish if it exists in the database
                        if (!workflow.hasOwnProperty('tgPublish') || workflow.tgpublish === null || workflow.tgpublish === undefined) {
                            delete cleaned.tgpublish;
                        }
                        
                        // Only include createdby if it exists in the database  
                        if (!workflow.hasOwnProperty('createdBy') || workflow.createdby === null || workflow.createdby === undefined) {
                            delete cleaned.createdby;
                        }
                        
                        // Only include model if it exists in the database
                        if (!workflow.hasOwnProperty('model') || workflow.model === null || workflow.model === undefined) {
                            delete cleaned.model;
                        }
                        
                        return cleaned;
                    });

                    res.status(200).json({ workflows: cleanedWorkflows });
                } else {
                    // Fetch all workflows
                    const workflows = await Workflow2.find(searchFilter)
                        .select('_id title description category subcategory subsubcategory hitCount uploadRequired workflowType uploadDescription createdBy tgPublish model version rating')
                        .sort({ createdAt: -1 })
                        .lean(); // Use lean() for better performance

                    //  Clean the response to handle missing fields properly
                    const cleanedWorkflows = workflows.map((workflow: any) => {
                        const cleaned = { ...workflow };
                        
                        // Only include tgpublish if it exists in the database
                        if (!workflow.hasOwnProperty('tgPublish') || workflow.tgpublish === null || workflow.tgpublish === undefined) {
                            delete cleaned.tgpublish;
                        }
                        
                        // Only include createdby if it exists in the database  
                        if (!workflow.hasOwnProperty('createdBy') || workflow.createdby === null || workflow.createdby === undefined) {
                            delete cleaned.createdby;
                        }
                        
                        // Only include model if it exists in the database
                        if (!workflow.hasOwnProperty('model') || workflow.model === null || workflow.model === undefined) {
                            delete cleaned.model;
                        }
                        
                        return cleaned;
                    });

                    res.status(200).json({ workflows: cleanedWorkflows });
                }
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch workflows' });
            }
            break;

        case 'POST':
            // POST requires authentication (will fail without withAuth, but that's intentional)
            if (!req.user) {
                return res.status(401).json({ error: "Authentication required" });
            }
            
            if (!req.user?.isAdmin) {
                return res.status(403).json({ error: "Not authorized" });
            }

            // Connect to the database
            await connectDB();

            try {
                // Create a new workflow instance based on the request body
                const newWorkflow = new Workflow2(req.body);

                // Save the new workflow to the database
                await newWorkflow.save();

                // Return the newly created workflow
                res.status(201).json({ newWorkflow });
            } catch (error: any) {
                // Check if the error is a Mongoose validation error
                if (error.name === 'ValidationError') {
                    // Extract validation errors from the Mongoose validation error
                    const errors = [];
                    for (const field in error.errors) {
                        errors.push(error.errors[field].message);
                    }
                    // Return validation errors
                    return res.status(400).json({ errors });
                }
                // Handle other errors
                console.error('Error creating workflow:', error);
                res.status(500).json({ error: 'Failed to create workflow' });
            }
            break;
        default:
            res.status(405).json({ error: 'Method not allowed' });
            break;
    }
}

// Export with auth wrapper - required for user filtering and admin operations
export default withAuth(handler);