import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Backend API endpoint to transcribe audio from Azure Blob Storage.
 * This is needed because Edge runtime can't call Azure Whisper API directly.
 * 
 * Request: POST with { blobUrl: string }
 * Response: { transcription: string }
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

    console.log('[transcribe-audio]: Processing audio URL:', blobUrl);

    // Extract filename from blob URL
    const filename = blobUrl.split('/').pop()?.split('?')[0] || 'audio.mp3';

    // Call Azure Function backend for transcription
    // The Python backend already has the transcription logic in suggest_agents_audio
    let azureFunctionUrl = process.env.AZURE_FUNCTION_URL || 'http://localhost:7071';
    
    // Ensure URL has protocol
    if (!azureFunctionUrl.startsWith('http://') && !azureFunctionUrl.startsWith('https://')) {
      azureFunctionUrl = `https://${azureFunctionUrl}`;
    }
    
    const endpoint = `${azureFunctionUrl}/api/transcribe_audio`;

    console.log('[transcribe-audio]: Calling Azure Function at', endpoint);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        blob_url: blobUrl 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[transcribe-audio]: Azure Function error:', errorData);
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    const transcription = data.transcription || data.text || '';

    console.log('[transcribe-audio]: ✅ Transcription received');
    console.log('[transcribe-audio]: Length:', transcription.length, 'chars');

    return res.status(200).json({ transcription });

  } catch (error: any) {
    console.error('[transcribe-audio]: Error:', error);
    return res.status(500).json({ 
      error: 'Failed to transcribe audio',
      details: error.message 
    });
  }
}