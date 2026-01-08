import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  PublicClientApplication, 
  InteractionRequiredAuthError, 
  AccountInfo, 
  BrowserAuthError 
} from "@azure/msal-browser";
import { MsalProvider, useMsal, useIsAuthenticated } from "@azure/msal-react";
import { AZURE_GRAPH_MEMBEROF_URL, AZURE_ADMIN_GROUP_ID, API_TOKEN_EXPIRY, INACTIVITY_TIME } from "./const";
import { User } from '@/types';
import { APPID, AUTHORITY } from '@/config/Config';
import { getBooleanEnv } from "@/utils/app/env";
import { getMetrics, saveMetrics } from './metricData';
import { SendUserLoggedInMetric } from './appinsightsCustomEvents';
import { isDateOlderByOneDay } from '../helper/helper';
import Metrics from '@/types/metrics';
import * as jose from 'jose';
import { useRouter } from 'next/router';
import { setCSRFToken } from './csrf';
import { logInfo, logWarning, logError } from './appinsightsLogging';
import useInactivityChecker from '@/hooks/useInactivityChecker';
import InactivityModal from '@/components/popUps/InactivityModal';
import { trackUserLogin } from './trackUserLogin';


// MSAL configuration
const msalConfig = {
  auth: {
    clientId: APPID,
    authority: AUTHORITY,
    clientSecret: process.env.AUTHAPP_CLIENTID,
    redirectUri: '/',
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    allowNativeBroker: getBooleanEnv(process.env.NEXT_PUBLIC_WAMENABLED || 'true' ),
  }
};

const isTokenExpired = (token: string): boolean => {
  try {
    const decodedToken = jose.decodeJwt(token);
    const currentTime = Math.floor(Date.now() / 1000);
    return decodedToken.exp ? decodedToken.exp < currentTime : true;
  } catch (error) {
    logError("Error decoding token:", error);
    return true;
  }
};

const generateApiToken = async (user: User): Promise<string> => {
  // IMPORTANT: Use NEXT_PUBLIC_JWT_SECRET (build-time) for token generation
  // This must match the secret used during validation in middleware/auth.ts
  // NEXT_PUBLIC vars are embedded at build time and available on client
  const jwtSecret = process.env.NEXT_PUBLIC_JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error("JWT Secret is not set in environment variables");
  }
  
  const secret = new TextEncoder().encode(jwtSecret);
  const alg = 'HS256';

  return await new jose.SignJWT({
    isAdmin: user.isAdmin,
    loggedIn: user.loggedIn,
    email: user.email,
    username: user.username,
    accountId: user.accountId,
    country: user.country,
    serviceLine: user.serviceLine,
    department: user.department
  })
    .setProtectedHeader({ alg })
    .setExpirationTime(`${API_TOKEN_EXPIRY}s`)
    .sign(secret);
};

// Create a new MSAL PublicClientApplication instance
const msalInstance = new PublicClientApplication(msalConfig);
let msalInitialized = false;

msalInstance.initialize().then(() => {
  msalInitialized = true;
}).catch(error => {
  logError("Error initializing MSAL:", error);
});

const isDevelopment = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_AUTH_REQUIRED !== 'true';

// 🔧 Helper to set unique dev username on first load
const initializeDevUsername = () => {
  if (typeof window === 'undefined') return;
  
  let devUsername = localStorage.getItem('dev_username');
  
  if (!devUsername) {
    // Prompt user for their username on first dev setup
    const username = prompt(
      '🔧 Dev Mode: Enter your username for local development\\n(This will be used to create unique agent identities)',
      'developer'
    );
    devUsername = username?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'developer';
    localStorage.setItem('dev_username', devUsername);
    console.log('✅ Dev username set to:', devUsername);
  }
  
  return devUsername;
};

