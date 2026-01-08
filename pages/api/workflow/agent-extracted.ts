import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../../utils/lib/dbconnect';
import Workflow2 from '../../../utils/lib/types/workflow_v2.model';
import { withAuth } from '../../../utils/middleware/auth';
import { User } from '@/types';

async function handler(
    req: NextApiRequest & { user?: User },
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await connectDB();
        
        // Extract user email from JWT token (decoded by withAuth middleware)
        const userEmail = req.user?.email;
        
        if (!userEmail) {
            return res.status(401).json({ 
                error: 'User email not found in authentication token' 
            });
        }
        
        // 🛡️ PRODUCTION SAFETY: Prevent dev emails from being saved in production
        if (process.env.NODE_ENV === 'production' && userEmail.includes('@dev.local')) {
            return res.status(403).json({ 
                error: 'Development user cannot create agents in production environment' 
            });
        }
        
        console.log('👤 [agent-extracted]: Creating agent for user:', userEmail);

        const { title, description, prompt } = req.body;
        
        if (!title || !description || !prompt || req.body.uploadRequired === undefined) {
            return res.status(400).json({ 
                error: 'Missing required fields: title, description, prompt, uploadRequired' 
            });
        }

        const uploadRequired = req.body.uploadRequired === true || req.body.uploadRequired === 1;
        
        //  Handle triggers array from extraction
        const triggers = Array.isArray(req.body.triggers) ? req.body.triggers : [];
        
        // NEW: Handle citation boolean from extraction
        const citation = typeof req.body.citation === 'boolean' ? req.body.citation : false;
        
        // NEW: Handle files array from extraction
        const files = Array.isArray(req.body.files) ? req.body.files : [];
        
        console.log('💾 API: Saving workflow with files:', {
            hasFiles: files.length > 0,
            filesCount: files.length,
            files: files,
            hasCitation: citation
        });
        
        const workflowData = {
            title: req.body.title,
            description: req.body.description,
            workflowType: req.body.workflowType || 'workflow',
            category: req.body.category || 'General Use Cases',
            subcategory: req.body.subcategory || 'Communication, Correspondence & Writing',
            subsubcategory: req.body.subsubcategory || '',
            hitCount: req.body.hitCount || 0,
            prompt: req.body.prompt,
            uploadRequired: uploadRequired,
            uploadDescription: uploadRequired 
                ? (req.body.uploadDescription || 'File upload description required')
                : (req.body.uploadDescription || ''),
            createdBy: userEmail, // Store the authenticated user's email
            tgPublish: req.body.tgpublish || 'false',
            model: req.body.model || 'gpt-5-mini',
            triggers: triggers, //  Include triggers in workflow
            citation: citation, // NEW: Include citation in workflow
            files: files, // NEW: Include files in workflow
            version: 1,
            rating: {
                avgRating: 0,
                count: 0,
                totalRating: 0
            }
        };

        const newWorkflow = new Workflow2(workflowData);
        
        await newWorkflow.save();

        const savedWorkflow = await Workflow2.findById(newWorkflow._id);
        if (!savedWorkflow) {
            throw new Error('Workflow not found in database after save');
        }
        
        console.log('✅ API: Workflow saved to database:', {
            workflowId: savedWorkflow._id,
            filesInDB: savedWorkflow.files,
            filesCount: savedWorkflow.files?.length || 0
        });

        res.status(201).json({ 
            newWorkflow,
            success: true,
            message: 'Agent workflow created successfully'
        });

    } catch (error: any) {
        if (error.name === 'ValidationError') {
            const errors = [];
            for (const field in error.errors) {
                const errorMsg = error.errors[field].message;
                errors.push(`${field}: ${errorMsg}`);
            }
            return res.status(400).json({ 
                error: 'Validation failed',
                validationErrors: errors,
                receivedData: {
                    title: req.body.title,
                    description: req.body.description?.substring(0, 50) + '...',
                    uploadRequired: req.body.uploadRequired,
                    uploadDescription: req.body.uploadDescription
                }
            });
        }
        
        res.status(500).json({ 
            error: 'Failed to create workflow',
            errorType: error.name,
            message: error.message 
        });
    }
}

export default withAuth(handler);