import { Plugin, PluginID } from '@/types/plugin';
import { getAuthHeaders } from './csrf';

export const getEndpoint = (plugin: Plugin | null) => {
  if (!plugin) {
    return 'api/chat';
  }

  if (plugin.id === PluginID.GOOGLE_SEARCH) {
    return 'api/google';
  }

  return 'api/chat';
};

export const createAuthenticatedFetch = (accessToken?: string) => {
  return async (url: string, options: RequestInit = {}) => {
    // Get auth headers from csrf helper
    const authHeaders = getAuthHeaders();

    const headers = new Headers(options.headers);

    // Merge auth headers
    Object.entries(authHeaders).forEach(([key, value]) => {
      headers.set(key, String(value));
    });

    // Override with provided access token if specified
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include' as RequestCredentials,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  };
};