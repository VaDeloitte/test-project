import { AZURE_UPDATE_PROMOPTS } from '@/utils/app/const';
import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../utils/middleware/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    switch (req.method) {
        case 'POST':
            try{
              const body = req.body;
                const myHeaders = new Headers({
                    "Content-Type": "application/json"
                  });
                
                  const requestOptions:any = {
                    method: 'POST',
                    headers: myHeaders,
                    body: JSON.stringify(body),
                    redirect: 'follow'
                  };
                console.log(requestOptions,'requestOptions+++++++++======')
                const response = await fetch(AZURE_UPDATE_PROMOPTS, requestOptions);
               
                if(!response.ok){
                  throw new Error("Error when calling azure update prompt API.")
                }

                // ✅ Parse response to extract citations if present
                const responseText = await response.text();
                
                try {
                  // Try to parse as JSON to check for citations
                  const responseData = JSON.parse(responseText);
                  
                  if (responseData.citations && Array.isArray(responseData.citations)) {
                    // Return JSON with citations
                    res.status(200).json(responseData);
                  } else {
                    // Return as plain text (legacy format)
                    res.status(200).send(responseText);
                  }
                } catch (parseError) {
                  // Not JSON, return as plain text (legacy format)
                  res.status(200).send(responseText);
                }
            } catch(error) {
              console.error('[/api/prompt]: Error:', error);
              const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
              res.status(500).json({ 
                error: 'Failed to process prompt request', 
                details: errorMessage,
                timestamp: new Date().toISOString()
              });
            }
          break;
        default:
            res.status(405).json({ error: 'Method not allowed' });
            break;
    }
}

// Export without authentication middleware - auth handled at app level via MSAL
export default handler;
