'use client';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';

const easeOut = [0.16, 1, 0.3, 1];

const before = [55, 42, 38];
const after  = [94, 91, 88];
const labels = ['ATS Compatibility', 'Keyword Match', 'JD Alignment'];
const colors = ['#22c55e', '#0052FF', '#8b5cf6'];

function ScoreBar({ label, val, color, delay }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontFamily: 'Inter, sans-serif' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>{val}%</span>
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${val}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: easeOut, delay }}
          style={{ height: '100%', background: color, borderRadius: 4 }}
        />
      </div>
    </div>
  );
}

export default function MatchScore() {
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <section style={{
      background: 'var(--foreground)',
      padding: '100px 32px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Texture */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '28px 28px', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-60px', left: '-60px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'rgba(0,82,255,0.07)', filter: 'blur(80px)', pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>

          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: easeOut }}
          >
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '6px 18px', borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)',
              marginBottom: 24,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                textTransform: 'uppercase', letterSpacing: '0.15em', color: '#86efac',
              }}>Match Score</span>
            </div>

            <h2 style={{
              fontFamily: 'Calistoga, serif',
              fontSize: 'clamp(2rem, 3vw, 3rem)',
              color: '#fff', margin: '0 0 16px', lineHeight: 1.1,
            }}>
              See Exactly How It{' '}
              <span style={{
                background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              }}>Works.</span>
            </h2>

            <p style={{
              fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7,
              fontFamily: 'Inter, sans-serif', margin: '0 0 32px',
            }}>
              Applying without knowing your match score is flying blind. ResumeSailor scores your resume against the specific job description, surfaces every gap, and shows you exactly what to fix — before a recruiter ever sees it.
            </p>

            {[
              { icon: 'analytics', label: 'Real match score per job', desc: 'Not a generic score — matched against the actual JD.' },
              { icon: 'manage_search', label: 'Weak areas surfaced instantly', desc: 'See exactly what keywords and skills you\'re missing.' },
              { icon: 'trending_up', label: 'Fix gaps before applying', desc: "Improve your score before the recruiter's first review." },
            ].map((pt, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(96,165,250,0.12)',
                  border: '1px solid rgba(96,165,250,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{
                    fontFamily: 'Material Symbols Rounded',
                    fontVariationSettings: "'wght' 300",
                    fontSize: 18, color: '#60a5fa',
                  }}>{pt.icon}</span>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Inter, sans-serif', marginBottom: 2 }}>{pt.label}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>{pt.desc}</div>
                </div>
              </div>
            ))}

            <button
              onClick={handleLogin}
              style={{
                marginTop: 8,
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: '#fff', border: 'none', borderRadius: 12,
                padding: '13px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(34,197,94,0.3)',
                fontFamily: 'Inter, sans-serif', transition: 'all 0.2s ease',
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = ''; }}
            >
              Check My Match Score →
            </button>
          </motion.div>

          {/* Right: Before/After score visualization */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: easeOut, delay: 0.15 }}
          >
            {/* Before card */}
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 16, padding: '20px 24px', marginBottom: 16,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#f87171',
                fontFamily: 'JetBrains Mono, monospace',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16,
              }}>❌ Before Optimization</div>
              {labels.map((label, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'Inter, sans-serif' }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#f87171', fontFamily: 'JetBrains Mono, monospace' }}>{before[i]}%</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${before[i]}%`, background: '#ef4444', borderRadius: 3, opacity: 0.6 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Arrow */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <span style={{
                fontFamily: 'Material Symbols Rounded',
                fontVariationSettings: "'wght' 300",
                fontSize: 28, color: '#22c55e',
              }}>arrow_downward</span>
            </div>

            {/* After card */}
            <div style={{
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 16, padding: '20px 24px',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#86efac',
                fontFamily: 'JetBrains Mono, monospace',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16,
              }}>✓ After Optimization</div>
              {labels.map((label, i) => (
                <ScoreBar key={i} label={label} val={after[i]} color={colors[i]} delay={0.2 + i * 0.15} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
