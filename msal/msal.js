// msal.js
import { PublicClientApplication } from '@azure/msal-browser';
import {
  APPID,
  AUTHORITY,
} from '@/config/Config';
const msalConfig = {
    auth: {
        clientId: APPID,
        authority: AUTHORITY,
        redirectUri: '/',
      },
      cache: {
          cacheLocation: "localStorage", // This configures where your cache will be stored
          storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
      },
  system: {
    allowNativeBroker: true,
  },
};

// const msalInstance = new PublicClientApplication(msalConfig);

async function initializeMsal() {
  try {
    await msalInstance.initialize();
  } catch (error) {
  }
}

// Create a new MSAL PublicClientApplication instance
const msalInstance = new PublicClientApplication(msalConfig);

// Request object for token acquisition
export { msalInstance , initializeMsal};

