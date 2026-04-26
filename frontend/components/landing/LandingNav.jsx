import { supabase } from '../../lib/supabaseClient';

export default function LandingNav() {
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '0 32px',
      height: '64px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'rgba(250,250,250,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(0,82,255,0.25)',
          overflow: 'hidden',
        }}>
          <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <span style={{ fontFamily: 'Calistoga, serif', fontSize: 20, letterSpacing: '-0.02em', color: 'var(--foreground)' }}>
          ResumeSailor
        </span>
      </div>
      <button
        onClick={handleLogin}
        style={{
          background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
          color: '#fff', border: 'none', borderRadius: 10,
          padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,82,255,0.25)',
          fontFamily: 'Inter, sans-serif',
          transition: 'all 0.2s ease',
        }}
        onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,82,255,0.35)'; }}
        onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,82,255,0.25)'; }}
      >
        Sign In
      </button>
    </nav>
  );
}
