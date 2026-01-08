/**
 * Audio helper utilities for chat transcription.
 * Converts messages with audio files to include transcriptions.
 */

import { Message } from '@/types/chat';

// Audio file extensions that should be transcribed
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'ogg', 'webm', 'flac', 'aac']);

/**
 * Transcribe audio from Azure Blob Storage using Whisper API.
 * Uses backend proxy endpoint since Edge runtime can't access Azure SDK.
 */
async function transcribeAudio(blobUrl: string, requestOrigin?: string): Promise<string | null> {
    try {
        console.log('[audioHelper]: ========================================');
        console.log('[audioHelper]: Requesting transcription from backend');
        console.log('[audioHelper]: Audio URL:', blobUrl);
        console.log('[audioHelper]: Request Origin:', requestOrigin || 'NOT PROVIDED');
        
        // Build absolute URL for Edge runtime compatibility
        const apiUrl = requestOrigin 
            ? `${requestOrigin}/api/transcribe-audio`
            : (typeof window !== 'undefined' 
                ? `${window.location.origin}/api/transcribe-audio`
                : '/api/transcribe-audio');
        
        console.log('[audioHelper]: API URL for backend proxy:', apiUrl);
        
        // Call backend endpoint that has Azure SDK/Whisper access
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blobUrl })
        });
        
        console.log('[audioHelper]: Backend proxy response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[audioHelper]: ❌ Failed to transcribe audio');
            console.error('[audioHelper]: Status:', response.status);
            console.error('[audioHelper]: Error:', errorText);
            return null;
        }
        
        const { transcription } = await response.json();
        console.log('[audioHelper]: ✅ Audio transcribed');
        console.log('[audioHelper]: Transcription length:', transcription?.length || 0, 'chars');
        console.log('[audioHelper]: Transcription preview:', transcription?.substring(0, 100) || 'EMPTY');
        console.log('[audioHelper]: ========================================');
        return transcription;
    } catch (error) {
        console.error('[audioHelper]: ❌ EXCEPTION during audio transcription');
        console.error('[audioHelper]: Error:', error);
        console.error('[audioHelper]: Error type:', typeof error);
        console.error('[audioHelper]: Error message:', error instanceof Error ? error.message : String(error));
        console.error('[audioHelper]: ========================================');
        return null;
    }
}

/**
 * Extract file extension from filename or blob URL.
 */
function getFileExtension(filename: string): string {
    if (!filename) return '';
    
    // Handle blob URLs
    if (filename.includes('/')) {
        filename = filename.split('/').pop() || '';
    }
    // Remove query parameters
    if (filename.includes('?')) {
        filename = filename.split('?')[0];
    }
    
    // Get extension
    const parts = filename.split('.');
    if (parts.length > 1) {
        return parts[parts.length - 1].toLowerCase();
    }
    return '';
}

/**
 * Check if file is an audio file based on extension.
 */
function isAudioFile(filename: string): boolean {
    const ext = getFileExtension(filename);
    return AUDIO_EXTENSIONS.has(ext);
}

interface FileItem {
    azureFileName?: string;
    originalFileName?: string;
    fileName?: string;
    name?: string;
    url?: string;
}

/**
 * Convert chat messages with audio files to include transcriptions.
 * 
 * Transforms:
 *     {
 *         "role": "user",
 *         "content": "Listen to this",
 *         "file": [{azureFileName: "abc123.mp3", originalFileName: "recording.mp3"}]
 *     }
 * 
 * To:
 *     {
 *         "role": "user",
 *         "content": "Listen to this\n\n[Audio Transcription: Recording.mp3]\n{transcribed text}"
 *     }
 * 
 * @param messages - List of message objects
 * @param blobBaseUrl - Base URL for blob storage
 * @param requestOrigin - Request origin for absolute URLs
 * @returns List of messages with audio transcriptions
 */
