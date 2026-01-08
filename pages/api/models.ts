// Import constants for the OpenAI API configuration.
import {
  OPENAI_API_HOST,
  OPENAI_API_TYPE,
  OPENAI_API_VERSION,
  OPENAI_ORGANIZATION,
} from '@/utils/app/const';

// Import types related to OpenAI models.
import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';
import { getCSRFToken } from '@/utils/app/csrf';

// Configuration for running this module, specifying the runtime environment.
export const config = {
  runtime: 'edge',
};

// The main handler function that will process incoming HTTP requests.
const handler = async (req: Request): Promise<Response> => {
  try {
    // Use server-side environment variable for API key (don't accept from client for security)
    const apiKey = process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('No OpenAI API key available in environment');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Determine the appropriate URL for fetching models from the OpenAI API.
    let url = `${OPENAI_API_HOST}/v1/models`;
    if (OPENAI_API_TYPE === 'azure') {
      url = `${OPENAI_API_HOST}/openai/deployments?api-version=${OPENAI_API_VERSION}`;
    }

    // Construct headers for the API request.
    const headers = {
      'Content-Type': 'application/json',
      ...(OPENAI_API_TYPE === 'openai' && {
        Authorization: `Bearer ${apiKey}`,
      }),
      ...(OPENAI_API_TYPE === 'azure' && {
        'api-key': apiKey,
      }),
      ...(OPENAI_API_TYPE === 'openai' &&
        OPENAI_ORGANIZATION && {
          'OpenAI-Organization': OPENAI_ORGANIZATION,
        }),
    };

    // Perform the API request using the determined URL and headers.
    const response = await fetch(url, {
      headers: headers,
      credentials: 'include' as RequestCredentials,
    });

    // Handle authentication errors or other non-success responses.
    if (response.status === 401) {
      return new Response(response.body, {
        status: 500,
        headers: response.headers,
      });
    } else if (response.status !== 200) {
      console.error(
        `OpenAI API returned an error ${
          response.status
        }: ${await response.text()}`,
      );
      throw new Error('OpenAI API returned an error');
    }

    // Parse the JSON response and convert it to a list of OpenAIModel instances.
    const json = await response.json();

    const models: OpenAIModel[] = json.data
      .map((model: any) => {
        const model_name = model.id;
        for (const [_key, value] of Object.entries(OpenAIModelID)) {
          if (value === model_name) {
            return {
              id: model.id,
              name: OpenAIModels[value].name,
              label: OpenAIModels[value]?.label,
            };
          }
        }
      })
      .filter(Boolean);
    
    // Return the processed list of models as a JSON response.
    return new Response(JSON.stringify(models), { status: 200 });
  } catch (error) {
    console.error('Error in models handler:', error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;
