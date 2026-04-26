'use client';
import { motion } from 'framer-motion';

const easeOut = [0.16, 1, 0.3, 1];

const faqs = [
  {
    q: "How is this different from ChatGPT?",
    a: "ChatGPT gives generic advice. We use specialized models to score your resume against ATS standards, match it to specific job descriptions, and ask you targeted questions to extract missing metrics."
  },
  {
    q: "Is it ATS-friendly?",
    a: "Yes. Our scoring engine specifically checks for ATS parseability, keyword density, and formatting rules."
  },
  {
    q: "Can I use multiple resumes?",
    a: "Absolutely. You can tailor different versions of your resume for different job applications."
  },
  {
    q: "Is my data safe?",
    a: "We do not sell your data. Your resumes are securely stored and only used to generate your insights."
  }
];

export default function FAQ() {
  return (
    <section style={{ padding: '100px 32px', maxWidth: 800, margin: '0 auto' }}>
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
          }}>Questions</span>
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
          margin: '0 0 64px', lineHeight: 1.1,
        }}
      >
        Frequently Asked{' '}
        <span style={{
          background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>Questions.</span>
      </motion.h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {faqs.map((faq, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: easeOut, delay: i * 0.1 }}
            style={{
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '24px 32px',
            }}
          >
            <h3 style={{
              fontSize: 18, fontWeight: 700, color: 'var(--foreground)',
              fontFamily: 'Inter, sans-serif', margin: '0 0 12px',
            }}>
              {faq.q}
            </h3>
            <p style={{
              fontSize: 15, color: 'var(--muted-foreground)',
              lineHeight: 1.6, fontFamily: 'Inter, sans-serif', margin: 0,
            }}>
              {faq.a}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
