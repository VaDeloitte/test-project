// File service for making API calls to the file endpoints
import { getCSRFToken } from "@/utils/app/csrf";

interface FileResponse {
    success: boolean;
    count?: number;
    data?: any;
    message?: string;
    error?: string;
}

/**
 * Get all files for the authenticated user
 */
export const getUserFiles = async (): Promise<FileResponse> => {
    try {
        const response = await fetch('/api/file', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Include cookies for authentication
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch files');
        }

        return data;
    } catch (error: any) {
        console.error('Error fetching files:', error);
        throw error;
    }
};

/**
 * Delete a file by ID
 * @param fileId - The ID of the file to delete
 */
export const deleteFile = async (fileId: string, email?: string, token?: string | null,): Promise<FileResponse> => {
    const headers = new Headers();
    try {
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
        const csrfToken = getCSRFToken();
        if (csrfToken) {
        headers.set('X-XSRF-TOKEN', csrfToken);
        }
        headers.set('Content-Type', 'application/json');

        const response = await fetch(`/api/file?id=${encodeURIComponent(fileId)}`, {
            method: 'DELETE',
            headers,
            credentials: 'include', // Include cookies for authentication
            body: JSON.stringify({
                id: fileId,
                ...(email && { email }) // Include email if provided
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete file');
        }

        return data;
    } catch (error: any) {
        console.error('Error deleting file:', error);
        throw error;
    }
};

/**
 * Delete multiple files by IDs
 * @param fileIds - Array of file IDs to delete
 */
export const deleteMultipleFiles = async (fileIds: string[]): Promise<{ success: boolean; results: FileResponse[] }> => {
    try {
        const deletePromises = fileIds.map(id => deleteFile(id));
        const results = await Promise.allSettled(deletePromises);

        const formattedResults = results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                return {
                    success: false,
                    error: result.reason.message || 'Failed to delete file',
                    fileId: fileIds[index]
                };
            }
        });

        const allSuccessful = formattedResults.every(r => r.success);

        return {
            success: allSuccessful,
            results: formattedResults
        };
    } catch (error: any) {
        console.error('Error deleting multiple files:', error);
        throw error;
    }
};


/**
 * Download file by azureFileName
 * @param fileName - Azure File Name
 */
export async function downloadFile(fileName: string, downloadAsFileName: string) {
    try {
        // Show loading state
        const button = document.activeElement as HTMLButtonElement;
        if (button) button.disabled = true;

        const response = await fetch(`/api/file/download?fileName=${encodeURIComponent(fileName)}`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Download failed');
        }
        
        // Get the blob from response
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadAsFileName;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Re-enable button
        if (button) button.disabled = false;
    } catch (error) {
        console.error('Download failed:', error);
        alert('Failed to download file. Please try again.');
    }
}