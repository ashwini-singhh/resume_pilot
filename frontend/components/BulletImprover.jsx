/**
 * BulletImprover — On-Demand Resume Improvement with Context Q&A
 *
 * Isolated component. Renders as a slide-in panel (not a blocking modal).
 * Props:
 *   bullet      {string}   The bullet text to improve
 *   section     {string}   Section name (e.g. "Work Experience")
 *   onAccept    {fn}       Called with (original, improved) when user accepts
 *   onClose     {fn}       Called when user dismisses
 */

import React, { useState, useRef } from 'react';
import {
  generateImprovementQuestions,
  submitImprovementAnswers,
  generateImprovedBullet,
  acceptImprovement,
  rejectImprovement,
} from '../lib/api';

// --- Word-level Diff Renderer (client-side, matches backend tokens) ----------
function DiffRenderer({ diff }) {
  if (!diff || diff.length === 0) return null;
  return (
    <span style={{ lineHeight: 1.8, fontSize: '13px' }}>
      {diff.map((token, i) => {
        if (token.type === 'added') {
          return (
            <span key={i} style={{
              background: 'rgba(34,197,94,0.15)',
              color: '#15803d',
              padding: '1px 4px',
              borderRadius: '4px',
              fontWeight: 600,
            }}>{token.word} </span>
          );
        }
        if (token.type === 'removed') {
          return (
            <span key={i} style={{
              background: 'rgba(239,68,68,0.12)',
              color: '#dc2626',
              padding: '1px 4px',
              borderRadius: '4px',
              textDecoration: 'line-through',
              opacity: 0.75,
            }}>{token.word} </span>
          );
        }
        return <span key={i}>{token.word} </span>;
      })}
    </span>
  );
}

