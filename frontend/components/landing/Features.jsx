'use client';
import { motion } from 'framer-motion';

const easeOut = [0.16, 1, 0.3, 1];

const features = [
  {
    icon: 'psychology',
    title: 'Understands You Better',
    desc: 'AI asks targeted questions before improving—no generic output.',
    color: '#8b5cf6',
  },
  {
    icon: 'ads_click',
    title: 'Role-Specific Optimization',
    desc: 'Tailor your resume for any job posting instantly with intelligent keyword mapping.',
    color: '#0052FF',
  },
  {
    icon: 'verified',
    title: 'ATS-Optimized Output',
    desc: 'Built to pass applicant tracking systems at top companies.',
    color: '#22c55e',
  },
  {
    icon: 'auto_fix_high',
    title: 'Context-Aware Improvements',
    desc: 'Uses your actual answers—not guesses—to craft compelling bullet points.',
    color: '#f59e0b',
  },
  {
    icon: 'bolt',
    title: 'Lightning Fast',
    desc: 'From upload to optimized resume in minutes, not hours.',
    color: '#ec4899',
  },
  {
    icon: 'folder_copy',
    title: 'Manage Multiple Resumes',
    desc: 'Keep different resumes for different roles and companies, all in one place.',
    color: '#14b8a6',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, ease: easeOut, delay: i * 0.08 },
  }),
};

export default function Features() {
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
          }}>Features</span>
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
          textAlign: 'center', color: 'var(--foreground)',
          margin: '0 0 12px', lineHeight: 1.15,
        }}
      >
        Everything You Need to{' '}
        <span style={{
          background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>Land the Role</span>
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: easeOut, delay: 0.15 }}
        style={{
          textAlign: 'center', fontSize: 16, color: 'var(--muted-foreground)',
          maxWidth: 500, margin: '0 auto 64px', lineHeight: 1.7,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        Six powerful capabilities that make your resume an unfair advantage.
      </motion.p>

      {/* Feature grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 24,
      }}>
        {features.map((f, i) => (
          <motion.div
            key={i}
            custom={i}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            style={{
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '28px 24px',
              cursor: 'default',
              boxShadow: '0 4px 6px rgba(0,0,0,0.04)',
              transition: 'box-shadow 0.2s ease',
            }}
          >
            {/* Icon */}
            <div style={{
              width: 48, height: 48, borderRadius: 12, marginBottom: 20,
              background: `linear-gradient(135deg, ${f.color}, ${f.color}cc)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 12px ${f.color}33`,
            }}>
              <span style={{
                fontFamily: 'Material Symbols Rounded',
                fontVariationSettings: "'wght' 300",
                fontSize: 22, color: '#fff',
              }}>{f.icon}</span>
            </div>

            <h3 style={{
              fontSize: 16, fontWeight: 700, color: 'var(--foreground)',
              fontFamily: 'Inter, sans-serif', margin: '0 0 8px',
            }}>{f.title}</h3>
            <p style={{
              fontSize: 14, color: 'var(--muted-foreground)',
              lineHeight: 1.6, fontFamily: 'Inter, sans-serif', margin: 0,
            }}>{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
