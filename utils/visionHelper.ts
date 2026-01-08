/**
 * Vision helper utilities for GPT-5/GPT-5-mini multimodal chat.
 * Converts messages with image files to OpenAI's multimodal format.
 */

import { Message } from '@/types/chat';

// Image file extensions that should be processed with vision
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'svg', 'gif', 'webp', 'bmp']);

/**
 * Download image from Azure Blob Storage and convert to base64 data URL.
 * Uses backend proxy endpoint since Edge runtime can't authenticate directly to private blob storage.
 */
async function downloadImageAsBase64(blobUrl: string, requestOrigin?: string): Promise<string | null> {
    try {
        console.log('[visionHelper]: Requesting base64 conversion from backend:', blobUrl);
        
        // Build absolute URL for Edge runtime compatibility
        const apiUrl = requestOrigin 
            ? `${requestOrigin}/api/convert-image-to-base64`
            : (typeof window !== 'undefined' 
                ? `${window.location.origin}/api/convert-image-to-base64`
                : '/api/convert-image-to-base64');
        
        console.log('[visionHelper]: API URL:', apiUrl);
        
        // Call backend endpoint that has Azure SDK authentication
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blobUrl })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[visionHelper]: Failed to convert image:', response.status, errorText);
            return null;
        }
        
        const { dataUrl } = await response.json();
        console.log('[visionHelper]: ✅ Image converted to base64 (size:', dataUrl.length, 'chars)');
        return dataUrl;
    } catch (error) {
        console.error('[visionHelper]: Error downloading/converting image:', error);
        return null;
    }
}

/**
 * OLD IMPLEMENTATION - Kept for reference
 * This doesn't work because Edge runtime fetch() can't authenticate to private Azure Blob Storage
 */
