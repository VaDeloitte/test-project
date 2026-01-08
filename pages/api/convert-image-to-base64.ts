
import { NextApiRequest, NextApiResponse } from 'next';
import { BlobServiceClient } from '@azure/storage-blob';

/**
 * Backend API endpoint to download images from Azure Blob Storage and convert to base64.
 * This is needed because Edge runtime can't authenticate to private blob storage.
 * 
 * Request: POST with { blobUrl: string }
 * Response: { dataUrl: string } (base64 data URL)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { blobUrl } = req.body;

    if (!blobUrl || typeof blobUrl !== 'string') {
      return res.status(400).json({ error: 'Invalid blobUrl parameter' });
    }

    console.log('[convert-image-to-base64]: Processing blob URL:', blobUrl);

    // Parse blob URL to extract container and blob name
    // URL format: https://rgtaxgenienonprodfa.blob.core.windows.net/temp-data-sources/filename.png
    const url = new URL(blobUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    if (pathParts.length < 2) {
      return res.status(400).json({ error: 'Invalid blob URL format' });
    }

    const containerName = pathParts[0];
    const blobName = pathParts.slice(1).join('/'); // Handle nested paths

    console.log('[convert-image-to-base64]: Container:', containerName, 'Blob:', blobName);

    // Initialize Azure Blob Storage client with connection string
    const connectionString = 'DefaultEndpointsProtocol=https;AccountName=rgtaxgenienonprodfa;AccountKey=9ADNrp73Dl9cELdMolPUFBdUXfTmpe+kjFZ9M6b9znhESLQJ1XR9s80UJE/gXH04tsLFSTPU8bQy+ASt40OGfw==;EndpointSuffix=core.windows.net';
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);

    // Check if blob exists (including soft-deleted blobs)
    const exists = await blobClient.exists();
    console.log('[convert-image-to-base64]: Blob exists:', exists);
    
    if (!exists) {
      console.error('[convert-image-to-base64]: Blob not found or was deleted');
      return res.status(404).json({ error: 'Image file not found or was deleted' });
    }

    // Download blob content (soft-deleted blobs may need special handling)
    const downloadResponse = await blobClient.download();
    
    if (!downloadResponse.readableStreamBody) {
      return res.status(500).json({ error: 'Failed to read blob content' });
    }

    // Convert stream to buffer
    const chunks: any[] = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    console.log('[convert-image-to-base64]: Downloaded', buffer.length, 'bytes');

    // Detect MIME type from content type or file extension
    let mimeType = downloadResponse.contentType || 'image/jpeg';
    
    // If content type is generic, detect from file extension
    if (mimeType === 'application/octet-stream' || !mimeType.startsWith('image/')) {
      const ext = blobName.split('.').pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'bmp': 'image/bmp'
      };
      mimeType = ext ? (mimeTypes[ext] || 'image/jpeg') : 'image/jpeg';
    }

    // Convert to base64 data URL
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    console.log('[convert-image-to-base64]: ✅ Converted to base64 (size:', dataUrl.length, 'chars)');

    return res.status(200).json({ dataUrl });

  } catch (error: any) {
    console.error('[convert-image-to-base64]: Error:', error);
    return res.status(500).json({ 
      error: 'Failed to convert image to base64',
      details: error.message 
    });
  }
}
