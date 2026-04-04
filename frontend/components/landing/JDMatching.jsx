'use client';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';

const easeOut = [0.16, 1, 0.3, 1];

const steps = [
  {
    step: '01',
    icon: 'content_paste',
    title: 'Paste the Job Description',
    desc: 'Drop any job posting into ResumePilot — company, role, requirements, all of it.',
    color: '#0052FF',
  },
  {
    step: '02',
    icon: 'compare_arrows',
    title: 'AI Aligns Your Resume',
    desc: "The system maps your experience to the role's exact requirements and language.",
    color: '#8b5cf6',
  },
  {
    step: '03',
    icon: 'target',
    title: 'Gap Report Generated',
    desc: 'See which skills are a strong match, which are missing, and what to emphasize.',
    color: '#f59e0b',
  },
  {
    step: '04',
    icon: 'task_alt',
    title: 'Apply with Confidence',
    desc: 'Submit a resume built for this specific job — not a one-size-fits-all template.',
    color: '#22c55e',
  },
];

export default function JDMatching() {
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
          }}>JD Matching</span>
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: easeOut, delay: 0.1 }}
        style={{
          fontFamily: 'Calistoga, serif',
          fontSize: 'clamp(2rem, 3vw, 3rem)',
          textAlign: 'center', color: 'var(--foreground)',
          margin: '0 0 14px', lineHeight: 1.1,
        }}
      >
        Tailored for{' '}
        <span style={{
          background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>Every Job.</span>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: easeOut, delay: 0.15 }}
        style={{
          textAlign: 'center', fontSize: 17, color: 'var(--muted-foreground)',
          maxWidth: 560, margin: '0 auto 64px', lineHeight: 1.7,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        Paste any job description. ResumePilot aligns your resume to the role's exact requirements — language, keywords, and priorities — so you're not applying with a generic version of yourself.
      </motion.p>

      {/* Steps */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16, marginBottom: 56,
      }}>
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: easeOut, delay: i * 0.1 }}
            style={{
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '28px 22px',
              position: 'relative',
              boxShadow: '0 4px 6px rgba(0,0,0,0.04)',
            }}
          >
            {/* Step number watermark */}
            <div style={{
              position: 'absolute', top: 16, right: 18,
              fontFamily: 'Calistoga, serif', fontSize: 52,
              color: `${step.color}10`, lineHeight: 1,
              userSelect: 'none',
            }}>{step.step}</div>

            <div style={{
              width: 44, height: 44, borderRadius: 12, marginBottom: 16,
              background: `${step.color}15`,
              border: `1px solid ${step.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: 'Material Symbols Rounded',
                fontVariationSettings: "'wght' 300",
                fontSize: 20, color: step.color,
              }}>{step.icon}</span>
            </div>

            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: step.color,
              fontFamily: 'JetBrains Mono, monospace', marginBottom: 8,
            }}>Step {step.step}</div>
            <h3 style={{
              fontSize: 15, fontWeight: 700, color: 'var(--foreground)',
              fontFamily: 'Inter, sans-serif', margin: '0 0 8px',
            }}>{step.title}</h3>
            <p style={{
              fontSize: 13, color: 'var(--muted-foreground)',
              lineHeight: 1.6, fontFamily: 'Inter, sans-serif', margin: 0,
            }}>{step.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: easeOut }}
        style={{ textAlign: 'center' }}
      >
        <button
          onClick={handleLogin}
          style={{
            background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
            color: '#fff', border: 'none', borderRadius: 12,
            padding: '14px 32px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,82,255,0.28)',
            fontFamily: 'Inter, sans-serif', transition: 'all 0.2s ease',
          }}
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseOut={e => { e.currentTarget.style.transform = ''; }}
        >
          Optimize My Resume for This Job →
        </button>
        <p style={{ marginTop: 12, fontSize: 13, color: 'var(--muted-foreground)', fontFamily: 'Inter, sans-serif' }}>
          Works with any job posting — LinkedIn, Greenhouse, Lever, company sites.
        </p>
      </motion.div>
    </section>
  );
}
