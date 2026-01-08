// pages/api/file/download.ts
import { getAzureContainerClient } from '@/utils/helper/fileUpload';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { fileName } = req.query;
        
        if (!fileName || typeof fileName !== 'string') {
            return res.status(400).json({ error: 'File name required' });
        }

        // Get container client
        const containerClient = getAzureContainerClient('temp-data-sources');
        const blobClient = containerClient.getBlobClient(fileName);

        // Check if blob exists
        const exists = await blobClient.exists();
        if (!exists) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Download blob
        const downloadResponse = await blobClient.download();
        
        if (!downloadResponse.readableStreamBody) {
            return res.status(500).json({ error: 'Unable to download file' });
        }

        // Get content type and properties
        const contentType = downloadResponse.contentType || 'application/octet-stream';
        const contentLength = downloadResponse.contentLength || 0;

        // Set headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', contentLength.toString());

        // Pipe the stream to response
        const stream = downloadResponse.readableStreamBody;
        
        if (stream) {
            // @ts-ignore - Node.js stream compatibility
            stream.pipe(res);
        } else {
            return res.status(500).json({ error: 'Unable to stream file' });
        }
    } catch (error) {
        console.error('Download error:', error);
        return res.status(500).json({ error: 'Failed to download file' });
    }
}