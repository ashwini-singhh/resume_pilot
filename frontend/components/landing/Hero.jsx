'use client';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';

const easeOut = [0.16, 1, 0.3, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOut } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

function FloatingCard({ style, children }) {
  return (
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        background: '#fff',
        borderRadius: 16,
        border: '1px solid var(--border)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        padding: '16px 20px',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

export default function Hero() {
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      padding: '120px 32px 80px',
      maxWidth: 1200,
      margin: '0 auto',
      gap: 64,
    }}>
      {/* Left: Text */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        style={{ flex: '1.1', minWidth: 0 }}
      >
        {/* Section badge */}
        <motion.div variants={fadeUp}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '6px 18px', borderRadius: 999,
            border: '1px solid rgba(0,82,255,0.3)',
            background: 'rgba(0,82,255,0.05)',
            marginBottom: 32,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--accent)',
              animation: 'pulse 2s infinite',
            }} />
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11, fontWeight: 500,
              textTransform: 'uppercase', letterSpacing: '0.15em',
              color: 'var(--accent)',
            }}>AI-Powered · Match Score · GitHub Integration</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1 variants={fadeUp} style={{
          fontFamily: 'Calistoga, serif',
          fontSize: 'clamp(2.75rem, 5vw, 5.25rem)',
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          color: 'var(--foreground)',
          margin: '0 0 24px',
        }}>
          Stop Sending{' '}
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}>the Same</span>
            <span style={{
              position: 'absolute', bottom: '-0.25rem', left: 0,
              height: '0.6rem', width: '100%', borderRadius: 2,
              background: 'linear-gradient(to right, rgba(0,82,255,0.15), rgba(77,124,255,0.08))',
            }} />
          </span>
          <br />Resume Everywhere.
        </motion.h1>

        {/* Sub-headline */}
        <motion.p variants={fadeUp} style={{
          fontSize: 20, color: 'var(--foreground)',
          fontWeight: 600, margin: '0 0 12px',
          fontFamily: 'Inter, sans-serif',
        }}>
          ResumeSailor analyzes your resume, matches it to job descriptions, and shows exactly what to fix.
        </motion.p>
        <motion.p variants={fadeUp} style={{
          fontSize: 16, color: 'var(--muted-foreground)',
          lineHeight: 1.7, margin: '0 0 40px',
          maxWidth: 520, fontFamily: 'Inter, sans-serif',
        }}>
          Paste a job description, answer a few targeted questions, and get a role-specific resume with a real match score — so you apply with confidence, not guesswork.
        </motion.p>

        {/* CTA */}
        <motion.div variants={fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
          <button
            onClick={handleLogin}
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
              color: '#fff', border: 'none', borderRadius: 12,
              padding: '16px 36px', fontSize: 16, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,82,255,0.3)',
              fontFamily: 'Inter, sans-serif',
              transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,82,255,0.4)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,82,255,0.3)'; }}
          >
            Start Free
          </button>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)', fontFamily: 'Inter, sans-serif', margin: 0 }}>
            ✓ ResumeSailor · ✓ Real match score · ✓ Role-specific output
          </p>
        </motion.div>
      </motion.div>

      {/* Right: Abstract floating UI graphic */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, ease: easeOut, delay: 0.3 }}
        style={{
          flex: '0.9',
          position: 'relative',
          height: 520,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Background glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at center, rgba(0,82,255,0.08) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />

        {/* Rotating ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            width: 380, height: 380,
            borderRadius: '50%',
            border: '1.5px dashed rgba(0,82,255,0.2)',
          }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            width: 460, height: 460,
            borderRadius: '50%',
            border: '1px dashed rgba(0,82,255,0.1)',
          }}
        />

        {/* Base card */}
        <div style={{
          width: 300,
          background: '#fff',
          borderRadius: 20,
          border: '1px solid var(--border)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
          padding: 24,
          zIndex: 2,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontSize: 18, fontFamily: 'Material Symbols Rounded', fontVariationSettings: "'wght' 300" }}>description</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--foreground)', fontFamily: 'Inter, sans-serif' }}>Resume Optimized</div>
              <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'Inter, sans-serif' }}>ATS Score: 94/100</div>
            </div>
          </div>

          {/* Progress bars */}
          {[{ label: 'ATS Compatibility', val: 94, color: '#22c55e' },
            { label: 'Keyword Match', val: 87, color: 'var(--accent)' },
            { label: 'Impact Score', val: 91, color: '#8b5cf6' }].map(item => (
            <div key={item.label} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'Inter, sans-serif' }}>{item.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: item.color, fontFamily: 'Inter, sans-serif' }}>{item.val}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--muted)', borderRadius: 3, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.val}%` }}
                  transition={{ duration: 1.2, ease: easeOut, delay: 0.8 }}
                  style={{ height: '100%', background: item.color, borderRadius: 3 }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Floating card: AI question */}
        <FloatingCard style={{
          position: 'absolute', top: 40, right: -20,
          width: 200, zIndex: 3,
          animationDelay: '0s',
        }}>
          <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginBottom: 6, fontFamily: 'Inter, sans-serif' }}>🤖 AI asks:</div>
          <div style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.5, fontFamily: 'Inter, sans-serif' }}>
            "What was the business impact of your last project?"
          </div>
        </FloatingCard>

        {/* Floating card: Match */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          style={{
            position: 'absolute', bottom: 60, left: -30,
            width: 180, zIndex: 3,
            background: '#fff', borderRadius: 12,
            border: '1px solid var(--border)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            padding: '12px 16px',
          }}
        >
          <div style={{ fontSize: 18, marginBottom: 4 }}>🎯</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)', fontFamily: 'Inter, sans-serif' }}>Job Match: 94%</div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'Inter, sans-serif' }}>Senior Engineer @ Google</div>
        </motion.div>
      </motion.div>
    </section>
  );
}
