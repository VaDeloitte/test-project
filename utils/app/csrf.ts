import { v4 as uuidv4 } from 'uuid';

export function generateCSRFToken(): string {
  return uuidv4();
}

export function setCSRFToken(): string {
  const csrfToken = generateCSRFToken();
  document.cookie = `XSRF-TOKEN=${csrfToken}; path=/; secure; samesite=strict`;
  sessionStorage.setItem('csrf_token', csrfToken);
  return csrfToken;
}

export function getCSRFToken(): string | null {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  if (match) return match[1];
  return sessionStorage.getItem('csrf_token');
}

export function clearCSRFToken(): void {
  document.cookie = 'XSRF-TOKEN=; max-age=0; path=/; secure; samesite=strict';
  sessionStorage.removeItem('csrf_token');
}

// Helper function to get authentication headers for API calls
export function getAuthHeaders(): HeadersInit {
  // Get ID token from localStorage (MSAL token for Authorization header)
  const userDataStr = localStorage.getItem('user');
  let idToken = null;

  if (userDataStr) {
    try {
      const userData = JSON.parse(userDataStr);
      idToken = userData.idToken;
    } catch (e) {
      console.error('Failed to parse user data:', e);
    }
  }

  // CSRF token for non-GET requests
  const csrfToken = getCSRFToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Authorization header should contain the MSAL ID token
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  // CSRF token for POST/PUT/DELETE/PATCH requests
  if (csrfToken) {
    headers['X-XSRF-Token'] = csrfToken;
  }

  // Note: api_token is sent automatically via cookie by the browser
  // The middleware will read it from cookies
  
  return headers;
}

// Authenticated fetch wrapper - use this instead of raw fetch for API calls
export async function authenticatedFetch(
  url: string | URL,
  init?: RequestInit
): Promise<Response> {
  const authHeaders = getAuthHeaders();

  // Merge auth headers with any provided headers
  const headers = new Headers(init?.headers);
  Object.entries(authHeaders).forEach(([key, value]) => {
    if (!headers.has(key)) {
      headers.set(key, String(value));
    }
  });

  return fetch(url, {
    ...init,
    headers,
    credentials: 'include', // Ensure cookies are sent
  });
}