// --- Step indicator ----------------------------------------------------------
function Steps({ current }) {
  const steps = ['Ask', 'Answer', 'Result'];
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
      {steps.map((label, i) => {
        const step = i + 1;
        const active = current === step;
        const done = current > step;
        return (
          <React.Fragment key={label}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              opacity: active || done ? 1 : 0.4,
            }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700,
                background: done ? '#22c55e' : active ? 'var(--accent)' : 'var(--muted)',
                color: done || active ? '#fff' : 'var(--muted-foreground)',
                transition: 'all 0.3s',
              }}>
                {done ? '✓' : step}
              </div>
              <span style={{ fontSize: '12px', fontWeight: active ? 600 : 400 }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: '1px',
                background: done ? '#22c55e' : 'var(--border)',
                transition: 'background 0.3s',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// --- Main Component ----------------------------------------------------------
export default function BulletImprover({ bullet, section, onAccept, onClose }) {
  const [step, setStep] = useState(1);         // 1=loading/questions, 2=answering, 3=result
  const [status, setStatus] = useState('idle'); // idle|loading|error
  const [errorMsg, setErrorMsg] = useState('');

  const [runId] = useState(() => crypto.randomUUID());
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);  // { original_bullet, improved_bullet, diff, suggestion_id }

  const abortRef = useRef(false);

  // Step 1 — Generate questions
  React.useEffect(() => {
    if (!bullet) return;
    abortRef.current = false;
    setStatus('loading');

    generateImprovementQuestions({ run_id: runId, section, bullet_text: bullet })
      .then(data => {
        if (abortRef.current) return;
        setQuestions(data.questions || []);
        setAnswers((data.questions || []).map(() => ''));
        setStep(2);
        setStatus('idle');
      })
      .catch(err => {
        if (abortRef.current) return;
        setErrorMsg(err.message);
        setStatus('error');
      });

    return () => { abortRef.current = true; };
  }, [bullet]);

  const handleSubmitAnswers = async () => {
    const filled = answers.filter(a => a.trim()).length;
    if (filled === 0) return alert('Please answer at least one question.');

    setStatus('loading');
    try {
      // Store answers (fire-and-forget is fine, but await for correctness)
      await submitImprovementAnswers({
        run_id: runId,
        questions,
        answers,
        original_bullet: bullet,
      });

      // Generate improvement
      const res = await generateImprovedBullet({
        original_bullet: bullet,
        questions,
        answers,
        run_id: runId,
        section,
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
    onAccept(bullet, result.improved_bullet);
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
        maxWidth: '560px',
        boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="mat-icon" style={{ color: 'var(--accent)' }}>auto_fix_high</span>
              Improve This Bullet
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
              AI-powered improvement with your context
            </p>
          </div>
          <button className="card-edit" onClick={onClose}>
            <span className="mat-icon">close</span>
          </button>
        </div>

        {/* Step Indicator */}
        <Steps current={step} />

        {/* Original Bullet (always visible) */}
        <div style={{
          background: 'var(--muted)',
          borderRadius: '10px',
          padding: '12px 16px',
          fontSize: '13px',
          color: 'var(--foreground)',
          marginBottom: '20px',
          borderLeft: '3px solid var(--accent)',
          lineHeight: 1.6,
        }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Original Bullet
          </div>
          {bullet}
        </div>

        {/* ── Step 1: Loading questions ── */}
        {step === 1 && status === 'loading' && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted-foreground)' }}>
            <span className="mat-icon" style={{ fontSize: '32px', marginBottom: '12px', display: 'block' }}>psychology</span>
            Generating context questions...
          </div>
        )}

        {/* ── Step 2: Questions → Answers ── */}
        {step === 2 && (
          <div className="animate-in">
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--foreground)' }}>
              Answer these to help the AI improve your bullet:
            </div>
            {questions.map((q, i) => (
              <div key={i} style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Q{i + 1}.</span> {q}
                </label>
                <textarea
                  rows={2}
                  placeholder="Your answer (leave blank to skip)"
                  value={answers[i] || ''}
                  onChange={e => {
                    const updated = [...answers];
                    updated[i] = e.target.value;
                    setAnswers(updated);
                  }}
                  style={{ marginBottom: 0, fontSize: '13px', resize: 'vertical' }}
                />
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button className="btn" onClick={onClose}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitAnswers}
                disabled={status === 'loading'}
              >
                {status === 'loading'
                  ? <><span className="mat-icon" style={{ fontSize: '16px' }}>hourglass_empty</span> Improving...</>
                  : <><span className="mat-icon" style={{ fontSize: '16px' }}>auto_fix_high</span> Generate Improvement</>
                }
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Show Result + Diff ── */}
        {step === 3 && result && (
          <div className="animate-in">
            {!result.changed ? (
              <div style={{
                background: 'rgba(234,179,8,0.08)',
                border: '1px solid rgba(234,179,8,0.3)',
                borderRadius: '10px',
                padding: '12px 16px',
                fontSize: '13px',
                color: '#92400e',
                marginBottom: '16px',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}>
                <span className="mat-icon" style={{ color: '#d97706' }}>info</span>
                The bullet is already strong — no significant improvement found.
              </div>
            ) : (
              <>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Improved Version (word-level diff):
                </div>
                <div style={{
                  background: 'rgba(34,197,94,0.05)',
                  border: '1px solid rgba(34,197,94,0.25)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '20px',
                  lineHeight: 1.7,
                }}>
                  <DiffRenderer diff={result.diff} />
                </div>

                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--muted-foreground)', marginBottom: '20px' }}>
                  <span style={{ background: 'rgba(34,197,94,0.15)', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Green = added</span>
                  <span style={{ background: 'rgba(239,68,68,0.12)', color: '#dc2626', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Red = removed</span>
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                className="btn"
                onClick={handleReject}
                style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#dc2626' }}
              >
                <span className="mat-icon" style={{ fontSize: '16px' }}>close</span> Reject
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAccept}
                disabled={!result.changed}
              >
                <span className="mat-icon" style={{ fontSize: '16px' }}>check</span> Accept
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px',
            padding: '12px 16px',
            color: '#dc2626',
            fontSize: '13px',
            marginTop: '12px',
          }}>
            <span className="mat-icon" style={{ fontSize: '16px', verticalAlign: 'middle' }}>error</span>{' '}
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
