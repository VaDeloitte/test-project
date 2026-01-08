// require('dotenv').config(); // Load environment variables from .env
// const appid = process.env.APPID;
// const auth = process.env.AUTHORITY;
// const config = {
//     appId: 'bac1286c-01a3-43b2-a19a-f7612ef2dfbf',
//     redirectUrl: '/',
//     scopes: [
//         'user.read'
//     ],
//     authority: 'https://login.microsoftonline.com/36da45f1-dd2c-4d1f-af13-5abe46b99921'
// }

// export default config;
// require('dotenv').config({path:'complete_path/.env'}) 
// Fallback to hardcoded values if env vars not available (for production builds)
export const APPID = process.env.NEXT_PUBLIC_APPID || 'e3e5bdef-e3c0-44c0-b131-81ba036a00ac';

export const AUTHORITY = process.env.NEXT_PUBLIC_AUTHORITY || 'https://login.microsoftonline.com/36da45f1-dd2c-4d1f-af13-5abe46b99921';

