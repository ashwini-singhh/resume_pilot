// [RESUME_SAILOR_SYNC] 2026-04-26 11:32
import '../styles/globals.css';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import * as api from '../lib/api';

// Pages that don't require authentication
const PUBLIC_ROUTES = ['/', '/auth/callback'];



function MyApp({ Component, pageProps }) {
  // ... (rest of the component logic)
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const isPublic = PUBLIC_ROUTES.includes(router.pathname);

      if (!session && !isPublic) {
        router.replace('/');
      } else if (session) {
        try {
          // Use the API helper which handles AppResponse unwrapping
          const { is_onboarded } = await api.getOnboardingStatus(session.user.id);
          
          // Allow /onboarding if they are explicitly asking for a 'new' profile
          const isNewProfileRequest = router.query.new === 'true';
          
          if (!is_onboarded && router.pathname !== '/onboarding' && !isPublic) {
            router.replace('/onboarding');
          } else if (is_onboarded && router.pathname === '/onboarding' && !isNewProfileRequest) {
            router.replace('/dashboard');
          }
        } catch (err) {
          console.error('Error checking onboarding status:', err);
        }
      }
      setLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/');
      } else if (event === 'SIGNED_IN' && session) {
        try {
          const { is_onboarded } = await api.getOnboardingStatus(session.user.id);
          if (!is_onboarded) {
             router.replace('/onboarding');
          } else if (router.pathname === '/' || router.pathname === '/onboarding') {
             router.replace('/dashboard');
          }
        } catch (err) {
          console.error('Error checking onboarding status:', err);
          router.replace('/dashboard');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router.pathname]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#FAFAFA',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'linear-gradient(135deg, #0052FF, #4D7CFF)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 18,
          boxShadow: '0 4px 14px rgba(0,82,255,0.3)',
        }}>R</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>ResumeSailor | Professional AI Resume Builder</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" href="/favicon.png" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
