'use client';
import { motion } from 'framer-motion';

const easeOut = [0.16, 1, 0.3, 1];

const others = [
  'Generic suggestions',
  'No resume scoring',
  'No JD matching',
  'Hallucinates missing skills',
];

const ours = [
  'Objective resume scoring',
  'Deep JD matching',
  'Section-level insights',
  'AI asks clarifying questions',
];

export default function Comparison() {
  return (
    <section style={{
      background: 'var(--muted)',
      padding: '100px 32px',
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
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
            }}>Why Us</span>
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
            margin: '0 0 56px', lineHeight: 1.15,
          }}
        >
          A Different Kind of{' '}
          <span style={{
            background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>Intelligence</span>
        </motion.h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Others column */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: easeOut }}
            style={{
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '32px 28px',
            }}
          >
            <div style={{
              fontSize: 13, fontWeight: 700, color: '#ef4444',
              fontFamily: 'JetBrains Mono, monospace',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              marginBottom: 24,
            }}>❌ Other Tools</div>
            {others.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 0',
                borderBottom: i < others.length - 1 ? '1px solid var(--border)' : 'none',
                fontFamily: 'Inter, sans-serif',
              }}>
                <span style={{ color: '#ef4444', marginTop: 2, fontWeight: 700 }}>✗</span>
                <span style={{ fontSize: 15, color: 'var(--muted-foreground)' }}>{item}</span>
              </div>
            ))}
          </motion.div>

          {/* Ours column */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: easeOut, delay: 0.1 }}
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
              borderRadius: 22, padding: 2,
            }}
          >
            <div style={{
              background: '#fff', borderRadius: 20,
              padding: '32px 28px', height: '100%',
            }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: 'var(--accent)',
                fontFamily: 'JetBrains Mono, monospace',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                marginBottom: 24,
              }}>✓ ResumeSailor</div>
              {ours.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 0',
                  borderBottom: i < ours.length - 1 ? '1px solid var(--border)' : 'none',
                  fontFamily: 'Inter, sans-serif',
                }}>
                  <span style={{
                    color: 'var(--accent)', marginTop: 2, fontWeight: 700,
                  }}>✓</span>
                  <span style={{ fontSize: 15, color: 'var(--foreground)', fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
