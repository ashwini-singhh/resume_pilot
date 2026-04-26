'use client';
import { motion } from 'framer-motion';

const easeOut = [0.16, 1, 0.3, 1];

const testimonials = [
  {
    quote: "Got 3 interviews in a week after fixing the impact metrics ResumeSailor highlighted.",
    name: "Sarah M.",
    role: "Software Engineer",
    result: "3 Interviews in 1 week",
  },
  {
    quote: "ChatGPT gave me generic fluff. This actually told me why I was failing the ATS screens.",
    name: "David K.",
    role: "Product Manager",
    result: "Landed Google Interview",
  },
  {
    quote: "The Job Description matching is magic. It saw missing keywords I completely overlooked.",
    name: "Elena R.",
    role: "Data Analyst",
    result: "Got hired at Stripe",
  }
];

export default function Testimonials() {
  return (
    <section style={{ padding: '100px 32px', maxWidth: 1100, margin: '0 auto' }}>
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
          }}>Testimonials</span>
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
          margin: '0 0 64px', lineHeight: 1.1,
        }}
      >
        Real Results from{' '}
        <span style={{
          background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>Real Users.</span>
      </motion.h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 24,
      }}>
        {testimonials.map((t, i) => (
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
              padding: '32px 28px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: 20,
              background: 'rgba(34, 197, 94, 0.1)',
              color: '#16a34a',
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace',
              marginBottom: 16,
              textTransform: 'uppercase',
            }}>
              {t.result}
            </div>
            <p style={{
              fontSize: 16, color: 'var(--foreground)',
              lineHeight: 1.6, fontFamily: 'Inter, sans-serif',
              margin: '0 0 24px', fontStyle: 'italic',
            }}>
              "{t.quote}"
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'var(--muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, color: 'var(--accent)', fontSize: 14,
              }}>
                {t.name[0]}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', fontFamily: 'Inter, sans-serif' }}>{t.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', fontFamily: 'Inter, sans-serif' }}>{t.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
