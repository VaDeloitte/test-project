// Import necessary types for handling chat messages and OpenAI models.
import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

// Constants for configuring the OpenAI API endpoint and other settings.
import {
  OPENAI_API_HOST,
  OPENAI_API_TYPE,
  OPENAI_API_VERSION,
  OPENAI_ORGANIZATION,
  OPENAI_API_KEY,
  CLAUDE_SONNET_HOST,
  CLAUDE_SONNET_API_KEY,
  CLAUDE_SONNET_API_VERSION,
  ALJAIS_API_HOST,
  ALJAIS_API_KEY,
  ALJAIS_API_VERSION,
} from '../app/const';

// Import utilities for parsing server-sent events.
import {
  ParsedEvent,
  ReconnectInterval,
  createParser,
} from 'eventsource-parser';
import { getCSRFToken } from '../app/csrf';

// Custom error class for handling OpenAI API errors.
export class OpenAIError extends Error {
  type: string;
  param: string;
  code: string;

  constructor(message: string, type: string, param: string, code: string) {
    super(message);
    this.name = 'OpenAIError';
    this.type = type;
    this.param = param;
    this.code = code;
  }
}

// Function to stream responses from the OpenAI API using the provided model and parameters.
export const OpenAIStream = async (
  model: OpenAIModel,
  systemPrompt: string,
  temperature: number,
  key: string,
  messages: Message[],
) => {
  // ✅ NEW: Model-specific endpoint and API key routing
  let apiHost = OPENAI_API_HOST;
  let apiKey = key ? key : OPENAI_API_KEY;
  let apiVersion = OPENAI_API_VERSION;
  
  // Route to correct endpoint based on model
  if (model.id === 'claude-sonnet-4-5') {
    // Claude Sonnet - Use Azure Cognitive Services endpoint
    apiHost = CLAUDE_SONNET_HOST;
    apiKey = CLAUDE_SONNET_API_KEY;
    apiVersion = CLAUDE_SONNET_API_VERSION;
  } else if (model.id === 'aljais') {
    // Aljais uses Azure AI Services endpoint
    apiHost = ALJAIS_API_HOST;
    apiKey = ALJAIS_API_KEY;
    apiVersion = ALJAIS_API_VERSION;
  }
  
  // Set up the URL for API request based on configuration.
  let url = `${apiHost}/v1/chat/completions`;
  if (OPENAI_API_TYPE === 'azure') {
    if (model.id === 'claude-sonnet-4-5') {
      // Claude uses OpenAI-compatible endpoint through Azure
      url = `${apiHost}/anthropic/v1/chat/completions`;
    } else if (model.id === 'aljais') {
      // Aljais uses models endpoint with API version
      url = `${apiHost}/models/chat/completions?api-version=${apiVersion}`;
    } else {
      // Standard Azure OpenAI deployment path for GPT models
      url = `${apiHost}/openai/deployments/${model?.id}/chat/completions?api-version=${apiVersion}`;
    }
  }

  // Prepare request body
  const requestBody = model.id === 'claude-sonnet-4-5'
    ? {
        // Azure uses OpenAI-compatible format for Claude
        model: 'claude-sonnet-4-5',
        max_completion_tokens: 2048,
        temperature: temperature,
        stream: true,
        // Azure Playground format: content as array with type/text objects
        messages: [
          {
            role: 'system',
            content: [{ type: 'text', text: systemPrompt }],
          },
          ...messages.map(msg => ({
            role: msg.role,
            // ✅ FIX: Check if content is already multimodal (array with images)
            content: Array.isArray(msg.content) 
              ? msg.content  // Already in multimodal format, use as-is
              : [{ type: 'text', text: msg.content }],  // Plain text, wrap it
          })),
        ],
      }
    : model.id === 'aljais'
    ? {
        // Aljais uses standard OpenAI format with plain string content
        model: 'jais-30b-chat',
        max_tokens: 2048,
        temperature: temperature,
        top_p: 0.1,
        stream: true,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          ...messages,
        ],
      }
    : {
        // OpenAI format for other models
        ...(OPENAI_API_TYPE === 'openai' && { model: model.id }),
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          ...messages,
        ],
        max_completion_tokens: 4000,
        temperature: temperature,
        stream: true,
      };

  // Debug logging for Claude and Aljais requests
  if (model.id === 'claude-sonnet-4-5' || model.id === 'aljais') {
    console.log(`[OpenAIStream] ${model.id} Request:`, {
      url,
      apiHost,
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey.substring(0, 20) + '...',
    });
    console.log(`[OpenAIStream] ${model.id} Payload:`, JSON.stringify(requestBody, null, 2));
  }

  // Generate UUID for Azure request ID (Edge runtime compatible)
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (OPENAI_API_TYPE === 'openai') {
    headers['Authorization'] = `Bearer ${apiKey}`;
    if (OPENAI_ORGANIZATION) {
      headers['OpenAI-Organization'] = OPENAI_ORGANIZATION;
    }
  } else if (OPENAI_API_TYPE === 'azure') {
    if (model.id === 'claude-sonnet-4-5') {
      // Claude on Azure requires Azure-specific headers (exact match to playground)
      headers['x-api-key'] = apiKey;
      headers['x-ms-client-request-id'] = generateUUID();
      headers['x-ms-useragent'] = 'AzureOpenAI.Studio/ai.azure.com';
    } else if (model.id === 'aljais') {
      // Aljais on Azure requires Azure-specific headers
      headers['api-key'] = apiKey;
      headers['x-ms-client-request-id'] = generateUUID();
      headers['x-ms-useragent'] = 'AzureOpenAI.Studio/ai.azure.com';
    } else {
      // Standard Azure OpenAI auth
      headers['api-key'] = apiKey;
    }
  }

  // Debug logging for Claude and Aljais headers
  if (model.id === 'claude-sonnet-4-5' || model.id === 'aljais') {
    console.log(`[OpenAIStream] ${model.id} Headers:`, headers);
  }

  // Execute the API request with necessary headers and payload.
  const res = await fetch(url, {
    headers,
    method: 'POST',
    body: JSON.stringify(requestBody),
  });

  // Encoder and decoder for handling text data in the stream.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Error handling for non-200 status codes.
  if (res.status !== 200) {
    const result = await res.json();
    if (result.error) {
      throw new OpenAIError(
        result.error.message,
        result.error.type,
        result.error.param,
        result.error.code,
      );
    } else {
      throw new Error(
        `OpenAI API returned an error: ${decoder.decode(result?.value) || result.statusText
        }`,
      );
    }
  }

  // Handling the streaming of data from the OpenAI API.
  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === 'event') {
          const data = event.data;
          if (data !== '[DONE]') {
            try {
              const json = JSON.parse(data);
              
              // Azure Claude uses OpenAI-compatible streaming format
              // Handle OpenAI streaming format (same for all models on Azure)
              if (json.choices[0]?.finish_reason != null) {
                controller.close();
                return;
              }
              const text = json?.choices[0]?.delta?.content;
              if (text) {
                const queue = encoder.encode(text);
                controller.enqueue(queue);
              }
            } catch (e) {
              controller.error(e);
            }
          }
        }
      };

      const parser = createParser(onParse);

      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  return stream;
};
