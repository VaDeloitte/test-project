export const authConfig = {
  appId: process.env.NEXT_PUBLIC_APPID,
  redirectUrl: '/',
  scopes: [
  'user.read'
  ],
  authority: 'https://login.microsoftonline.com/36da45f1-dd2c-4d1f-af13-5abe46b99921'
}
