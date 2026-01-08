import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE, AZURE_BLOB_BASE_URL } from '@/utils/app/const';
import { OpenAIError, OpenAIStream } from '@/utils/server';
import { ChatBody, Message } from '@/types/chat';
// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';
import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';
import { OpenAIModel } from '@/types/openai';
import { withAuth } from '@/utils/middleware/auth';
import { convertMessagesToMultimodal } from '@/utils/visionHelper';
import { convertAudioToTranscriptions } from '@/utils/audioHelper';

export const config = { runtime: 'edge' };

// Define type for the WebAssembly instance
type WasmInstance = {
  instance: WebAssembly.Instance;
  module: WebAssembly.Module;
};

// Singleton pattern for WebAssembly instance to avoid multiple initializations
let wasmInstance: WasmInstance | null = null;

// Initialize or retrieve the existing WebAssembly instance
const getWasmInstance = async () => {
  if (!wasmInstance) {
    await init((imports) =>
      WebAssembly.instantiate(wasm, imports).then((instance) => {
        wasmInstance = instance;
        return instance;
      }),
    );
  }
  return wasmInstance;
};

// Main handler function to process the request
const handler = async (req: Request): Promise<Response> => {
  try {
    // Parse the request body
    const { model, messages, key, prompt, temperature } =
      (await req.json()) as ChatBody;

    // Ensure WASM module is initialized
    await getWasmInstance();

    // Set up encoding with Tiktoken library
    const encoding = new Tiktoken(
      tiktokenModel.bpe_ranks,
      tiktokenModel.special_tokens,
      tiktokenModel.pat_str,
    );

    // Determine the prompt to send, using default if none provided
    let promptToSend = prompt || DEFAULT_SYSTEM_PROMPT;

    // Set temperature for AI response, using default if none provided
    let temperatureToUse = temperature ?? DEFAULT_TEMPERATURE;

    // Encode the prompt for processing
    const prompt_tokens = encoding.encode(promptToSend);
    let tokenCount = prompt_tokens.length;
    let messagesToSend: Message[] = [];

    // Loop through messages to determine which to send based on token limits
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      delete message.prompt;
      const tokens = encoding.encode(message.content);
      if (tokenCount + tokens.length + 1000 > model.tokenLimit) break;
      tokenCount += tokens.length;
      messagesToSend = [message, ...messagesToSend];
    }

    // Free up memory used by Tiktoken encoder
    encoding.free();

    // ✅ CRITICAL: Convert messages with images to multimodal format for GPT-5 vision
    console.log('[chat API]: ===== MULTIMODAL CONVERSION =====');
    const blobBaseUrl = AZURE_BLOB_BASE_URL;
    
    // ✅ FIX: Use headers for origin detection (Azure deployment compatibility)
    // req.url gives localhost even on Azure, so use Host header
    const host = req.headers.get('host') || req.headers.get('x-forwarded-host') || new URL(req.url).host;
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const requestOrigin = host 
        ? `${protocol}://${host}` 
        : 'https://webapp-taxgenie-nonprod-uksouth-002.azurewebsites.net'; // Fallback to Azure URL
    
    console.log('[chat API]: Blob base URL:', blobBaseUrl);
    console.log('[chat API]: Request origin:', requestOrigin);
    console.log('[chat API]: Host header:', host);
    console.log('[chat API]: Messages to convert:', messagesToSend.length);
    
    // Convert images to base64 for vision
    messagesToSend = await convertMessagesToMultimodal(messagesToSend, blobBaseUrl, requestOrigin);
    
    // Convert audio to transcriptions
    messagesToSend = await convertAudioToTranscriptions(messagesToSend, blobBaseUrl, requestOrigin);
    
    console.log('[chat API]: ===== AFTER CONVERSION =====');
    messagesToSend.forEach((msg, idx) => {
      const contentType = Array.isArray(msg.content) ? 'multimodal' : 'text';
      const hasTranscription = typeof msg.content === 'string' && msg.content.includes('[Audio Transcription:');
      console.log(`[chat API]:   Message [${idx}]: ${contentType}, Has Audio: ${hasTranscription}`);
    });

    // ✅ FIXED: Properly type and include all required fields in OpenAIModel
    const modelBody: OpenAIModel = {
      id: model.id,
      name: model.name,
      label: model.label ?? model.name,       // fallback if missing
      heading: model.heading ?? model.name,   // fallback if missing
      message: model.message ?? '',           // safe empty default
      maxLength: model.maxLength,
      tokenLimit: model.tokenLimit,
    };

    // Initiate streaming response with OpenAIStream
    const stream = await OpenAIStream(
      modelBody,
      promptToSend,
      temperatureToUse,
      key,
      messagesToSend,
    );

    // Return the stream as a response
    return new Response(stream);
  } catch (error) {
    console.error(error);

    // Handle and return errors appropriately
    if (error instanceof OpenAIError) {
      return new Response('Error', {
        status: 500,
        statusText: error.message,
      });
    } else {
      return new Response('Error', { status: 500 });
    }
  }
};

// Export without authentication middleware - auth handled at app level via MSAL
export default handler;