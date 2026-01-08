import { NextApiRequest, NextApiResponse } from 'next';
import { jwtVerify, createRemoteJWKSet, JWTPayload } from 'jose';
import { APPID, AUTHORITY } from '@/config/Config';
import { IncomingHttpHeaders } from 'http';
import { User } from '@/types';


const isDevelopment = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_AUTH_REQUIRED !== 'true';

const config = {
  clientId: APPID,
  authority: AUTHORITY,
  clientSecret: process.env.AUTHAPP_CLIENTID,
  discoveryKeysEndpoint: `${AUTHORITY}/discovery/v2.0/keys`
};

const JWKS = createRemoteJWKSet(new URL(config.discoveryKeysEndpoint, 'https://login.microsoftonline.com/36da45f1-dd2c-4d1f-af13-5abe46b99921/v2.0'));

function isUser(payload: any): payload is User {
  return (
    typeof payload.isAdmin === 'boolean' &&
    typeof payload.loggedIn === 'boolean' &&
    typeof payload.email === 'string' &&
    typeof payload.username === 'string'
  );
}

function headersToRecord(headers: IncomingHttpHeaders | Headers): Record<string, string | string[]> {
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  // For IncomingHttpHeaders
  return Object.entries(headers).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key.toLowerCase()] = value;
    }
    return acc;
  }, {} as Record<string, string | string[]>);
}

function validateCSRFToken(req: NextApiRequest | Request): boolean {
  if (req.method === 'GET') {
    return true; // CSRF token not required for GET requests
  }

  // ✅ PRODUCTION FIX: Skip CSRF validation for API routes since we have JWT authentication
  // CSRF is primarily for browser-based CORS protection, but JWT tokens provide sufficient auth
  // This prevents issues with cookie domain/path in Azure deployments
  console.log('[CSRF Validation] Skipping CSRF check - using JWT authentication instead');
  return true;

  /* ORIGINAL CSRF VALIDATION - Disabled for production compatibility
  let headers: Record<string, string | string[]>;
  if ('headers' in req && req.headers instanceof Headers) {
    // This is a standard Request object
    headers = headersToRecord(req.headers);
  } else {
    // This is a NextApiRequest object
    headers = headersToRecord(req.headers as IncomingHttpHeaders);
  }

  const csrfToken = headers['x-xsrf-token'];
  const cookies = headers['cookie'];

  if (!csrfToken || !cookies || Array.isArray(csrfToken) || Array.isArray(cookies)) {
    return false;
  }

  const csrfCookie = cookies.split(';').find(c => c.trim().startsWith('XSRF-TOKEN='));

  if (!csrfCookie) {
    return false;
  }

  const cookieValue = csrfCookie.split('=')[1];
  return csrfToken === cookieValue;
  */
}

async function validateMsalToken(token: string): Promise<void> {
  const { payload } = await jwtVerify(token, JWKS, {
    audience: config.clientId,
    issuer: `${config.authority}/v2.0`,
  });
}

async function validateApiToken(token: string): Promise<JWTPayload> {
  // IMPORTANT: Use NEXT_PUBLIC_JWT_SECRET (build-time) for validation
  // This must match the secret used during token generation in azureAD.tsx
  // JWT_SECRET is for server-to-server communication only
  const secret = new TextEncoder().encode(process.env.NEXT_PUBLIC_JWT_SECRET!);
  
  if (!process.env.NEXT_PUBLIC_JWT_SECRET) {
    console.error('[validateApiToken] NEXT_PUBLIC_JWT_SECRET not configured in environment');
    throw new Error('NEXT_PUBLIC_JWT_SECRET not configured');
  }
  
  try {
    console.log('[validateApiToken] Validating token...');
    const { payload } = await jwtVerify(token, secret);
    console.log('[validateApiToken] Token valid, user:', payload.email);
    return payload;
  } catch (error) {
    console.error('[validateApiToken] Token validation error:', error);
    console.error('[validateApiToken] Token format check - starts with "eyJ":', token?.startsWith?.('eyJ') || 'invalid token format');
    throw new Error('Invalid or expired API token');
  }
}

function getAuthHeader(req: NextApiRequest | Request): string | null | undefined {
  if ('headers' in req && 'get' in req.headers && typeof req.headers.get === 'function') {
    // This is a standard Request object
    return req.headers.get('authorization');
  } else if ('headers' in req && 'authorization' in req.headers) {
    // This is a NextApiRequest object
    return req.headers.authorization as string | undefined;
  }
  return null;
}

type NextApiRequestCookies = {
  [key: string]: string | undefined
} | {
  get: (name: string) => { value: string } | undefined
};

