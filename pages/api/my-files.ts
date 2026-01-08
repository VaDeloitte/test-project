// pages/api/my-files.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/utils/middleware/auth'; // Adjust path as needed
import axios from 'axios';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userEmail } = req.query;

  if (!userEmail || typeof userEmail !== 'string') {
    return res.status(400).json({ error: 'User email is required' });
  }

  try {
    let azureFunctionUrl = process.env.AZURE_FUNCTION_URL || 'fa-taxgenie-nonprod-uks-001.azurewebsites.net';
    if (!azureFunctionUrl) {
        throw new Error("AZURE_FUNCTION_URL is not defined");
    }
    
    if (!azureFunctionUrl.startsWith('http://') && !azureFunctionUrl.startsWith('https://')) {
      azureFunctionUrl = `https://${azureFunctionUrl}`;
    }

    const encodedEmail = encodeURIComponent(userEmail);
    // Matching the Python Blueprint: users/{userId}/files
    const targetUrl = `${azureFunctionUrl}/api/users/${encodedEmail}/files?page_size=100&sort_by=uploaded_at&sort_order=desc`;

    const response = await axios.get(targetUrl);

    // Pass the data back to the frontend
    res.status(200).json(response.data);

  } catch (error: any) {
    console.error('Error proxying to Azure Function:', error.message);
    res.status(error.response?.status || 500).json({ 
        error: error.response?.data?.error || 'Failed to fetch files from storage' 
    });
  }
};

export default withAuth(handler);