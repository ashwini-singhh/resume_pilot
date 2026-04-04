'use client';
import { motion } from 'framer-motion';

const easeOut = [0.16, 1, 0.3, 1];

const steps = [
  {
    num: '01',
    icon: 'upload_file',
    title: 'Upload Your Resume',
    desc: 'Drop your existing resume in any format. Our AI reads it instantly.',
    color: '#8b5cf6',
  },
  {
    num: '02',
    icon: 'psychology',
    title: 'AI Analyzes Your Experience',
    desc: 'It maps your skills, accomplishments, and career trajectory in seconds.',
    color: '#0052FF',
  },
  {
    num: '03',
    icon: 'quiz',
    title: 'AI Asks Smart Questions',
    desc: 'Like a real recruiter, it asks targeted questions to uncover hidden strengths.',
    color: '#f59e0b',
  },
  {
    num: '04',
    icon: 'auto_awesome',
    title: 'Resume Gets Optimized',
    desc: "Receive a fully tailored, ATS-ready resume for the exact role you're targeting.",
    color: '#22c55e',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, ease: easeOut, delay: i * 0.15 },
  }),
};

export default function HowItWorks() {
  return (
    <section style={{
      background: 'var(--foreground)',
      padding: '100px 32px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Dot texture */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        pointerEvents: 'none',
      }} />
      {/* Radial glow */}
      <div style={{
        position: 'absolute', top: '-100px', right: '-100px',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'rgba(0,82,255,0.08)',
        filter: 'blur(100px)', pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
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
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.05)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa' }} />
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.15em', color: '#93c5fd',
            }}>How It Works</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: easeOut, delay: 0.1 }}
          style={{
            fontFamily: 'Calistoga, serif',
            fontSize: 'clamp(2rem, 3vw, 3.25rem)',
            textAlign: 'center', color: '#fff',
            margin: '0 0 12px', lineHeight: 1.15,
          }}
        >
          From Upload to{' '}
          <span style={{
            background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>Job-Ready</span>
          {' '}in Minutes
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: easeOut, delay: 0.15 }}
          style={{
            textAlign: 'center', fontSize: 16, color: 'rgba(255,255,255,0.5)',
            maxWidth: 500, margin: '0 auto 72px', lineHeight: 1.7,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Four intelligent steps that turn your raw experience into a perfectly crafted story.
        </motion.p>

        {/* Steps grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 24, position: 'relative',
        }}>
          {steps.map((step, i) => (
            <motion.div
              key={i}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20,
                padding: '32px 24px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Step number watermark */}
              <div style={{
                position: 'absolute', top: 16, right: 20,
                fontFamily: 'Calistoga, serif', fontSize: 64,
                color: 'rgba(255,255,255,0.04)', lineHeight: 1,
                userSelect: 'none',
              }}>{step.num}</div>

              {/* Icon */}
              <div style={{
                width: 52, height: 52, borderRadius: 14, marginBottom: 20,
                background: `linear-gradient(135deg, ${step.color}22, ${step.color}44)`,
                border: `1px solid ${step.color}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  fontFamily: 'Material Symbols Rounded',
                  fontVariationSettings: "'wght' 300",
                  fontSize: 24, color: step.color,
                }}>{step.icon}</span>
              </div>

              <div style={{
                fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
                color: step.color, letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: 10,
              }}>Step {step.num}</div>
              <h3 style={{
                fontSize: 18, fontWeight: 700, color: '#fff',
                fontFamily: 'Inter, sans-serif', margin: '0 0 10px',
              }}>{step.title}</h3>
              <p style={{
                fontSize: 14, color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.6, fontFamily: 'Inter, sans-serif', margin: 0,
              }}>{step.desc}</p>

              {/* Connecting arrow (not on last) */}
              {i < steps.length - 1 && (
                <div style={{
                  display: 'none', // hidden on mobile, shown via grid layout
                }} />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