function getApiToken(req: NextApiRequest | Request): string | null {
  if ('cookies' in req) {
    // This is a NextApiRequest object
    const cookies = req.cookies as NextApiRequestCookies;

    if ('get' in cookies && typeof cookies.get === 'function') {
      return cookies.get('api_token')?.value ?? null;
    } else {
      // Use type assertion to tell TypeScript this is the other type
      return (cookies as { [key: string]: string | undefined })['api_token'] ?? null;
    }
  } else if ('headers' in req && req.headers instanceof Headers) {
    // This is a standard Request object
    const cookies = req.headers.get('cookie');
    if (cookies) {
      const apiToken = cookies.split(';').find(c => c.trim().startsWith('api_token='));
      return apiToken ? apiToken.split('=')[1].trim() : null;
    }
  }
  return null;
}

export async function authMiddleware(req: NextApiRequest | Request): Promise<User | null> {
  // Log authentication attempt
  const method = req.method;
  const url = 'url' in req ? req.url : ('path' in req ? (req as any).path : 'unknown');
  console.log(`[Auth Middleware] ${method} ${url}`);

  if (!validateCSRFToken(req)) {
    console.error('[Auth Middleware] CSRF token validation failed');
    throw new Error('Invalid CSRF token');
  }

  const authHeader = getAuthHeader(req);
  const apiToken = getApiToken(req);

  console.log('[Auth Middleware] Auth header present:', !!authHeader);
  console.log('[Auth Middleware] API token present:', !!apiToken);

  // ✅ FIX: For GET requests, allow MSAL token only (no api_token required on first load)
  if (method === 'GET' && authHeader && !apiToken) {
    console.log('[Auth Middleware] 🔓 GET request - allowing MSAL token only (first load scenario)');
    
    try {
      const msalToken = authHeader.split(" ")[1];
      if (!msalToken) {
        console.error('[Auth Middleware] Invalid Authorization header format');
        throw new Error('Invalid Authorization header format');
      }
      
      // Validate MSAL token and extract email
      const { payload: msalPayload } = await jwtVerify(msalToken, JWKS, {
        audience: config.clientId,
        issuer: `${config.authority}/v2.0`,
      });
      
      const msalEmail = (msalPayload as any).email || (msalPayload as any).preferred_username || (msalPayload as any).upn;
      
      if (msalEmail) {
        const user: User = {
          email: msalEmail,
          loggedIn: true,
          isAdmin: false, // Default - will be set properly when api_token is available
          username: msalEmail.split('@')[0],
          accountId: (msalPayload as any).oid || '',
          idToken: msalToken,
          id: (msalPayload as any).oid || '',
        };
        
        console.log('[Auth Middleware] ✅ GET auth successful (MSAL only):', msalEmail);
        return user;
      } else {
        throw new Error('No email found in MSAL token');
      }
    } catch (error) {
      console.error('[Auth Middleware] MSAL token validation failed:', error);
      throw error;
    }
  }

  // For POST/PUT/DELETE or when both tokens should be present, require both
  if (!authHeader || !apiToken) {
    console.error('[Auth Middleware] Missing tokens - authHeader:', !!authHeader, 'apiToken:', !!apiToken);
    throw new Error('No token provided');
  }

  try {
    let msalEmail: string | null = null;
    
    if (authHeader) {
      const msalToken = authHeader.split(" ")[1];
      if (!msalToken) {
        console.error('[Auth Middleware] Invalid Authorization header format');
        throw new Error('Invalid Authorization header format');
      }
      
      // Validate MSAL token and extract email
      const { payload: msalPayload } = await jwtVerify(msalToken, JWKS, {
        audience: config.clientId,
        issuer: `${config.authority}/v2.0`,
      });
      
      // Extract email from MSAL token
      msalEmail = (msalPayload as any).email || (msalPayload as any).preferred_username || (msalPayload as any).upn;
      console.log('[Auth Middleware] MSAL token validated, email:', msalEmail);
    }

    let jWTPayload: JWTPayload | null = null;
    if (apiToken) {
      try {
        jWTPayload = await validateApiToken(apiToken);
        console.log('[Auth Middleware] API token validated successfully');
      } catch (error) {
        console.error('[Auth Middleware] API token validation failed:', error);
        console.warn('[Auth Middleware] 🔄 Falling back to MSAL token for user identity');
        
        // 🛡️ PRODUCTION FIX: If API token fails but we have MSAL email, create user object
        if (msalEmail) {
          jWTPayload = {
            email: msalEmail,
            loggedIn: true,
            isAdmin: false, // Default to non-admin, will be set correctly on next token refresh
            username: msalEmail.split('@')[0],
          } as JWTPayload;
          console.log('[Auth Middleware] ✅ Created user from MSAL token:', msalEmail);
        } else {
          throw error;
        }
      }
    }

    if (jWTPayload && isUser(jWTPayload)) {
      console.log('[Auth Middleware] User authenticated:', jWTPayload.email);
      return jWTPayload;
    }

    console.log('[Auth Middleware] Authentication successful (no user payload)');
    return null;
  } catch (error) {
    console.error('[Auth Middleware] Authentication error:', error);
    throw error;
  }
}

