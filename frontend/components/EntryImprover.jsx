/**
 * EntryImprover — Entry-Level Context Q&A + Multi-Bullet Diff
 *
 * Handles the full flow for improving an entire experience/project entry:
 *   Step 1: Auto-generates targeted questions for this specific entry
 *   Step 2: Captures user answers
 *   Step 3: Shows bullet-level diffs (original vs improved per bullet)
 *   Accept → calls onAccept(improvedEntry) and closes
 *   Reject → closes without changes
 *
 * Props:
 *   entry      {object}   Full entry (company/name, bullets, ...)
 *   entryId    {string}   e.g. 'exp_0'
 *   section    {string}   'experience' | 'projects'
 *   onAccept   {fn}       Called with improved entry object
 *   onClose    {fn}       Dismiss
 */

import React, { useState, useEffect, useRef } from 'react';
import { generateEntryQuestions, improveEntry, acceptImprovement, rejectImprovement } from '../lib/api';

// ── Word-level diff renderer (reused from BulletImprover visual pattern) ─────
function WordDiff({ diff }) {
  if (!diff || diff.length === 0) return null;
  return (
    <span>
      {diff.map((tok, i) => {
        if (tok.type === 'added') {
          return (
            <span key={i} style={{
              background: 'rgba(34,197,94,0.18)', color: '#15803d',
              padding: '0 3px', borderRadius: '3px', fontWeight: 600,
            }}>{tok.word} </span>
          );
        }
        if (tok.type === 'removed') {
          return (
            <span key={i} style={{
              background: 'rgba(239,68,68,0.12)', color: '#dc2626',
              padding: '0 3px', borderRadius: '3px', textDecoration: 'line-through', opacity: 0.75,
            }}>{tok.word} </span>
          );
        }
        return <span key={i}>{tok.word} </span>;
      })}
    </span>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepDots({ current }) {
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '20px' }}>
      {['Questions', 'Answers', 'Result'].map((label, i) => {
        const step = i + 1;
        const done = current > step;
        const active = current === step;
        return (
          <React.Fragment key={label}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', opacity: active || done ? 1 : 0.4 }}>
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: 700,
                background: done ? '#22c55e' : active ? 'var(--accent)' : 'var(--muted)',
                color: (done || active) ? '#fff' : 'var(--muted-foreground)',
                transition: 'all 0.3s',
              }}>
                {done ? '✓' : step}
              </div>
              <span style={{ fontSize: '11px', fontWeight: active ? 600 : 400 }}>{label}</span>
            </div>
            {i < 2 && <div style={{ flex: 1, height: '1px', background: done ? '#22c55e' : 'var(--border)', transition: 'background 0.3s' }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function EntryImprover({ entry, entryId, section, onAccept, onClose }) {
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState('loading'); // loading | idle | error
  const [errorMsg, setErrorMsg] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null); // { improved_entry, bullet_diffs, changed }
  const abortRef = useRef(false);

  const entryLabel = entry?.company || entry?.name || 'Entry';

  // Auto-generate questions on mount
  useEffect(() => {
    if (!entry) return;
    abortRef.current = false;
    setStatus('loading');
    generateEntryQuestions({ section, entry, entry_id: entryId })
      .then(data => {
        if (abortRef.current) return;
        const qs = data.questions || [];
        setQuestions(qs);
        setAnswers(qs.map(() => ''));
        setStep(2);
        setStatus('idle');
      })
      .catch(err => {
        if (abortRef.current) return;
        setErrorMsg(err.message);
        setStatus('error');
      });
    return () => { abortRef.current = true; };
  }, []);

  const handleImprove = async () => {
    const hasAnswer = answers.some(a => a.trim());
    if (!hasAnswer) return alert('Please answer at least one question.');
    setStatus('loading');
    try {
      const res = await improveEntry({
        section, entry, entry_id: entryId,
        questions, answers,
      });
      setResult(res);
      setStep(3);
      setStatus('idle');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const handleAccept = async () => {
    if (result?.suggestion_id) {
      try { await acceptImprovement(result.suggestion_id); } catch (_) {}
    }
    if (result?.improved_entry) onAccept(result.improved_entry);
    onClose();
  };

  const handleReject = async () => {
    if (result?.suggestion_id) {
      try { await rejectImprovement(result.suggestion_id); } catch (_) {}
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target.className === 'modal-overlay') onClose(); }}>
      <div className="animate-in" style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '28px',
        width: '100%',
        maxWidth: '640px',
        boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="mat-icon" style={{ color: 'var(--accent)', fontSize: '20px' }}>workspace_premium</span>
              Improve: {entryLabel}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
              {section === 'experience' ? 'Work Experience' : 'Project'} — context-aware rewrite of all bullets
            </p>
          </div>
          <button className="card-edit" onClick={onClose}>
            <span className="mat-icon">close</span>
          </button>
        </div>

        <StepDots current={step} />

        {/* ── Step 1: Loading ── */}
        {step === 1 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted-foreground)' }}>
            <span className="mat-icon" style={{ fontSize: '36px', marginBottom: '12px', display: 'block', color: 'var(--accent)' }}>psychology</span>
            <div style={{ fontSize: '13px' }}>Analyzing entry and generating questions...</div>
          </div>
        )}

        {/* ── Step 2: Q&A ── */}
        {step === 2 && status !== 'loading' && (
          <div className="animate-in">
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '16px', color: 'var(--foreground)' }}>
              Answer these to help AI improve all bullets in this entry:
            </div>
            {questions.map((q, i) => (
              <div key={i} style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Q{i + 1}. </span>{q}
                </label>
                <textarea
                  rows={2}
                  placeholder="Your answer (leave blank to skip)"
                  value={answers[i] || ''}
                  onChange={e => {
                    const a = [...answers]; a[i] = e.target.value; setAnswers(a);
                  }}
                  style={{ fontSize: '13px', resize: 'vertical', marginBottom: 0 }}
                />
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleImprove} disabled={status === 'loading'}>
                {status === 'loading'
                  ? <><span className="mat-icon" style={{ fontSize: '15px' }}>hourglass_empty</span> Rewriting...</>
                  : <><span className="mat-icon" style={{ fontSize: '15px' }}>auto_awesome</span> Rewrite All Bullets</>
                }
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2 loading state ── */}
        {step === 2 && status === 'loading' && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted-foreground)' }}>
            <span className="mat-icon" style={{ fontSize: '32px', marginBottom: '12px', display: 'block', color: 'var(--accent)' }}>auto_awesome</span>
            <div style={{ fontSize: '13px' }}>Rewriting all bullets with your context...</div>
          </div>
        )}

        {/* ── Step 3: Results ── */}
        {step === 3 && result && (
          <div className="animate-in">
            {!result.changed ? (
              <div style={{
                background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)',
                borderRadius: '10px', padding: '14px 16px', fontSize: '13px', color: '#92400e',
                marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center',
              }}>
                <span className="mat-icon" style={{ color: '#d97706', fontSize: '16px' }}>info</span>
                The entry is already strong — no significant improvements found.
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', marginBottom: '16px' }}>
                  <span style={{ background: 'rgba(34,197,94,0.15)', color: '#15803d', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>
                    🟢 Green = added
                  </span>
                  <span style={{ background: 'rgba(239,68,68,0.12)', color: '#dc2626', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>
                    🔴 Strikethrough = removed
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                  {result.bullet_diffs?.map((diff, i) => (
                    <div key={i} style={{
                      borderRadius: '10px',
                      border: `1px solid ${diff.changed ? 'rgba(34,197,94,0.25)' : 'var(--border)'}`,
                      overflow: 'hidden',
                    }}>
                      {/* Original */}
                      <div style={{
                        padding: '8px 14px',
                        background: 'rgba(239,68,68,0.04)',
                        borderBottom: '1px solid var(--border)',
                        fontSize: '12px',
                      }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Before
                        </span>
                        <div style={{ marginTop: '4px', color: '#64748b', lineHeight: 1.6 }}>• {diff.original}</div>
                      </div>
                      {/* Improved */}
                      <div style={{
                        padding: '8px 14px',
                        background: diff.changed ? 'rgba(34,197,94,0.04)' : 'transparent',
                        fontSize: '12px',
                      }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: diff.changed ? '#15803d' : 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {diff.changed ? 'After' : 'Unchanged'}
                        </span>
                        <div style={{ marginTop: '4px', lineHeight: 1.6 }}>
                          • {diff.changed ? <WordDiff diff={diff.diff} /> : diff.improved}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn" onClick={handleReject}
                style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#dc2626' }}>
                <span className="mat-icon" style={{ fontSize: '15px' }}>close</span> Reject
              </button>
              <button className="btn btn-primary" onClick={handleAccept} disabled={!result.changed}>
                <span className="mat-icon" style={{ fontSize: '15px' }}>check</span> Accept All
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px', padding: '12px 16px', color: '#dc2626', fontSize: '13px', marginTop: '12px',
          }}>
            <span className="mat-icon" style={{ fontSize: '15px', verticalAlign: 'middle' }}>error</span>{' '}
            {errorMsg}
            <button className="btn" style={{ marginLeft: '12px', fontSize: '12px', padding: '4px 12px' }} onClick={onClose}>
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
