import { NextApiRequest, NextApiResponse } from 'next';
import { BlobServiceClient } from '@azure/storage-blob';
import csv from 'csv-parser';
 
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const AZURE_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=rgtaxgenienonprodfa;AccountKey=9ADNrp73Dl9cELdMolPUFBdUXfTmpe+kjFZ9M6b9znhESLQJ1XR9s80UJE/gXH04tsLFSTPU8bQy+ASt40OGfw==;EndpointSuffix=core.windows.net'!;
  const containerName = "keywords";
  const blobName = "keywords.csv";
 
  const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);
  const downloadBlockBlobResponse = await blobClient.download();
 
  const keywords: string[] = [];
  const stream = downloadBlockBlobResponse.readableStreamBody;
 
  if (!stream) {
    return res.status(500).json({ error: 'No stream' });
  }
 
  stream
    .pipe(csv())
    .on('data', (row:any) => {
      const keyword = String(Object.values(row)[0]); // Assuming one-column CSV
      if (keyword) keywords.push(keyword);
    })
    .on('end', () => {
      res.status(200).json({ keywords });
    })
    .on('error', () => {
      res.status(500).json({ error: 'CSV parsing failed' });
    });
}