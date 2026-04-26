'use client';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';

const easeOut = [0.16, 1, 0.3, 1];

const points = [
  {
    icon: 'mail_outline',
    title: '50+ applications, no response',
    desc: 'You put in the hours, but get nothing but silence. You are likely being filtered by ATS bots before a human ever sees your name.',
    color: '#ef4444',
  },
  {
    icon: 'chat_bubble_outline',
    title: 'Using ChatGPT, still getting rejected',
    desc: 'Generic AI suggestions are easy to spot. Recruiter-facing AI can tell when your bullets are hallucinated fluff.',
    color: '#f59e0b',
  },
  {
    icon: 'help_outline',
    title: 'Not knowing what is wrong',
    desc: 'Applying blind is guesswork. Without a match score, you have no way to know why you were passed over.',
    color: '#8b5cf6',
  },
  {
    icon: 'content_copy',
    title: 'Sending same resume everywhere',
    desc: 'The "spray and pray" method is dead. Modern hiring requires deep JD matching for every single role.',
    color: '#0052FF',
  },
];

export default function WhyMoreInterviews() {
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <section style={{ padding: '100px 32px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Label */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: easeOut }}
        style={{ textAlign: 'center', marginBottom: 20 }}
      >
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '6px 18px', borderRadius: 999,
          border: '1px solid rgba(0,82,255,0.3)',
          background: 'rgba(0,82,255,0.05)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--accent)',
          }}>The Real Edge</span>
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: easeOut, delay: 0.1 }}
        style={{
          fontFamily: 'Calistoga, serif',
          fontSize: 'clamp(2rem, 3vw, 3.25rem)',
          textAlign: 'center', color: 'var(--foreground)',
          margin: '0 0 14px', lineHeight: 1.1,
        }}
      >
        The Hidden Truth About{' '}
        <span style={{
          background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>Modern Hiring.</span>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: easeOut, delay: 0.15 }}
        style={{
          textAlign: 'center', fontSize: 17, color: 'var(--muted-foreground)',
          maxWidth: 520, margin: '0 auto 64px', lineHeight: 1.7,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        The difference between getting screened in and screened out is rarely talent. It's visibility.
      </motion.p>

      {/* Four points grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 20, marginBottom: 64,
      }}>
        {points.map((pt, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: easeOut, delay: i * 0.1 }}
            style={{
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '28px 24px',
              borderTop: `3px solid ${pt.color}`,
              boxShadow: '0 4px 6px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12, marginBottom: 16,
              background: `${pt.color}12`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: 'Material Symbols Rounded',
                fontVariationSettings: "'wght' 300",
                fontSize: 22, color: pt.color,
              }}>{pt.icon}</span>
            </div>
            <h3 style={{
              fontSize: 15, fontWeight: 700, color: 'var(--foreground)',
              fontFamily: 'Inter, sans-serif', margin: '0 0 8px',
            }}>{pt.title}</h3>
            <p style={{
              fontSize: 13, color: 'var(--muted-foreground)',
              lineHeight: 1.6, fontFamily: 'Inter, sans-serif', margin: 0,
            }}>{pt.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Standout statement */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: easeOut }}
        style={{
          textAlign: 'center',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
          borderRadius: 24, padding: '48px 40px',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Dot texture overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '24px 24px', pointerEvents: 'none',
        }} />

        <p style={{
          fontFamily: 'Calistoga, serif',
          fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
          color: '#fff', margin: '0 0 8px',
          position: 'relative', lineHeight: 1.2,
        }}>
          That's how you stand out.
        </p>
        <p style={{
          fontSize: 16, color: 'rgba(255,255,255,0.75)',
          fontFamily: 'Inter, sans-serif', margin: '0 0 36px',
          position: 'relative',
        }}>
          Stop applying and hoping. Start applying and knowing.
        </p>
        <button
          onClick={handleLogin}
          style={{
            background: '#fff',
            color: 'var(--accent)', border: 'none', borderRadius: 12,
            padding: '14px 36px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            fontFamily: 'Inter, sans-serif', transition: 'all 0.2s ease',
            position: 'relative',
          }}
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.25)'; }}
          onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'; }}
        >
          Check My Match Score — Free →
        </button>
      </motion.div>
    </section>
  );
}
