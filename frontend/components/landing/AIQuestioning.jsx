'use client';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';

const easeOut = [0.16, 1, 0.3, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.65, ease: easeOut, delay: i * 0.12 },
  }),
};

const questions = [
  { q: 'What metrics did you improve in your last role?', tag: 'Impact' },
  { q: 'What tech stack did you use most on this project?', tag: 'Technical' },
  { q: 'Why did you choose this approach over alternatives?', tag: 'Depth' },
  { q: 'What was the scale — users, requests, or revenue affected?', tag: 'Scale' },
];

export default function AIQuestioning() {
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <section style={{ padding: '100px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>

        {/* Left: Animated chat-style Q&A */}
        <motion.div
          initial={{ opacity: 0, x: -32 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: easeOut }}
          style={{
            background: 'var(--foreground)',
            borderRadius: 24,
            padding: 32,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Dot texture */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '28px 28px', pointerEvents: 'none',
          }} />

          {/* Chat header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 28, position: 'relative',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #0052FF, #4D7CFF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: 'Material Symbols Rounded',
                fontVariationSettings: "'wght' 300",
                fontSize: 18, color: '#fff',
              }}>psychology</span>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'Inter, sans-serif' }}>
                ResumePilot AI
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontFamily: 'Inter, sans-serif' }}>Analyzing your resume…</span>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
            {questions.map((item, i) => (
              <motion.div
                key={i}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
                }}
              >
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, fontFamily: 'Inter, sans-serif', flex: 1 }}>
                  💬 {item.q}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                  color: '#60a5fa', background: 'rgba(96,165,250,0.12)',
                  border: '1px solid rgba(96,165,250,0.2)',
                  borderRadius: 999, padding: '3px 8px', whiteSpace: 'nowrap',
                  fontFamily: 'JetBrains Mono, monospace',
                }}>{item.tag}</span>
              </motion.div>
            ))}
          </div>

          {/* Typing indicator */}
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              marginTop: 16, display: 'flex', gap: 4, alignItems: 'center',
              paddingLeft: 4,
            }}
          >
            {[0, 1, 2].map(i => (
              <motion.span
                key={i}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                style={{ width: 6, height: 6, borderRadius: '50%', background: '#4D7CFF', display: 'inline-block' }}
              />
            ))}
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 8, fontFamily: 'Inter, sans-serif' }}>
              AI is forming next question…
            </span>
          </motion.div>
        </motion.div>

        {/* Right: Copy */}
        <motion.div
          initial={{ opacity: 0, x: 32 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: easeOut, delay: 0.15 }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '6px 18px', borderRadius: 999,
            border: '1px solid rgba(0,82,255,0.3)',
            background: 'rgba(0,82,255,0.05)',
            marginBottom: 24,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--accent)',
            }}>AI Questioning</span>
          </div>

          <h2 style={{
            fontFamily: 'Calistoga, serif',
            fontSize: 'clamp(2rem, 3vw, 3rem)',
            color: 'var(--foreground)', margin: '0 0 16px', lineHeight: 1.1,
          }}>
            AI That{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>Asks, Not Assumes.</span>
          </h2>

          <p style={{
            fontSize: 16, color: 'var(--muted-foreground)', lineHeight: 1.7,
            fontFamily: 'Inter, sans-serif', margin: '0 0 28px',
          }}>
            Before improving a single word, ResumePilot interviews you. It asks targeted questions about your real impact, technical depth, and context — so every change is grounded in <em>your</em> story, not a template.
          </p>

          {[
            { icon: 'not_started', label: 'Not generic rewriting', desc: 'Every suggestion reflects your actual experience.' },
            { icon: 'query_stats', label: 'Context-driven changes', desc: 'AI improves what matters most: impact and specificity.' },
            { icon: 'speed', label: 'Faster, smarter optimization', desc: 'Targeted questions mean fewer rounds of revision.' },
          ].map((pt, i) => (
            <div key={i} style={{
              display: 'flex', gap: 14, alignItems: 'flex-start',
              marginBottom: 18,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'rgba(0,82,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  fontFamily: 'Material Symbols Rounded',
                  fontVariationSettings: "'wght' 300",
                  fontSize: 18, color: 'var(--accent)',
                }}>{pt.icon}</span>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', fontFamily: 'Inter, sans-serif', marginBottom: 2 }}>{pt.label}</div>
                <div style={{ fontSize: 13, color: 'var(--muted-foreground)', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>{pt.desc}</div>
              </div>
            </div>
          ))}

          <button
            onClick={handleLogin}
            style={{
              marginTop: 8,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
              color: '#fff', border: 'none', borderRadius: 12,
              padding: '13px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,82,255,0.25)',
              fontFamily: 'Inter, sans-serif', transition: 'all 0.2s ease',
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = ''; }}
          >
            See AI in Action →
          </button>
        </motion.div>
      </div>
    </section>
  );
}
