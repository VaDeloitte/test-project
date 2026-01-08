import { NextApiRequest, NextApiResponse } from 'next';

const AZURE_FUNCTION_URL = process.env.NEXT_PUBLIC_AZURE_FUNCTION_URL || 'http://localhost:7071/api';

/**
 * Proxy endpoint to download citation files from Azure Function backend.
 * Forwards requests to the Azure Function's download_citation_file endpoint.
 * 
 * Query params:
 *   file_name: Name of the file to download
 *   container: Optional container name
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { file_name, container } = req.query;

    if (!file_name) {
      return res.status(400).json({ error: 'Missing file_name parameter' });
    }

    console.log('[download_citation_file]: Proxying request for file:', file_name);

    // Build Azure Function URL with query params
    const params = new URLSearchParams();
    params.append('file_name', file_name as string);
    if (container) {
      params.append('container', container as string);
    }

    const azureFunctionUrl = `${AZURE_FUNCTION_URL}/download_citation_file?${params.toString()}`;
    
    console.log('[download_citation_file]: Forwarding to:', azureFunctionUrl);

    // Fetch file from Azure Function
    const response = await fetch(azureFunctionUrl);

    if (!response.ok) {
      console.error('[download_citation_file]: Azure Function error:', response.status);
      return res.status(response.status).json({ 
        error: 'File not found or access denied',
        details: await response.text()
      });
    }

    // Get content type from Azure Function response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition') || `inline; filename="${file_name}"`;

    // Stream file content to client
    const buffer = await response.arrayBuffer();

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', contentDisposition);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Send file
    res.status(200).send(Buffer.from(buffer));

  } catch (error: any) {
    console.error('[download_citation_file]: Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
