import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../../utils/lib/dbconnect';
import Workflow2 from '../../../utils/lib/types/workflow_v2.model';
import { withAuth } from '../../../utils/middleware/auth';
import { User } from '@/types';
import { getAzureContainerClient } from '@/utils/helper/fileUpload';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

// Helper function to read and parse CSV
function parseServiceLineMapping(csvContent: string): Map<string, string> {
    const mapping = new Map<string, string>();
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Parse CSV (handle quoted values)
        const match = line.match(/^"?([^"]*)"?,\s*"?([^"]*)"?$/);
        if (match) {
            const serviceLine = match[1].trim();
            const leaderEmail = match[2].trim();
            mapping.set(serviceLine, leaderEmail);
        }
    }
    
    return mapping;
}

// Helper function to get leader email for user's service line
function getLeaderEmail(userServiceLine: string): string | null {
    try {
        // Read CSV file from the root of the WebApp directory
        const csvPath = path.join(process.cwd(), 'serviceline-mapping.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        
        const mapping = parseServiceLineMapping(csvContent);
        
        // Try exact match first
        if (mapping.has(userServiceLine)) {
            return mapping.get(userServiceLine) || null;
        }
        
        // Try partial match (case-insensitive)
        const normalizedUserSL = userServiceLine.toLowerCase();
        for (const [serviceLine, email] of mapping.entries()) {
            if (serviceLine.toLowerCase().includes(normalizedUserSL) || 
                normalizedUserSL.includes(serviceLine.toLowerCase())) {
                return email;
            }
        }
        
        return null;
    } catch (error) {
        console.error('❌ Error reading serviceline-mapping.csv:', error);
        return null;
    }
}

async function handler(
    req: NextApiRequest & { user?: User },
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await connectDB();
        
        const userEmail = req.user?.email;
        const userServiceLine = req.user?.serviceLine;
        const userDepartment = req.user?.department;
        
        if (!userEmail) {
            return res.status(401).json({ 
                error: 'User email not found in authentication token' 
            });
        }
        
        console.log('📤 [submit-for-publishing]: Processing submission for user:', userEmail);

        const { workflowId } = req.body;
        
        if (!workflowId) {
            return res.status(400).json({ 
                error: 'Missing required field: workflowId' 
            });
        }

        // Fetch workflow from database
        const workflow = await Workflow2.findById(workflowId);
        
        if (!workflow) {
            return res.status(404).json({ 
                error: 'Workflow not found' 
            });
        }

        // Verify user owns this workflow
        if (workflow.createdBy !== userEmail) {
            return res.status(403).json({ 
                error: 'You do not have permission to publish this workflow' 
            });
        }

        // Get leader email from service line mapping
        const serviceLineToMatch = userDepartment || userServiceLine || 'Unknown';
        const leaderEmail = getLeaderEmail(serviceLineToMatch);
        console.log('🔍 [submit-for-publishing]: Matching leader for service line:', serviceLineToMatch);
        console.log('🔍 [submit-for-publishing]: Found leader email:', leaderEmail);
        if (!leaderEmail) {
            return res.status(400).json({ 
                error: `No approval leader found for service line: ${serviceLineToMatch}. Please contact your administrator.`,
                serviceLine: serviceLineToMatch
            });
        }

        // Trim to remove any whitespace/newlines
        const cleanLeaderEmail = leaderEmail.trim();

        console.log('📧 [submit-for-publishing]: Leader email found:', cleanLeaderEmail, 'for service line:', serviceLineToMatch);

        // Create temporary files
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const agentInfoFileName = `agent-info-${workflowId}.txt`;
        const approvalEmailFileName = `agent-info-${workflowId}-serviceline-manager.txt`;
        
        const agentInfoPath = path.join(tempDir, agentInfoFileName);
        const approvalEmailPath = path.join(tempDir, approvalEmailFileName);

        // Prepare agent info JSON (complete workflow data)
        const agentInfoJSON = JSON.stringify({
            workflowId: workflow._id,
            title: workflow.title,
            description: workflow.description,
            workflowType: workflow.workflowType,
            category: workflow.category,
            subcategory: workflow.subcategory,
            subsubcategory: workflow.subsubcategory,
            prompt: workflow.prompt,
            uploadRequired: workflow.uploadRequired,
            uploadDescription: workflow.uploadDescription,
            model: workflow.model,
            triggers: workflow.triggers || [],
            citation: workflow.citation || false,
            files: workflow.files || [],
            createdBy: workflow.createdBy,
            createdAt: workflow.createdAt,
            submittedBy: userEmail,
            submittedAt: new Date().toISOString()
        }, null, 2);

        // Write files
        await writeFileAsync(agentInfoPath, agentInfoJSON, 'utf-8');
        await writeFileAsync(approvalEmailPath, cleanLeaderEmail, 'utf-8');

        console.log('📝 [submit-for-publishing]: Temporary files created');

        // Upload to Azure Blob Storage - review-agentfiles container
        const containerClient = getAzureContainerClient('review-agentfiles');

        try {
            // Upload agent info file
            const agentInfoBlobClient = containerClient.getBlockBlobClient(agentInfoFileName);
            await agentInfoBlobClient.uploadFile(agentInfoPath, {
                metadata: {
                    workflowId: workflowId,
                    submittedBy: userEmail,
                    serviceLine: serviceLineToMatch,
                    submittedAt: new Date().toISOString()
                }
            });

            // Upload approval email file
            const approvalEmailBlobClient = containerClient.getBlockBlobClient(approvalEmailFileName);
            await approvalEmailBlobClient.uploadFile(approvalEmailPath, {
                metadata: {
                    workflowId: workflowId,
                    submittedBy: userEmail,
                    leaderEmail: leaderEmail,
                    serviceLine: serviceLineToMatch
                }
            });

            console.log('☁️ [submit-for-publishing]: Files uploaded to Azure Blob Storage');

            // Update workflow status to pending approval (optional tracking field)
            workflow.publishStatus = 'pending';
            workflow.submittedForPublishingAt = new Date();
            await workflow.save();

            console.log('✅ [submit-for-publishing]: Workflow updated with pending status');

        } catch (uploadError) {
            console.error('❌ Error uploading files to Azure:', uploadError);
            throw new Error('Failed to upload files to Azure Blob Storage');
        } finally {
            // Clean up temporary files
            try {
                await unlinkAsync(agentInfoPath);
                await unlinkAsync(approvalEmailPath);
                console.log('🧹 [submit-for-publishing]: Temporary files cleaned up');
            } catch (cleanupError) {
                console.error('⚠️ Warning: Failed to clean up temporary files:', cleanupError);
            }
        }

        res.status(200).json({ 
            success: true,
            message: 'Agent submitted for publishing approval',
            workflowId: workflowId,
            leaderEmail: cleanLeaderEmail,
            filesUploaded: [agentInfoFileName, approvalEmailFileName]
        });

    } catch (error: any) {
        console.error('❌ [submit-for-publishing]: Error:', error);
        res.status(500).json({ 
            error: 'Failed to submit agent for publishing',
            message: error.message 
        });
    }
}

export default withAuth(handler);
