import '../styles/globals.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

// Pages that don't require authentication
const PUBLIC_ROUTES = ['/', '/auth/callback'];

function MyApp({ Component, pageProps }) {
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
          // Add cache busting to prevent stale status redirect loops
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/user/${session.user.id}/onboarding-status?t=${Date.now()}`);
          const { is_onboarded } = await res.json();
          
          if (!is_onboarded && router.pathname !== '/onboarding' && !isPublic) {
            router.replace('/onboarding');
          } else if (is_onboarded && router.pathname === '/onboarding') {
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
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/user/${session.user.id}/onboarding-status?t=${Date.now()}`);
          const { is_onboarded } = await res.json();
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

  return <Component {...pageProps} />;
}

export default MyApp;