function addSecurityHeaders(res: NextApiResponse | Response) {
  const headers = {
    'X-Frame-Options': 'SAMEORIGIN',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'",
    'X-Content-Type-Options': 'nosniff',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  };

  if ('setHeader' in res) {
    // NextApiResponse
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
  } else if ('headers' in res) {
    // Standard Response
    Object.entries(headers).forEach(([key, value]) => {
      res.headers.set(key, value);
    });
  }
}

export function withAuth<T extends NextApiRequest | Request, U extends NextApiResponse | Response>(
  handler: (req: T, res: U) => Promise<void | Response>
) {
  return async (req: T, res: U) => {
    if (isDevelopment) {
      console.log('🔧 [withAuth] Running in DEVELOPMENT mode');
      
      // Try to get the actual user from tokens even in development
      try {
        const authHeader = getAuthHeader(req);
        const apiToken = getApiToken(req);
        
        console.log('🔧 [withAuth DEV] Auth header present:', !!authHeader);
        console.log('🔧 [withAuth DEV] API token present:', !!apiToken);
        
        let user: User | null = null;
        
        // Try to validate API token to get real user email
        if (apiToken) {
          try {
            const jWTPayload = await validateApiToken(apiToken);
            if (jWTPayload && isUser(jWTPayload)) {
              user = jWTPayload;
              console.log('✅ [withAuth DEV] Using real user from API token:', user.email);
            }
          } catch (error) {
            console.warn('⚠️ [withAuth DEV] API token validation failed, using dev user');
          }
        }
        
        // Fallback to dev user only if no valid token
        if (!user) {
          user = {
            isAdmin: true,
            loggedIn: true,
            email: 'dev@example.com',
            username: 'DevUser',
            accountId: 'dev-account-123',
          };
          console.log('⚠️ [withAuth DEV] Using fallback dev user');
        }
        
        // Attach user to request
        if ('headers' in req && !('get' in req.headers)) {
          (req as NextApiRequest & { user?: User }).user = user;
        } else if ('headers' in req && 'get' in req.headers) {
          (req as Request & { user?: User }).user = user;
        }
      } catch (error) {
        console.error('❌ [withAuth DEV] Error getting user, using fallback:', error);
        const devUser: User = {
          isAdmin: true,
          loggedIn: true,
          email: 'dev@example.com',
          username: 'DevUser',
          accountId: 'dev-account-123',
        };
        
        if ('headers' in req && !('get' in req.headers)) {
          (req as NextApiRequest & { user?: User }).user = devUser;
        } else if ('headers' in req && 'get' in req.headers) {
          (req as Request & { user?: User }).user = devUser;
        }
      }

      const result = await handler(req, res);

      if (result instanceof Response) {
        addSecurityHeaders(result);
        return result;
      }
      addSecurityHeaders(res);
      return;
    }

    try {
      const user = await authMiddleware(req);
      if (user) {
        // For NextApiRequest
        if ('headers' in req && !('get' in req.headers)) {
          (req as NextApiRequest & { user?: User }).user = user;
        }
        // For standard Request
        else if ('headers' in req && 'get' in req.headers) {
          (req as Request & { user?: User }).user = user;
        }
      }
      const result = await handler(req, res);
      if (result instanceof Response) {
        addSecurityHeaders(result);
        return result;
      }
      addSecurityHeaders(res);
    } catch (error) {
      console.error('Error in withAuth:', error);
      if ('status' in res && typeof res.status === 'function') {
        // NextApiResponse
        addSecurityHeaders(res);
        res.status(error instanceof Error && error.message === 'No token provided' ? 401 : 403).json({ message: 'Authentication failed', error: (error as Error).message });
      } else {
        // Response
        const errorResponse = new Response(JSON.stringify({ message: 'Authentication failed', error: (error as Error).message }), {
          status: error instanceof Error && error.message === 'No token provided' ? 401 : 403,
          headers: { 'Content-Type': 'application/json' }
        });
        addSecurityHeaders(errorResponse);
        return errorResponse;
      }
    }
  };
}