export async function convertAudioToTranscriptions(
    messages: Message[],
    blobBaseUrl?: string,
    requestOrigin?: string
): Promise<Message[]> {
    if (!messages || messages.length === 0) {
        return messages;
    }
    
    const convertedMessages: Message[] = [];
    
    for (let msgIdx = 0; msgIdx < messages.length; msgIdx++) {
        const message = messages[msgIdx];
        
        try {
            // Copy message to avoid modifying original
            const convertedMsg: Message = {
                role: message.role || 'user',
                content: message.content
            };
            
            // Get files array (check both 'files' and 'file' properties)
            let files = (message as any).files || message.file;
            
            // ✅ FIX: Ensure files is always an array (handle string URLs from old flow)
            if (files && !Array.isArray(files)) {
                files = [files];
            }
            
            // Check if message has audio files
            let hasAudio = false;
            const audioFiles: Array<{filename: string; url: string}> = [];
            const nonAudioFiles: (string | FileItem)[] = [];
            
            console.log(`[audioHelper]: Message [${msgIdx}] - Has files property: ${!!files}, Is array: ${Array.isArray(files)}, Count: ${files?.length || 0}`);
            
            if (files && Array.isArray(files)) {
                console.log(`[audioHelper]: Message [${msgIdx}] - Files array:`, JSON.stringify(files, null, 2));
                
                // Separate audio from other files
                for (const fileItem of files) {
                    console.log(`[audioHelper]:   Processing file item:`, fileItem);
                    let filename: string | undefined;
                    let fileUrl: string | undefined;
                    
                    if (typeof fileItem === 'string') {
                        filename = fileItem;
                        // If it's already a full URL, use it
                        if (fileItem.startsWith('http://') || fileItem.startsWith('https://')) {
                            fileUrl = fileItem;
                        } else if (blobBaseUrl) {
                            // Construct full URL from base + filename
                            fileUrl = `${blobBaseUrl.replace(/\/$/, '')}/${fileItem}`;
                        } else {
                            fileUrl = fileItem; // Use as-is if no base URL
                        }
                    } else if (typeof fileItem === 'object' && fileItem !== null) {
                        // Try different property names
                        filename = (
                            fileItem.azureFileName ||
                            fileItem.originalFileName ||
                            fileItem.fileName ||
                            fileItem.name
                        );
                        fileUrl = fileItem.url;
                        
                        // If no URL but we have filename and base URL
                        if (!fileUrl && filename && blobBaseUrl) {
                            // Use azureFileName for URL construction
                            const azureName = fileItem.azureFileName || filename;
                            fileUrl = `${blobBaseUrl.replace(/\/$/, '')}/${azureName}`;
                        } else if (!fileUrl && filename) {
                            fileUrl = filename; // Fallback
                        }
                    }
                    
                    // Check if it's an audio file
                    if (filename && isAudioFile(filename)) {
                        hasAudio = true;
                        console.log(`[audioHelper]:     ✅ Detected audio: ${filename}, URL: ${fileUrl}`);
                        audioFiles.push({
                            filename,
                            url: fileUrl || filename
                        });
                    } else {
                        // Keep non-audio files in original format
                        console.log(`[audioHelper]:     ℹ️ Non-audio file: ${filename}`);
                        nonAudioFiles.push(fileItem);
                    }
                }
            }
            
            // Add transcriptions to content if we have audio files
            let textContent = typeof message.content === 'string' ? message.content : '';
            
            if (hasAudio) {
                // Transcribe each audio file and append to content
                for (const audio of audioFiles) {
                    if (audio.url) {
                        const transcription = await transcribeAudio(audio.url, requestOrigin);
                        
                        if (transcription) {
                            // Append transcription to message content
                            const transcriptionBlock = `\n\n[Audio Transcription: ${audio.filename}]\n${transcription}`;
                            textContent += transcriptionBlock;
                            console.log(`[audioHelper]: ✅ Added transcription to message [${msgIdx}]: ${audio.filename}`);
                        } else {
                            console.warn(`[audioHelper]: ⚠️ Failed to transcribe audio [${msgIdx}]: ${audio.filename}`);
                            // Add a note that transcription failed
                            textContent += `\n\n[Audio file attached: ${audio.filename} - transcription unavailable]`;
                        }
                    }
                }
                
                convertedMsg.content = textContent;
                
                // Keep non-audio files in 'file' property
                if (nonAudioFiles.length > 0) {
                    convertedMsg.file = nonAudioFiles;
                }
                
                console.log(`[audioHelper]: Converted message [${msgIdx}] with audio transcriptions: ${audioFiles.length} audio files, ${nonAudioFiles.length} other files`);
            } else {
                // No audio: keep original format (preserve multimodal content if already converted by visionHelper)
                convertedMsg.content = message.content;
                if (files) {
                    convertedMsg.file = files;
                }
            }
            
            // Preserve other message properties
            for (const key in message) {
                if (!['role', 'content', 'file'].includes(key)) {
                    (convertedMsg as any)[key] = (message as any)[key];
                }
            }
            
            convertedMessages.push(convertedMsg);
            
        } catch (e) {
            console.error(`[audioHelper]: Error converting message [${msgIdx}] with audio:`, e);
            console.error(`[audioHelper]: Problematic message:`, message);
            // Fallback: keep original message
            convertedMessages.push(message);
        }
    }
    
    return convertedMessages;
}

/**
 * Debug helper to log message structure.
 */
export function logAudioMessages(messages: Message[], label: string = 'Messages'): void {
    console.log(`[audioHelper]: ${label} - Count: ${messages.length}`);
    for (let idx = 0; idx < messages.length; idx++) {
        const msg = messages[idx];
        const content = msg.content;
        const files = msg.file;
        
        const hasTranscription = typeof content === 'string' && content.includes('[Audio Transcription:');
        const fileCount = Array.isArray(files) ? files.length : (files ? 1 : 0);
        
        console.log(`  [${idx}] Role: ${msg.role}, Has Transcription: ${hasTranscription}, Files: ${fileCount}`);
    }
}