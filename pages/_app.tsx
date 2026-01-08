  // _app.tsx
  import { useEffect, useState } from 'react';
  import { Toaster } from 'react-hot-toast';
  import { QueryClient, QueryClientProvider } from 'react-query';
  import 'react-tooltip/dist/react-tooltip.css';

  import { appWithTranslation, useTranslation } from 'next-i18next';
  import { ThemeProvider } from 'next-themes';
  import type { AppProps } from 'next/app';
  import { useRouter } from 'next/router';
  import AppWithProvider from '@/utils/app/azureAD';
  import { HomeLayout } from '@/components/Home/HomeLayoutNew';
  // ✅ IMPORT INTRODUCTION MODAL
  import Introduction from '@/components/Modals/Introduction';
  import AuthWrapper from '@/components/auth/authWrapper/AuthWrapper';
  import { SpacesProvider } from '@/context/SpacesContext';
  import { NextAuthProvider } from '@/context/provider';
// ✅ ADD THIS
  import '@/utils/i18n';

  import '@/styles/globals.css';
import { wrapper } from '@/store/redux/configureStore';

  function App({ Component, pageProps }: AppProps<{}>) {
    const queryClient = new QueryClient();
    const router = useRouter();

    // ✅ ADD THESE STATES (MINIMAL)
    const [introOpen, setIntroOpen] = useState(false);
    const [runIntro, setRunIntro] = useState(false);

    // ✅ Only run once on app mount (reload / first load)
    const [tempDismiss, setTempDismiss] = useState(false);

    useEffect(() => {
      const checkFlags = () => {
        const hasReadRules = localStorage.getItem('hasReadRules') === 'true';
        const hasReadPrivacy = localStorage.getItem('hasReadPrivacy') === 'true';
        const hasConfirmed = localStorage.getItem('hasConfirmed') === 'true';
        const introDismissed = localStorage.getItem('introDismissed') === 'true';

        if (
          hasReadRules &&
          hasReadPrivacy &&
          hasConfirmed &&
          !introDismissed &&
          !tempDismiss
        ) {
          setIntroOpen(true);
        }
      };

      checkFlags();
      window.addEventListener('storage', checkFlags);
      const interval = setInterval(checkFlags, 500);

      return () => {
        window.removeEventListener('storage', checkFlags);
        clearInterval(interval);
      };
    }, [tempDismiss]);

    if (process.env.NODE_ENV === 'development') {
      console.log = () => {}; // Disable console.log in production
    }
    // ✅ EXISTING WARMUP LOGIC (UNCHANGED)
    useEffect(() => {
      const warmupBackend = async () => {
        try {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
          if (!backendUrl) {
            console.warn('[App]: Backend URL not configured, skipping warmup');
            return;
          }

          const warmupStart = Date.now();

          const response = await fetch(`${backendUrl}/api/warmup`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            // Fire and forget - don't wait for response
            signal: AbortSignal.timeout(10000), // 10 second timeout
          });

          const warmupTime = Date.now() - warmupStart;

          if (response.ok) {
            const data = await response.json();
            console.log(
              `[App]: ✅ Backend warmed up (${warmupTime}ms) - State: ${data.state}`,
            );
          } else {
            console.warn(
              `[App]: ⚠️ Warmup returned ${response.status}, but backend should be warm now`,
            );
          }
        } catch (error: any) {
          // Warmup is best-effort - don't block app if it fails
          if (error.name === 'AbortError') {
            console.log(
              '[App]: ⏱️ Warmup timed out, but backend is likely warming up',
            );
          } else {
            console.warn('[App]: ⚠️ Warmup error (non-critical):', error.message);
          }
        }
      };

      // Start warmup immediately on app load
      warmupBackend();
    }, []); // Run once on mount

    useEffect(() => {
      sessionStorage.setItem('activeInfoTab', 'about');
      if (
        router.pathname === '/' ||
        router.pathname === '/workflows' ||
        router.pathname === '/about' ||
        router.pathname === '/models' ||
        router.pathname === '/faq' ||
        router.pathname === '/help' ||
        router.pathname === '/education' ||
        router.pathname === '/src-app' ||
        router.pathname === '/Unauthenticated'
      ) {
        document.body.classList.add('homeLayout');
      } else {
        document.body.classList.remove('homeLayout');
      }
    }, []);

     const {  props } = wrapper.useWrappedStore(pageProps);
    return (
      <ThemeProvider attribute="class" defaultTheme="light">
        <div>
          <Toaster />
          <QueryClientProvider client={queryClient}>
            <NextAuthProvider>
              <AppWithProvider>
                <AuthWrapper>
                  <SpacesProvider>
                    <HomeLayout>
                      <Component {...props.pageProps} />
                    </HomeLayout>
                    {/* ✅ INTRODUCTION MODAL LOGIC */}
                    {router.pathname === '/' && (
                      <Introduction
                        open={introOpen}
                        setOpen={setIntroOpen}
                        setRun={setRunIntro}
                        setTempDismiss={setTempDismiss}
                      />
                    )}
                  </SpacesProvider>
                </AuthWrapper>
              </AppWithProvider>
            </NextAuthProvider>
          </QueryClientProvider>
        </div>
      </ThemeProvider>
    );
  }

  export default appWithTranslation(App);
