import axios from "axios";
import { getCSRFToken } from "@/utils/app/csrf";

// services/workflowApiService.js

/**
 * Legacy upload function using Fetch API.
 * Modified to accept an optional 'mode' parameter to distinguish between tabs.
 */
export const uploadDocuments = async (formData: any, token: any, mode: string = "Upload") => {
  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Inject the upload mode into the form data so the backend can route/tag it correctly
  if (formData instanceof FormData) {
    formData.append("mode", mode);
  }

  try {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers.set('X-XSRF-TOKEN', csrfToken);
    }
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      headers,
      credentials: 'include' as RequestCredentials,
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    console.error('Error in upload:', error);
    throw error;
  }
};

/**
 * Enhanced upload function using Axios with retry logic and progress tracking.
 * Modified to accept an optional 'mode' parameter (defaults to "Upload").
 */
export const newUploadDocuments = async (
  formData: FormData,
  token?: string | null,
  onProgress?: (percent: number) => void,
  mode: string = "Upload" // Optional parameter with default value
) => {
  const maxRetries = 2; // Retry failed uploads (helps with Azure cold start)
  const retryDelay = 2000; // 2 seconds between retries

  // Append the mode to the FormData payload. 
  // We do this before the loop to ensure the payload is ready for all attempts.
  // Check if it exists to avoid duplication if the caller already added it.
  if (!formData.has("mode")) {
    formData.append("mode", mode);
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const csrfToken = getCSRFToken();
      if (csrfToken) headers["X-XSRF-TOKEN"] = csrfToken;

      // ✅ COLD START FIX: Generous timeout since we warmup on app load
      // Backend should be warm, but allow time for heavy file processing
      const timeout = 60000; // 60 seconds (plenty of time)

      console.log(`[uploadService]: Upload attempt ${attempt}/${maxRetries} (timeout: ${timeout}ms, mode: ${mode})`);

      const response = await axios.post("/api/upload", formData, {
        headers,
        withCredentials: true,
        timeout: timeout,
        onUploadProgress: (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total ?? 1)
          );
          onProgress?.(percent);
        },
      });

      console.log(`[uploadService]: ✅ Upload successful on attempt ${attempt}`);
      return response.data;

    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;
      const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
      const is5xxError = error.response?.status >= 500 && error.response?.status < 600;
      const is429 = error.response?.status === 429; // Too many requests

      // Retry on timeout or server errors (cold start scenarios)
      const shouldRetry = !isLastAttempt && (isTimeout || is5xxError || is429);

      if (shouldRetry) {
        console.warn(`[uploadService]: ⚠️ Attempt ${attempt} failed (${error.code || error.response?.status}), retrying in ${retryDelay}ms...`);
        console.warn(`[uploadService]: Error details:`, error.message);

        // Wait before retry (with exponential backoff)
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        continue; // Try again
      }

      // Last attempt or non-retryable error - throw
      console.error(`[uploadService]: ❌ Upload failed after ${attempt} attempt(s):`, error);

      // Provide helpful error messages
      if (isTimeout) {
        error.message = "Upload timed out. Azure Function may be starting up. Please try again.";
      } else if (is5xxError) {
        error.message = "Server error during upload. Please try again in a moment.";
      } else if (is429) {
        error.message = "Too many requests. Please wait a moment and try again.";
      }

      throw error;
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new Error("Upload failed after all retries");
};

export const getMyFiles = async (token: string, userEmail: string) => {
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${token}`);

  try {
    // We call our own Next.js API, passing the email as a query param
    // The Next.js API will handle the secure communication with Azure Function
    const response = await fetch(`/api/my-files?userEmail=${encodeURIComponent(userEmail)}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch files');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching my files:', error);
    throw error;
  }
};