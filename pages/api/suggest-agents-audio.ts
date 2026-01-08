import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../utils/middleware/auth';

export const config = {
  api: {
    bodyParser: true,
  },
};

interface User {
  isAdmin: boolean;
  loggedIn: boolean;
  email: string;
  username: string;
  accountId: string;
  exp: number;
}

/**
 * API endpoint to suggest agents based on audio file content.
 * 
 * Flow:
 * 1. Receives blob_url from frontend (audio already uploaded to Azure Blob)
 * 2. Proxies request to Azure Function (suggest_agents_audio)
 * 3. Azure Function transcribes audio and performs semantic search
 * 4. Returns top 5 agent suggestions with similarity scores
 * 
 * @param req - Next.js API request containing { blob_url, user_id, top_k }
 * @param res - Next.js API response with agent suggestions
 */
const handler = async (req: NextApiRequest & { user?: User }, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { blob_url, top_k = 5 } = req.body;

    // Validate required fields
    if (!blob_url) {
      return res.status(400).json({ error: 'Missing required field: blob_url' });
    }

    if (!req.user?.accountId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user_id = req.user.accountId;

    console.log(`[suggest-agents-audio]: Processing audio suggestion for user ${user_id}`);
    console.log(`[suggest-agents-audio]: Blob URL: ${blob_url}`);

    // Proxy to Azure Function
    // In production: set AZURE_FUNCTION_URL environment variable
    let azureFunctionUrl = process.env.AZURE_FUNCTION_URL || "http://localhost:7071";
    
    if (!azureFunctionUrl) {
      console.error('[suggest-agents-audio]: AZURE_FUNCTION_URL not configured');
      return res.status(500).json({ 
        error: 'Azure Function not configured',
        details: 'AZURE_FUNCTION_URL environment variable is required'
      });
    }
    
    // Ensure URL has protocol (add https:// if missing)
    if (!azureFunctionUrl.startsWith('http://') && !azureFunctionUrl.startsWith('https://')) {
      azureFunctionUrl = `https://${azureFunctionUrl}`;
      console.log(`[suggest-agents-audio]: Added https:// protocol to URL: ${azureFunctionUrl}`);
    }
    
    const endpoint = `${azureFunctionUrl}/api/suggest_agents_audio`;

    const requestBody = {
      blob_url,
      user_id,
      top_k,
    };

    console.log(`[suggest-agents-audio]: Calling Azure Function at ${endpoint}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`[suggest-agents-audio]: Azure Function error:`, errorData);
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();

    console.log(`[suggest-agents-audio]: Successfully retrieved ${data.agents?.length || 0} agent suggestions`);
    console.log(`[suggest-agents-audio]: Transcription from cache: ${data.transcription_from_cache}`);

    return res.status(200).json(data);

  } catch (error) {
    console.error('[suggest-agents-audio]: Error processing request:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return res.status(500).json({ 
      error: 'Failed to process audio suggestion request',
      details: errorMessage 
    });
  }
};

export default withAuth(handler);
