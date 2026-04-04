'use client';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';

const easeOut = [0.16, 1, 0.3, 1];

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    desc: 'Perfect for getting started and testing the magic.',
    items: ['5 resume optimizations', 'AI-powered analysis', 'ATS score report', 'Basic keyword matching'],
    cta: 'Start Free',
    featured: false,
  },
  {
    name: 'Pro',
    price: '$9',
    period: 'per month',
    desc: 'For serious job seekers who want every edge.',
    items: [
      'Unlimited optimizations',
      'AI question-and-answer flow',
      'Role-specific tailoring',
      'Impact scoring per bullet',
      'Multiple resume manager',
      'Priority processing',
    ],
    cta: 'Get Unlimited Access',
    featured: true,
    badge: '☕ One Coffee',
  },
];

export default function Pricing() {
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <section style={{ padding: '100px 32px', maxWidth: 900, margin: '0 auto' }}>
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
          }}>Pricing</span>
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
          margin: '0 0 12px', lineHeight: 1.15,
        }}
      >
        At the Price of One Coffee ☕
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: easeOut, delay: 0.15 }}
        style={{
          textAlign: 'center', fontSize: 16, color: 'var(--muted-foreground)',
          maxWidth: 440, margin: '0 auto 64px', lineHeight: 1.7,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        Start free, upgrade when you're ready. No hidden fees, ever.
      </motion.p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, alignItems: 'start' }}>
        {tiers.map((tier, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: tier.featured ? -12 : 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: easeOut, delay: i * 0.15 }}
            style={{
              background: tier.featured
                ? 'linear-gradient(135deg, var(--accent), var(--accent-secondary))'
                : 'transparent',
              borderRadius: 22,
              padding: tier.featured ? 2 : 0,
            }}
          >
            <div style={{
              background: '#fff',
              border: tier.featured ? 'none' : '1px solid var(--border)',
              borderRadius: tier.featured ? 20 : 20,
              padding: '36px 32px',
              boxShadow: tier.featured ? '0 20px 40px rgba(0,82,255,0.2)' : '0 4px 6px rgba(0,0,0,0.04)',
            }}>
              {tier.badge && (
                <div style={{
                  display: 'inline-block',
                  background: 'rgba(0,82,255,0.08)',
                  color: 'var(--accent)',
                  borderRadius: 999, padding: '4px 12px',
                  fontSize: 12, fontWeight: 600, marginBottom: 16,
                  fontFamily: 'Inter, sans-serif',
                }}>{tier.badge}</div>
              )}
              <div style={{ fontFamily: 'Calistoga, serif', fontSize: 24, color: 'var(--foreground)', marginBottom: 4 }}>{tier.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                <span style={{ fontFamily: 'Calistoga, serif', fontSize: 48, color: 'var(--foreground)', lineHeight: 1 }}>{tier.price}</span>
                <span style={{ fontSize: 14, color: 'var(--muted-foreground)', fontFamily: 'Inter, sans-serif' }}>/{tier.period}</span>
              </div>
              <p style={{ fontSize: 14, color: 'var(--muted-foreground)', margin: '0 0 24px', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>{tier.desc}</p>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px' }}>
                {tier.items.map((item, j) => (
                  <li key={j} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0', fontSize: 14, color: 'var(--foreground)',
                    borderBottom: j < tier.items.length - 1 ? '1px solid var(--border)' : 'none',
                    fontFamily: 'Inter, sans-serif',
                  }}>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              <button
                onClick={handleLogin}
                style={{
                  width: '100%', padding: '14px',
                  borderRadius: 12, border: 'none', cursor: 'pointer',
                  fontSize: 15, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                  background: tier.featured
                    ? 'linear-gradient(135deg, var(--accent), var(--accent-secondary))'
                    : 'var(--muted)',
                  color: tier.featured ? '#fff' : 'var(--foreground)',
                  boxShadow: tier.featured ? '0 4px 14px rgba(0,82,255,0.3)' : 'none',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = ''; }}
              >
                {tier.cta}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