async function downloadImageAsBase64_OLD(blobUrl: string): Promise<string | null> {
    try {
        console.log('[visionHelper]: Downloading image from blob:', blobUrl);
        
        const response = await fetch(blobUrl);
        if (!response.ok) {
            console.error('[visionHelper]: Failed to download image:', response.status, response.statusText);
            return null;
        }
        
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        
        // Detect MIME type from blob or filename
        let mimeType = blob.type;
        if (!mimeType) {
            const ext = blobUrl.split('.').pop()?.toLowerCase();
            const mimeTypes: Record<string, string> = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'webp': 'image/webp',
                'svg': 'image/svg+xml',
                'bmp': 'image/bmp'
            };
            mimeType = ext ? mimeTypes[ext] || 'image/jpeg' : 'image/jpeg';
        }
        
        const dataUrl = `data:${mimeType};base64,${base64}`;
        console.log('[visionHelper]: ✅ Image converted to base64 (size:', base64.length, 'chars)');
        
        return dataUrl;
    } catch (error) {
        console.error('[visionHelper]: Error downloading/converting image:', error);
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
 * Check if file is an image based on extension.
 */
function isImageFile(filename: string): boolean {
    const ext = getFileExtension(filename);
    return IMAGE_EXTENSIONS.has(ext);
}

interface FileItem {
    azureFileName?: string;
    originalFileName?: string;
    fileName?: string;
    name?: string;
    url?: string;
}

/**
 * Convert chat messages with image files to GPT-5/GPT-5-mini multimodal format.
 * 
 * Transforms:
 *     {
 *         "role": "user",
 *         "content": "What's in this image?",
 *         "file": [{azureFileName: "abc123.jpg", originalFileName: "photo.jpg"}]
 *     }
 * 
 * To:
 *     {
 *         "role": "user",
 *         "content": [
 *             {"type": "text", "text": "What's in this image?"},
 *             {"type": "image_url", "image_url": {"url": "https://...blob.../abc123.jpg"}}
 *         ]
 *     }
 * 
 * @param messages - List of message objects
 * @param blobBaseUrl - Base URL for blob storage (e.g., "https://storage.blob.core.windows.net/temp-data-sources")
 * @returns List of messages in multimodal format (images as content blocks)
 */
export async function convertMessagesToMultimodal(
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
            
            // Get files array
            const files = message.file;
            
            // Check if message has images
            let hasImages = false;
            const imageFiles: Array<{filename: string; url: string}> = [];
            const nonImageFiles: (string | FileItem)[] = [];
            
            console.log(`[visionHelper]: Message [${msgIdx}] - Has files property: ${!!files}, Is array: ${Array.isArray(files)}, Count: ${files?.length || 0}`);
            
            if (files && Array.isArray(files)) {
                // Separate images from other files
                for (const fileItem of files) {
                    console.log(`[visionHelper]:   Processing file item:`, fileItem);
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
                            // Use azureFileName for URL construction (that's the blob filename)
                            const azureName = fileItem.azureFileName || filename;
                            fileUrl = `${blobBaseUrl.replace(/\/$/, '')}/${azureName}`;
                        } else if (!fileUrl && filename) {
                            fileUrl = filename; // Fallback
                        }
                    }
                    
                    // Check if it's an image
                    if (filename && isImageFile(filename)) {
                        hasImages = true;
                        console.log(`[visionHelper]:     ✅ Detected image: ${filename}, URL: ${fileUrl}`);
                        imageFiles.push({
                            filename,
                            url: fileUrl || filename
                        });
                    } else {
                        // Keep non-image files in original format
                        console.log(`[visionHelper]:     ℹ️ Non-image file: ${filename}`);
                        nonImageFiles.push(fileItem);
                    }
                }
            }
            
            // Build content based on whether we have images
            const textContent = typeof message.content === 'string' ? message.content : '';
            
            if (hasImages) {
                // Multimodal format: content is array of objects
                const contentBlocks: Array<{type: string; text?: string; image_url?: {url: string}}> = [];
                
                // Add text block first (if any)
                if (textContent) {
                    contentBlocks.push({
                        type: 'text',
                        text: textContent
                    });
                }
                
                // Add image blocks (download and convert to base64 to avoid 403 errors)
                for (const img of imageFiles) {
                    if (img.url) {
                        // Download image and convert to base64 data URL
                        const base64Url = await downloadImageAsBase64(img.url, requestOrigin);
                        
                        if (base64Url) {
                            contentBlocks.push({
                                type: 'image_url',
                                image_url: {
                                    url: base64Url
                                }
                            });
                            console.log(`[visionHelper]: ✅ Added image to message [${msgIdx}]: ${img.filename} (base64)`);
                        } else {
                            console.warn(`[visionHelper]: ⚠️ Failed to convert image [${msgIdx}]: ${img.filename}`);
                        }
                    }
                }
                
                convertedMsg.content = contentBlocks;
                
                // Keep non-image files in 'file' property (for RAG processing)
                if (nonImageFiles.length > 0) {
                    convertedMsg.file = nonImageFiles;
                }
                
                console.log(`[visionHelper]: Converted message [${msgIdx}] to multimodal format: ${imageFiles.length} images, ${nonImageFiles.length} other files`);
            } else {
                // No images: keep original format
                convertedMsg.content = textContent;
                if (files) {
                    convertedMsg.file = files;
                }
            }
            
            // Preserve other message properties (timestamp, etc.)
            for (const key in message) {
                if (!['role', 'content', 'file'].includes(key)) {
                    (convertedMsg as any)[key] = (message as any)[key];
                }
            }
            
            convertedMessages.push(convertedMsg);
            
        } catch (e) {
            console.error(`[visionHelper]: Error converting message [${msgIdx}] to multimodal format:`, e);
            console.error(`[visionHelper]: Problematic message:`, message);
            // Fallback: keep original message
            convertedMessages.push(message);
        }
    }
    
    return convertedMessages;
}

/**
 * Debug helper to log message structure.
 */
export function logMessageFormat(messages: Message[], label: string = 'Messages'): void {
    console.log(`[visionHelper]: ${label} - Count: ${messages.length}`);
    for (let idx = 0; idx < messages.length; idx++) {
        const msg = messages[idx];
        const content = msg.content;
        const files = msg.file;
        
        const contentType = Array.isArray(content) ? 'multimodal' : 'text';
        const fileCount = Array.isArray(files) ? files.length : (files ? 1 : 0);
        
        console.log(`  [${idx}] Role: ${msg.role}, Content: ${contentType}, Files: ${fileCount}`);
        
        if (Array.isArray(content)) {
            for (const block of content) {
                const blockType = block.type || 'unknown';
                console.log(`    - Block type: ${blockType}`);
            }
        }
    }
}
