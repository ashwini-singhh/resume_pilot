'use client';
import { motion } from 'framer-motion';

const easeOut = [0.16, 1, 0.3, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOut } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const points = [
  {
    icon: '❌',
    label: 'What others do',
    items: ['Generic rewriting', 'No personalization', 'No context, no questions', 'Same resume, every job'],
    accent: '#ef4444',
    bg: 'rgba(239,68,68,0.04)',
    border: 'rgba(239,68,68,0.15)',
  },
  {
    icon: '🤖',
    label: 'How this AI works',
    items: [
      'Asks you questions first',
      'Learns your real experience',
      'Understands context deeply',
      'Tailors for every role',
    ],
    accent: 'var(--accent)',
    bg: 'rgba(0,82,255,0.04)',
    border: 'rgba(0,82,255,0.2)',
    featured: true,
  },
];

export default function ValueProp() {
  return (
    <section style={{
      padding: '100px 32px',
      maxWidth: 1100,
      margin: '0 auto',
    }}>
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* Section label */}
        <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 20 }}>
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
            }}>The Difference</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h2 variants={fadeUp} style={{
          fontFamily: 'Calistoga, serif',
          fontSize: 'clamp(2rem, 3vw, 3.25rem)',
          textAlign: 'center',
          color: 'var(--foreground)',
          margin: '0 0 16px',
          lineHeight: 1.15,
        }}>
          Not Just AI.{' '}
          <span style={{
            background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>An AI That Understands You.</span>
        </motion.h2>

        <motion.p variants={fadeUp} style={{
          textAlign: 'center', fontSize: 17, color: 'var(--muted-foreground)',
          maxWidth: 560, margin: '0 auto 64px', lineHeight: 1.7,
          fontFamily: 'Inter, sans-serif',
        }}>
          Most AI tools rewrite blindly. Ours interviews you like a recruiter, then crafts a resume built around your actual story.
        </motion.p>

        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {points.map((point, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              style={{
                background: point.featured
                  ? 'linear-gradient(135deg, var(--accent), var(--accent-secondary))'
                  : point.bg,
                border: `1px solid ${point.border}`,
                borderRadius: 20,
                padding: 2,
              }}
            >
              <div style={{
                background: point.featured ? '#fff' : 'transparent',
                borderRadius: 18,
                padding: '32px 28px',
                height: '100%',
              }}>
                <div style={{ fontSize: 28, marginBottom: 16 }}>{point.icon}</div>
                <div style={{
                  fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: point.accent,
                  marginBottom: 20, fontFamily: 'JetBrains Mono, monospace',
                }}>{point.label}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {point.items.map((item, j) => (
                    <li key={j} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 0',
                      borderBottom: j < point.items.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                      fontSize: 15, color: 'var(--foreground)',
                      fontFamily: 'Inter, sans-serif',
                    }}>
                      <span style={{
                        color: point.featured ? 'var(--accent)' : point.accent,
                        fontWeight: 700, fontSize: 16,
                      }}>{point.featured ? '✓' : '✗'}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