const createDevUser = (): User => {
  // 🔧 Initialize dev username on first call
  const devUsername = initializeDevUsername() || 'developer';
  
  const devEmail = `${devUsername}@dev.local`;
  
  console.log('🔧 [Dev Mode] Creating unique dev user:', devEmail);
  
  return {
    isAdmin: true,
    loggedIn: true,
    email: devEmail,
    username: `${devUsername} (Dev Mode)`,
    accountId: `dev-user-${devUsername}`,
    idToken: 'dev-id-token',
    id: `dev-user-${devUsername}`, // Unique dev user ID for DB tracking
    country: 'India',
    serviceLine: 'Technology & Transformation - EAD: Engineering',
    department: 'Technology & Transformation - EAD: Engineering',
    officeLocation: 'Local'
  };
};

interface UserProfileData {
  country?: string;
  department?: string;
  officeLocation?: string;
  companyName?: string;
  jobTitle?: string;
}

export async function getUserInfo(accessToken: string): Promise<{ 
  userData: any, 
  isAdmin: boolean,
  profileData: UserProfileData 
}> {
  try {
    // Fetch group membership to check admin status
    const memberOfResponse = await fetch(`${AZURE_GRAPH_MEMBEROF_URL}?$select=id&$search="displayName:${process.env.NEXT_PUBLIC_AUTH_ADMIN_GROUP}"`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ConsistencyLevel: 'eventual'
      },
    });
    const userData = await memberOfResponse.json();

    const isAdmin = userData.value?.some((item: any) => item.id === AZURE_ADMIN_GROUP_ID);
    if(userData && userData.value.length !=0){
      localStorage.setItem("userId",userData?.value[0]?.id)
    }

    // Fetch user profile data (country, department, etc.)
    const profileResponse = await fetch(`https://graph.microsoft.com/v1.0/me?$select=country,department,officeLocation,companyName,jobTitle`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const profileData: UserProfileData = await profileResponse.json();


    logInfo("User profile data retrieved", null, {
      country: profileData.country,
      department: profileData.department,
      officeLocation: profileData.officeLocation
    });
   
    return { userData, isAdmin, profileData };
  } catch (error) {
    logError("Error fetching user info:", error);
    // Return default values if profile fetch fails
    return { 
      userData: { value: [] }, 
      isAdmin: false, 
      profileData: {} 
    };
  }
}

// Utility Functions
export const parseServiceLine = (rawServiceLine?: string): string[] => {
  if (!rawServiceLine) return [];

  return rawServiceLine
    .split(/\s*[-–—]\s*/) // -, – or —
    .map(part => part.trim())
    .filter(Boolean)
    .reverse();
};


interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  apiToken: string | null;
  acquireUserInfo: (instance: PublicClientApplication) => Promise<User | void>;
  logout: () => void;
  validateAndRefreshToken: (token: string) => Promise<string | null>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const App: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { instance, inProgress, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [user, setUser] = useState<User | null>(null);
  const [apiToken, setApiToken] = useState<string | null>(null);
  const [isMsalReady, setIsMsalReady] = useState(false);
  const router = useRouter();

  const handleInactive = useCallback(() => {
    logout();
    setIsInactive(false);
  }, []);

  const handleContinue = () => {
    let currentIdToken = user?.idToken;
    validateAndRefreshToken(currentIdToken || null);
    setIsInactive(false);
    resetTimer();      
  };

  const { resetTimer, isInactive, setIsInactive } = useInactivityChecker(INACTIVITY_TIME, () => handleInactive());

  useEffect(() => {
    const checkMsalInitialization = () => {
      if (msalInitialized) {
        setIsMsalReady(true);
      } else {
        setTimeout(checkMsalInitialization, 100);
      }
    };
    checkMsalInitialization();
  }, []);

  const acquireUserInfo = useCallback(async (instance: PublicClientApplication) => {
    const account = instance.getAllAccounts()?.[0] ?? null;
    const request = {
      scopes: ['user.read', 'openid', 'profile', 'email'],
      account: account,
    };

    try {
      const authResult = await instance.acquireTokenSilent(request);
      if (authResult) {
        const userinfo = await getUserInfo(authResult.accessToken);
        
        const parsedServiceLine = parseServiceLine(userinfo.profileData?.department)?.[0];

        // Determine Service Line from department or jobTitle
        let serviceLine =   parsedServiceLine ||
                            userinfo.profileData?.department || 
                            userinfo.profileData?.jobTitle?.split(' ')[0] || 
                            'Unknown';

        const email = account.idTokenClaims?.email as string;

        if (email) {
          const res = await fetch(`/api/secure-users/service-line?email=${encodeURIComponent(email)}`);
          const data = await res.json();
          if (data.success) {
            serviceLine = data.serviceLine;
          }
        }

        const user: User = {
          isAdmin: userinfo.isAdmin,
          loggedIn: true,
          email: account.idTokenClaims?.email as string,
          username: account.name,
          accountId: account.homeAccountId,
          idToken: authResult.idToken,
          id: account.homeAccountId,
          country: userinfo.profileData?.country,
          serviceLine: serviceLine,
          department: userinfo.profileData?.department,
          officeLocation: userinfo.profileData?.officeLocation
        };

        if(user && user.id){
          localStorage.setItem("userId",user.id)
        }

        // Store user profile data in localStorage for easy access
        if (user.country) {
          localStorage.setItem("userCountry", user.country);
        }
        if (user.serviceLine) {
          localStorage.setItem("userServiceLine", user.serviceLine);
        }
        if (user.department) {
          localStorage.setItem("userDepartment", user.department);
        }
        
        // Log final user object for debugging
        console.log('✅ User Profile Setup Complete:', {
          email: user.email,
          username: user.username,
          country: user.country || '❌ Not set',
          serviceLine: user.serviceLine,
          department: user.department || '❌ Not set',
          officeLocation: user.officeLocation || '❌ Not set',
          isAdmin: user.isAdmin
        });
        
        setUser(user);

        // Store user object in localStorage for auth headers
        localStorage.setItem('user', JSON.stringify(user));

        // 🔥 Track user login in database
        await trackUserLogin({
          username: user.username,
          email: user.email!,
          azureAdId: user.id!,
          serviceLine: user.serviceLine,
          country: user.country,
          department: user.department,
          officeLocation: user.officeLocation,
          isAdmin: user.isAdmin,
        });

        // Generate and set the new API token
        const newApiToken = await generateApiToken(user);
        setApiToken(newApiToken);

        // Store API token in localStorage and as a cookie
        localStorage.setItem('api_token', newApiToken);
        document.cookie = `api_token=${newApiToken}; max-age=${API_TOKEN_EXPIRY}; path=/; secure; samesite=strict`;
        setCSRFToken();

        let savedMetrics = getMetrics();
        if (isDateOlderByOneDay(savedMetrics?.LoggedInDate, new Date())) {
          savedMetrics = {
            SendLoggedIn: false,
            LoggedInDate: new Date()
          } as Metrics;
        }

        if (!(savedMetrics?.SendLoggedIn)) {
          savedMetrics = {
            SendLoggedIn: true,
            LoggedInDate: new Date()
          } as Metrics;
          SendUserLoggedInMetric(user);
          saveMetrics(savedMetrics);
        }

        return user;
      }
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError || error instanceof BrowserAuthError) {
        await instance.loginRedirect(request);
      } else {
        logError("Error acquiring token:", error);
        throw error;
      }
    }
  }, []);

  useEffect(() => {
    if (!isMsalReady) return;

    if (isDevelopment && !user) {
      const setupDevUser = async () => {
        const devUser = createDevUser();
        setUser(devUser);
        
        // Store user ID
        if (devUser.id) {
          localStorage.setItem("userId", devUser.id);
        }
        
        // Store user profile data in localStorage
        if (devUser.country) {
          localStorage.setItem("userCountry", devUser.country);
        }
        if (devUser.serviceLine) {
          localStorage.setItem("userServiceLine", devUser.serviceLine);
        }
        if (devUser.department) {
          localStorage.setItem("userDepartment", devUser.department);
        }
        
        // 🔥 Track dev user login in database (for testing)
        try {
          await trackUserLogin({
            username: devUser.username,
            email: devUser.email!,
            azureAdId: devUser.id!,
            serviceLine: devUser.serviceLine,
            country: devUser.country,
            department: devUser.department,
            officeLocation: devUser.officeLocation,
            isAdmin: devUser.isAdmin,
          });
          console.log('✅ Dev user tracked in database');
        } catch (error) {
          console.warn('⚠️ Could not track dev user (expected in dev mode):', error);
        }
        
        // Generate and store API token
        try {
          const newApiToken = await generateApiToken(devUser);
          setApiToken(newApiToken);
          localStorage.setItem('api_token', newApiToken);
          document.cookie = `api_token=${newApiToken}; max-age=${API_TOKEN_EXPIRY}; path=/; secure; samesite=strict`;
          logInfo("Development user setup complete", devUser);
        } catch (error) {
          logError("Error generating dev API token:", error);
        }
      };
      
      setupDevUser();
    } else if (!isDevelopment) {
      const handleAuth = async () => {
        if (inProgress === "none") {
          if (!isAuthenticated || !user) {
            try {
              await acquireUserInfo(instance as PublicClientApplication);
            } catch (error) {
              logError("Authentication error:", error);
              router.push("/unAuthenticated");
            }
          }
        }
      };

      handleAuth();
    }
  }, [isMsalReady, isAuthenticated, inProgress, instance, router, acquireUserInfo, user]);

  useEffect(() => {
    if (!isDevelopment && isMsalReady && accounts.length > 0 && !user) {
      acquireUserInfo(instance as PublicClientApplication);
    }
    else if (isDevelopment && !user) {
      const setupDevUser = async () => {
        const devUser = createDevUser();
        setUser(devUser);
        
        // Store user ID
        if (devUser.id) {
          localStorage.setItem("userId", devUser.id);
        }
        
        // Store user profile data in localStorage
        if (devUser.country) {
          localStorage.setItem("userCountry", devUser.country);
        }
        if (devUser.serviceLine) {
          localStorage.setItem("userServiceLine", devUser.serviceLine);
        }
        if (devUser.department) {
          localStorage.setItem("userDepartment", devUser.department);
        }
        
        // 🔥 Track dev user login in database (for testing)
        try {
          await trackUserLogin({
            username: devUser.username,
            email: devUser.email!,
            azureAdId: devUser.id!,
            serviceLine: devUser.serviceLine,
            country: devUser.country,
            department: devUser.department,
            officeLocation: devUser.officeLocation,
            isAdmin: devUser.isAdmin,
          });
          console.log('✅ Dev user tracked in database');
        } catch (error) {
          console.warn('⚠️ Could not track dev user (expected in dev mode):', error);
        }
        
        // Generate and store API token
        try {
          const newApiToken = await generateApiToken(devUser);
          setApiToken(newApiToken);
          localStorage.setItem('api_token', newApiToken);
          document.cookie = `api_token=${newApiToken}; max-age=${API_TOKEN_EXPIRY}; path=/; secure; samesite=strict`;
          logInfo("Development user setup complete", devUser);
        } catch (error) {
          logError("Error generating dev API token:", error);
        }
      };
      
      setupDevUser();
    }
  }, [isMsalReady, accounts, user, instance, acquireUserInfo]);

  const logout = useCallback(async () => {
    const account = instance.getAllAccounts()?.[0] ?? null;

    // Clear local storage and session storage
    localStorage.clear();
    sessionStorage.clear();
    let logoutUrl = '';
    if (account) {
      try {
        // Fetch the OpenID Connect metadata
        const metadataResponse = await fetch(`${process.env.NEXT_PUBLIC_AUTHORITY}/v2.0/.well-known/openid-configuration`);
        const metadata = await metadataResponse.json();

        // Get the end_session_endpoint
        const endSessionEndpoint = metadata.end_session_endpoint;

        if (endSessionEndpoint) {
          // Construct the logout URL
          logoutUrl = `${endSessionEndpoint}?post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}`;
        } else {
          logError('End session endpoint not found in metadata');
          logoutUrl = `${window.location.origin}/.auth/logout?post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}`;
        }
      } catch (error) {
        logError('Error during logout:', error);
        logoutUrl = `${window.location.origin}/.auth/logout?post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}`;
      }
    } else {
      logoutUrl = `${window.location.origin}/.auth/logout?post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}`;
    }

    setApiToken(null);
    localStorage.removeItem('api_token');
    localStorage.removeItem('userId');
    document.cookie = 'api_token=; max-age=0; path=/; secure; samesite=strict';

    window.location.href = logoutUrl;
  }, [instance]);

  const validateAndRefreshToken = useCallback(async (storedIdToken: string | null): Promise<string | null> => {
    try {
      if (process.env.NODE_ENV === 'development') {
          return null;
      }
      const refreshIdToken = async () => {
        if (!storedIdToken || isTokenExpired(storedIdToken)) {
          const account = instance.getAllAccounts()?.[0] ?? null;
          if (!account) {
            logWarning("No account found");
            throw new Error("No account found");
          }

          const request = {
            scopes: ['user.read', 'openid', 'profile', 'email'],
            account: account,
          };

          try {
            const authResult = await instance.acquireTokenSilent(request);
            if (authResult) {
              await setUser(prevUser => prevUser ? { ...prevUser, idToken: authResult.idToken } : null);
              return authResult.idToken;
            }
          } catch (error) {
            if (error instanceof InteractionRequiredAuthError) {
              logWarning("User interaction required to refresh ID token");
              await instance.loginRedirect(request);
            } else {
              logError("Error refreshing ID token:", error);
              throw error;
            }
          }
        }
        return storedIdToken;
      };

      const refreshApiToken = async () => {
        const apiTokenCookie = document.cookie.split(';').find(c => c.trim().split('=')[0] === 'api_token');
        const apiToken = apiTokenCookie ? apiTokenCookie.split('=')[1] : null;

        const storedApiToken = apiToken;
        if (!storedApiToken || isTokenExpired(storedApiToken)) {
          const currentUser = user;

            if (currentUser) {
              try {
                const newApiToken = await generateApiToken(currentUser);
                await setApiToken(newApiToken);
                localStorage.setItem('api_token', newApiToken);
                document.cookie = `api_token=${newApiToken}; max-age=${API_TOKEN_EXPIRY}; path=/; secure; samesite=strict`;
              } catch (error) {
                logError("Error generating API token:", error);
              throw error;
            }
          } else {
            logWarning("No user data available to generate API token");
          }
        }
      };

      const newIdToken = await refreshIdToken();
      await refreshApiToken();

      return newIdToken;
    } catch (error) {
      throw error;
    }
  }, [instance]);

  return (
    <AuthContext.Provider value={{
      isAuthenticated: isDevelopment || !!user?.loggedIn,
      user,
      apiToken,
      acquireUserInfo,
      logout,
      validateAndRefreshToken
    }}>
      <div>
        <InactivityModal 
          isOpen={isInactive} 
          onContinue={handleContinue} 
          onLogout={handleInactive} 
        />
        {isDevelopment || user?.loggedIn ? children : null}
      </div>
    </AuthContext.Provider>
  );
};

interface AuthFlowProps {
  children: React.ReactNode;
}

const AppWithProvider: React.FC<AuthFlowProps> = ({ children }) => {
  const [isMsalInitialized, setIsMsalInitialized] = useState(false);

  useEffect(() => {
    msalInstance.initialize().then(() => {
      setIsMsalInitialized(true);
    }).catch(error => {
      logError("Error initializing MSAL:", error);
    });
  }, []);

  if (!isMsalInitialized) {
    return <div>Initializing authentication...</div>;
  }

  return (
    <MsalProvider instance={msalInstance}>
      <App>{children}</App>
    </MsalProvider>
  );
};

export default AppWithProvider;