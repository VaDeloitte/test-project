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
 * API endpoint to suggest agents based on file content.
 * 
 * Flow:
 * 1. Receives blob_url and file_type from frontend (file already uploaded to Azure Blob)
 * 2. Proxies request to Azure Function (suggest_agents_file)
 * 3. Azure Function extracts text and performs semantic search
 * 4. Returns top 5 agent suggestions with similarity scores
 * 
 * Supported file types: PDF, DOCX, XLSX, CSV, TXT, PPTX
 * 
 * @param req - Next.js API request containing { blob_url, file_type, user_id, top_k }
 * @param res - Next.js API response with agent suggestions
 */
const handler = async (req: NextApiRequest & { user?: User }, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { blob_url, file_type, top_k = 5 } = req.body;

    // Validate required fields
    if (!blob_url) {
      return res.status(400).json({ error: 'Missing required field: blob_url' });
    }

    if (!file_type) {
      return res.status(400).json({ error: 'Missing required field: file_type' });
    }

    // Validate file type
    const supportedTypes = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'txt', 'pptx', 'ppt', 'jpg', 'jpeg', 'png', 'svg'];
    if (!supportedTypes.includes(file_type.toLowerCase())) {
      return res.status(400).json({ 
        error: `Unsupported file type: ${file_type}. Supported types: ${supportedTypes.join(', ')}` 
      });
    }

    if (!req.user?.accountId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user_id = req.user.accountId;

    console.log(`[suggest-agents-file]: Processing ${file_type.toUpperCase()} file suggestion for user ${user_id}`);
    console.log(`[suggest-agents-file]: Blob URL: ${blob_url}`);

    // Proxy to Azure Function
    // Uses same base URL as RAG endpoint (http://localhost:7071)
    // In production: set AZURE_FUNCTION_URL environment variable
    let azureFunctionUrl = process.env.AZURE_FUNCTION_URL || 'https://fa-taxgenie-nonprod-uks-001.azurewebsites.net';
    
    // Ensure URL has protocol (add https:// if missing)
    if (!azureFunctionUrl.startsWith('http://') && !azureFunctionUrl.startsWith('https://')) {
      azureFunctionUrl = `https://${azureFunctionUrl}`;
      console.log(`[suggest-agents-file]: Added https:// protocol to URL: ${azureFunctionUrl}`);
    }
    
    const endpoint = `${azureFunctionUrl}/api/suggest_agents_file`;

    const requestBody = {
      blob_url,
      file_type,
      user_id,
      top_k,
    };

    console.log(`[suggest-agents-file]: Calling Azure Function at ${endpoint}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`[suggest-agents-file]: Azure Function error:`, errorData);
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();

    console.log(`[suggest-agents-file]: Successfully retrieved ${data.agents?.length || 0} agent suggestions`);
    console.log(`[suggest-agents-file]: Text extraction from cache: ${data.text_from_cache}`);
    console.log(`[suggest-agents-file]: Word count: ${data.word_count}`);

    return res.status(200).json(data);

  } catch (error) {
    console.error('[suggest-agents-file]: Error processing request:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return res.status(500).json({ 
      error: 'Failed to process file suggestion request',
      details: errorMessage 
    });
  }
};

export default withAuth(handler);
