'use client';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';

const easeOut = [0.16, 1, 0.3, 1];

export default function FinalCTA() {
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <section style={{
      background: 'var(--foreground)',
      padding: '120px 32px',
      position: 'relative',
      overflow: 'hidden',
      textAlign: 'center',
    }}>
      {/* Dot texture */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '28px 28px', pointerEvents: 'none',
      }} />
      {/* Radial glows */}
      <div style={{
        position: 'absolute', top: '-120px', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '400px', borderRadius: '50%',
        background: 'rgba(0,82,255,0.1)', filter: 'blur(100px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-80px', right: '-80px',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'rgba(77,124,255,0.08)', filter: 'blur(80px)', pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', maxWidth: 700, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: easeOut }}
          style={{ marginBottom: 24 }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '6px 18px', borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.05)',
            marginBottom: 8,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#60a5fa',
              animation: 'pulse 2s infinite',
            }} />
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.15em', color: '#93c5fd',
            }}>Get Started Today</span>
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: easeOut, delay: 0.1 }}
          style={{
            fontFamily: 'Calistoga, serif',
            fontSize: 'clamp(2.2rem, 4vw, 4rem)',
            color: '#fff', lineHeight: 1.1,
            margin: '0 0 20px',
          }}
        >
          Stop Guessing.{' '}
          <span style={{
            background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>Start Matching.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: easeOut, delay: 0.2 }}
          style={{
            fontSize: 18, color: 'rgba(255,255,255,0.55)',
            margin: '0 0 48px', lineHeight: 1.7,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Your dream job shouldn't slip away because of a bad resume format.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: easeOut, delay: 0.3 }}
        >
          <button
            onClick={handleLogin}
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
              color: '#fff', border: 'none', borderRadius: 14,
              padding: '18px 48px', fontSize: 17, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0,82,255,0.4)',
              fontFamily: 'Inter, sans-serif',
              transition: 'all 0.2s ease',
              display: 'inline-flex', alignItems: 'center', gap: 10,
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,82,255,0.5)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,82,255,0.4)';
            }}
          >
            Try ResumeSailor Free
            <span style={{
              fontFamily: 'Material Symbols Rounded',
              fontVariationSettings: "'wght' 300",
              fontSize: 22,
            }}>arrow_forward</span>
          </button>

          <p style={{
            marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.35)',
            fontFamily: 'Inter, sans-serif',
          }}>
            Free to start · No credit card required
          </p>
        </motion.div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'relative',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        marginTop: 100, paddingTop: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        maxWidth: 1100, margin: '100px auto 0',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <span style={{
            fontFamily: 'Calistoga, serif', fontSize: 18,
            color: 'rgba(255,255,255,0.7)', letterSpacing: '-0.02em',
          }}>ResumeSailor</span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter, sans-serif', margin: 0 }}>
          © {new Date().getFullYear()} ResumeSailor. Built to get you hired.
        </p>
      </div>
    </section>
  );
}
