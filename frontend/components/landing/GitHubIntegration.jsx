'use client';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';

const easeOut = [0.16, 1, 0.3, 1];

// Mock repo project cards
const projects = [
  {
    name: 'distributed-cache',
    lang: 'Go',
    langColor: '#00ADD8',
    stars: 142,
    desc: 'High-throughput distributed cache with consistent hashing and fault tolerance.',
    bullets: ['Handles 80k req/s at p99 < 2ms', 'Redis-compatible protocol', 'Auto-failover in < 500ms'],
  },
  {
    name: 'ml-pipeline',
    lang: 'Python',
    langColor: '#3572A5',
    stars: 87,
    desc: 'End-to-end ML training pipeline with experiment tracking and model serving.',
    bullets: ['Cut training time 40% via parallelism', 'Integrated W&B experiment tracking', 'Serving 1M+ inferences/day'],
  },
];

export default function GitHubIntegration() {
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <section style={{
      background: 'var(--muted)',
      padding: '100px 32px',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
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
              border: '1px solid rgba(0,82,255,0.3)',
              background: 'rgba(0,82,255,0.06)',
              marginBottom: 24,
            }}>
              {/* GitHub icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--accent)',
              }}>GitHub Integration</span>
            </div>

            <h2 style={{
              fontFamily: 'Calistoga, serif',
              fontSize: 'clamp(2rem, 3vw, 3rem)',
              color: 'var(--foreground)', margin: '0 0 16px', lineHeight: 1.1,
            }}>
              Go Beyond{' '}
              <span style={{
                background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              }}>Your Resume.</span>
            </h2>

            <p style={{
              fontSize: 16, color: 'var(--muted-foreground)', lineHeight: 1.7,
              fontFamily: 'Inter, sans-serif', margin: '0 0 28px',
            }}>
              Your GitHub tells your story better than bullet points. Connect your repos and ResumePilot automatically extracts real project work, technical impact, and quantifiable achievements — then weaves them into your resume.
            </p>

            {[
              { icon: 'integration_instructions', label: 'Automatic project extraction', desc: 'AI reads your repos, READMEs, and commit history for real impact.' },
              { icon: 'bar_chart', label: 'Impact quantified for you', desc: 'Stars, forks, scale, and contribution history turned into bullet points.' },
              { icon: 'verified_user', label: 'Proof your work is real', desc: 'Recruiters love tangible evidence. GitHub links back it up.' },
            ].map((pt, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 18 }}>
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
                background: '#0F172A',
                color: '#fff', border: 'none', borderRadius: 12,
                padding: '13px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(15,23,42,0.3)',
                fontFamily: 'Inter, sans-serif', transition: 'all 0.2s ease',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = ''; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Connect GitHub
            </button>
          </motion.div>

          {/* Right: Animated project card UI */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: easeOut, delay: 0.15 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {/* GitHub-style repo header */}
            <div style={{
              background: '#fff', borderRadius: 16,
              border: '1px solid var(--border)',
              padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--foreground)">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', fontFamily: 'Inter, sans-serif' }}>github.com/yourusername</span>
              <span style={{
                marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#22c55e',
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: 999, padding: '3px 10px', fontFamily: 'JetBrains Mono, monospace',
              }}>✓ Connected</span>
            </div>

            {/* Project cards */}
            {projects.map((proj, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: easeOut, delay: 0.3 + i * 0.15 }}
                style={{
                  background: '#fff', borderRadius: 16,
                  border: '1px solid var(--border)',
                  padding: '20px 22px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>
                      📁 {proj.name}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--muted-foreground)', fontFamily: 'Inter, sans-serif', margin: 0, lineHeight: 1.4 }}>
                      {proj.desc}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 12, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>⭐</span>
                    <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--foreground)' }}>{proj.stars}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: proj.langColor }} />
                  <span style={{ fontSize: 12, color: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono, monospace' }}>{proj.lang}</span>
                  <span style={{
                    marginLeft: 4, fontSize: 10, fontWeight: 700,
                    color: '#0052FF', background: 'rgba(0,82,255,0.08)',
                    border: '1px solid rgba(0,82,255,0.15)',
                    borderRadius: 999, padding: '2px 8px',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>AI EXTRACTED</span>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {proj.bullets.map((b, j) => (
                    <li key={j} style={{
                      fontSize: 12, color: 'var(--foreground)',
                      fontFamily: 'Inter, sans-serif', padding: '4px 0',
                      borderTop: j > 0 ? '1px dashed var(--border)' : 'none',
                      display: 'flex', gap: 6, alignItems: 'flex-start',
                    }}>
                      <span style={{ color: '#22c55e', fontWeight: 700, marginTop: 1 }}>›</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
