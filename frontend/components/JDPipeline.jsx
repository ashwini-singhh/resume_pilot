/**
 * JDPipeline — 3-Stage JD Matching & Resume Optimization
 *
 * Stage 1: Relevance Scoring   — shows scored entry cards + decision badges
 * Stage 2: ATS Optimization    — word-level diff viewer per entry
 * Stage 3: Gap Analysis        — missing skills, keywords, strategic suggestions
 */

import React, { useState } from 'react';
import {
  analyzeJD,
  optimizeEntries,
  analyzeGaps,
  acceptJDSuggestion,
  rejectJDSuggestion,
} from '../lib/api';

// ── Word-level diff renderer ──────────────────────────────────────────────────
function WordDiff({ tokens }) {
  if (!tokens || tokens.length === 0) return null;
  return (
    <span style={{ lineHeight: 1.8 }}>
      {tokens.map((tok, i) => {
        if (tok.type === 'added') {
          return (
            <span key={i} style={{
              background: 'rgba(34,197,94,0.18)', color: '#15803d',
              padding: '1px 4px', borderRadius: '3px', fontWeight: 600, margin: '0 1px'
            }}>{tok.word}</span>
          );
        }
        if (tok.type === 'removed') {
          return (
            <span key={i} style={{
              background: 'rgba(239,68,68,0.12)', color: '#dc2626',
              padding: '1px 4px', borderRadius: '3px', textDecoration: 'line-through',
              opacity: 0.75, margin: '0 1px'
            }}>{tok.word}</span>
          );
        }
        return <span key={i} style={{ margin: '0 1px' }}>{tok.word}</span>;
      })}
    </span>
  );
}

// ── Decision Badge ─────────────────────────────────────────────────────────────
function DecisionBadge({ decision }) {
  const cfg = {
    KEEP:     { bg: 'rgba(34,197,94,0.12)',  color: '#15803d', icon: 'check_circle', label: 'Keep' },
    OPTIONAL: { bg: 'rgba(234,179,8,0.12)',  color: '#b45309', icon: 'help',         label: 'Optional' },
    REMOVE:   { bg: 'rgba(239,68,68,0.10)',  color: '#dc2626', icon: 'cancel',       label: 'Remove' },
  }[decision] || { bg: 'var(--muted)', color: 'var(--muted-foreground)', icon: 'circle', label: decision };

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
      background: cfg.bg, color: cfg.color,
    }}>
      <span className="mat-icon" style={{ fontSize: '13px' }}>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

// ── Score Ring ─────────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const color = score >= 7 ? '#22c55e' : score >= 4 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{
      width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
      border: `3px solid ${color}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: `${color}14`, fontFamily: 'JetBrains Mono, monospace',
    }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color, lineHeight: 1 }}>{score.toFixed(1)}</div>
      <div style={{ fontSize: '8px', color: 'var(--muted-foreground)', lineHeight: 1 }}>/ 10</div>
    </div>
  );
}

// ── Stage Progress Header ─────────────────────────────────────────────────────
function StageProgress({ stage }) {
  const stages = ['Relevance Scoring', 'ATS Optimization', 'Gap Analysis'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '28px' }}>
      {stages.map((label, i) => {
        const num = i + 1;
        const done = stage > num;
        const active = stage === num;
        return (
          <React.Fragment key={label}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '90px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700,
                background: done ? '#22c55e' : active ? 'var(--accent)' : 'var(--muted)',
                color: (done || active) ? '#fff' : 'var(--muted-foreground)',
                transition: 'all 0.3s', boxShadow: active ? '0 0 0 4px rgba(0,82,255,0.15)' : 'none',
              }}>
                {done ? <span className="mat-icon" style={{ fontSize: '14px' }}>check</span> : num}
              </div>
              <span style={{ fontSize: '10px', fontWeight: active ? 700 : 400, color: active ? 'var(--foreground)' : 'var(--muted-foreground)', textAlign: 'center' }}>
                {label}
              </span>
            </div>
            {i < 2 && (
              <div style={{ flex: 1, height: '2px', background: done ? '#22c55e' : 'var(--border)', transition: 'background 0.5s', marginBottom: '18px' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function JDPipeline({ userId, contextId }) {
  // Pipeline state
  const [stage, setStage] = useState(0);   // 0=upload, 1=scored, 2=optimized, 3=gaps
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Stage 1: JD input + scored result
  const [jdText, setJdText] = useState('');
  const [jdTitle, setJdTitle] = useState('');
  const [jdCompany, setJdCompany] = useState('');
  const [jdId, setJdId] = useState(null);
  const [scoredEntries, setScoredEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Stage 2: optimization diffs
  const [optimizedSuggestions, setOptimizedSuggestions] = useState([]);
  const [suggestionStatuses, setSuggestionStatuses] = useState({});

  // Stage 3: gap analysis
  const [gaps, setGaps] = useState(null);

  const toggleEntry = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = (entries) => {
    const eligible = entries.filter(e => e.decision !== 'REMOVE').map(e => e.entry_id);
    setSelectedIds(prev => {
      const allSelected = eligible.every(id => prev.has(id));
      const next = new Set(prev);
      if (allSelected) eligible.forEach(id => next.delete(id));
      else eligible.forEach(id => next.add(id));
      return next;
    });
  };

  // ── Stage 1 Handler ──────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!jdText.trim()) return setError('Please paste a job description first.');
    setLoading(true); setError('');
    try {
      const res = await analyzeJD({
        jd_text: jdText,
        jd_title: jdTitle || 'Untitled Role',
        jd_company: jdCompany || 'Unknown Company',
        user_id: userId,
        context_id: contextId,
      });
      setJdId(res.jd_id);
      setScoredEntries(res.entries);
      setSummary(res.summary);
      // Auto-select KEEP entries
      const autoSelect = new Set(res.entries.filter(e => e.decision === 'KEEP').map(e => e.entry_id));
      setSelectedIds(autoSelect);
      setStage(1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Stage 2 Handler ──────────────────────────────────────────────────────────
  const handleOptimize = async () => {
    if (selectedIds.size === 0) return setError('Select at least one entry to optimize.');
    setLoading(true); setError('');
    try {
      const res = await optimizeEntries({
        jd_id: jdId,
        selected_entry_ids: Array.from(selectedIds),
        user_id: userId,
        context_id: contextId,
      });
      setOptimizedSuggestions(res.suggestions);
      const statuses = {};
      res.suggestions.forEach(s => { statuses[s.suggestion_id] = 'pending'; });
      setSuggestionStatuses(statuses);
      setStage(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Stage 2 Actions ──────────────────────────────────────────────────────────
  const handleAccept = async (suggestionId) => {
    try {
      await acceptJDSuggestion({ suggestion_id: suggestionId, user_id: userId });
      setSuggestionStatuses(prev => ({ ...prev, [suggestionId]: 'accepted' }));
    } catch (_) {}
  };

  const handleReject = async (suggestionId) => {
    try {
      await rejectJDSuggestion({ suggestion_id: suggestionId, user_id: userId });
      setSuggestionStatuses(prev => ({ ...prev, [suggestionId]: 'rejected' }));
    } catch (_) {}
  };

  const handleAcceptAll = async () => {
    for (const s of optimizedSuggestions) {
      if (suggestionStatuses[s.suggestion_id] === 'pending') {
        await handleAccept(s.suggestion_id);
      }
    }
  };

  // ── Stage 3 Handler ──────────────────────────────────────────────────────────
  const handleGapAnalysis = async () => {
    setLoading(true); setError('');
    try {
      const res = await analyzeGaps({ jd_id: jdId, user_id: userId, context_id: contextId });
      setGaps(res);
      setStage(3);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="animate-in" style={{ maxWidth: '860px', margin: '0 auto', padding: '0 4px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontFamily: 'Calistoga, serif', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="mat-icon" style={{ fontSize: '26px', color: 'var(--accent)' }}>work_history</span>
          JD Match Engine
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
          Paste a job description to score, optimize, and gap-analyze your resume
        </p>
      </div>

      {stage > 0 && <StageProgress stage={stage} />}

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '10px', padding: '12px 16px', color: '#dc2626', fontSize: '13px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span className="mat-icon" style={{ fontSize: '16px' }}>error</span> {error}
        </div>
      )}

      {/* ════ STAGE 0: JD Upload ════ */}
      {stage === 0 && (
        <div className="section-card animate-in">
          <div className="card-header">
            <div className="card-title">
              <span className="mat-icon">upload_file</span> Paste Job Description
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Role Title (optional)</label>
              <input
                type="text"
                placeholder="e.g. Senior Software Engineer"
                value={jdTitle}
                onChange={e => setJdTitle(e.target.value)}
                style={{ marginBottom: 0 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Company (optional)</label>
              <input
                type="text"
                placeholder="e.g. Google, Stripe, OpenAI"
                value={jdCompany}
                onChange={e => setJdCompany(e.target.value)}
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>
          <label className="form-label">Job Description</label>
          <textarea
            rows={10}
            placeholder="Paste the full job description here…"
            value={jdText}
            onChange={e => setJdText(e.target.value)}
            style={{ fontSize: '13px', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading}>
              {loading
                ? <><span className="mat-icon" style={{ fontSize: '15px', animation: 'spin 1s linear infinite' }}>autorenew</span> Analyzing…</>
                : <><span className="mat-icon" style={{ fontSize: '15px' }}>analytics</span> Analyze Resume Match</>}
            </button>
          </div>
        </div>
      )}

      {/* ════ STAGE 1: Scored Entries ════ */}
      {stage === 1 && (
        <div className="animate-in">
          {/* Summary strip */}
          {summary && (
            <div style={{
              display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap'
            }}>
              {[
                { label: 'Keep', count: summary.keep,     color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
                { label: 'Optional', count: summary.optional, color: '#f59e0b', bg: 'rgba(234,179,8,0.08)' },
                { label: 'Remove', count: summary.remove,   color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
              ].map(({ label, count, color, bg }) => (
                <div key={label} style={{
                  flex: 1, padding: '14px 16px', borderRadius: '14px',
                  background: bg, border: `1px solid ${color}30`, textAlign: 'center'
                }}>
                  <div style={{ fontSize: '26px', fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>{count}</div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted-foreground)', marginTop: '2px' }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Entry cards */}
          <div className="section-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div className="card-title">
                <span className="mat-icon">sort</span> Scored Entries ({scoredEntries.length})
              </div>
              <button className="btn" style={{ fontSize: '12px', padding: '5px 12px' }} onClick={() => toggleAll(scoredEntries)}>
                Toggle All Eligible
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {scoredEntries.map(entry => {
                const isSelected = selectedIds.has(entry.entry_id);
                const isRemove = entry.decision === 'REMOVE';
                return (
                  <div
                    key={entry.entry_id}
                    onClick={() => !isRemove && toggleEntry(entry.entry_id)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      background: isSelected ? 'rgba(0,82,255,0.03)' : isRemove ? 'rgba(239,68,68,0.02)' : 'var(--card)',
                      cursor: isRemove ? 'not-allowed' : 'pointer',
                      opacity: isRemove ? 0.6 : 1,
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      {/* Checkbox */}
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                        border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                        background: isSelected ? 'var(--accent)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSelected && <span className="mat-icon" style={{ fontSize: '12px', color: '#fff' }}>check</span>}
                      </div>

                      <ScoreRing score={entry.score} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '14px' }}>
                            {entry.entry?.company || entry.entry?.name || entry.entry_id}
                          </span>
                          {entry.entry?.title && (
                            <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>— {entry.entry.title}</span>
                          )}
                          <DecisionBadge decision={entry.decision} />
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.5 }}>
                          {entry.reasoning}
                        </p>
                        {/* Keywords */}
                        {entry.matched_keywords?.length > 0 && (
                          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {entry.matched_keywords.map(kw => (
                              <span key={kw} style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600, background: 'rgba(34,197,94,0.1)', color: '#15803d' }}>✓ {kw}</span>
                            ))}
                            {entry.missing_keywords?.map(kw => (
                              <span key={kw} style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600, background: 'rgba(239,68,68,0.08)', color: '#dc2626' }}>✗ {kw}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                {selectedIds.size} entries selected for optimization
              </span>
              <button className="btn btn-primary" onClick={handleOptimize} disabled={loading || selectedIds.size === 0}>
                {loading
                  ? <><span className="mat-icon" style={{ fontSize: '15px', animation: 'spin 1s linear infinite' }}>autorenew</span> Optimizing…</>
                  : <><span className="mat-icon" style={{ fontSize: '15px' }}>auto_fix_high</span> Optimize Selected ({selectedIds.size})</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ STAGE 2: ATS Diff View ════ */}
      {stage === 2 && (
        <div className="animate-in">
          <div className="section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div className="card-title">
                <span className="mat-icon">difference</span> Optimized Bullets
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', alignItems: 'center' }}>
                  <span style={{ background: 'rgba(34,197,94,0.15)', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>🟢 Added</span>
                  <span style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>🔴 Removed</span>
                </div>
                <button className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 14px' }} onClick={handleAcceptAll}>
                  <span className="mat-icon" style={{ fontSize: '14px' }}>done_all</span> Accept All
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {optimizedSuggestions.map(sug => {
                const status = suggestionStatuses[sug.suggestion_id] || 'pending';
                return (
                  <div key={sug.suggestion_id} style={{
                    border: `1px solid ${status === 'accepted' ? 'rgba(34,197,94,0.3)' : status === 'rejected' ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                    borderRadius: '12px', overflow: 'hidden',
                  }}>
                    {/* Entry header */}
                    <div style={{
                      padding: '10px 16px', background: 'var(--muted)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>{sug.entry_id}</span>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                        background: status === 'accepted' ? '#dcfce7' : status === 'rejected' ? '#fee2e2' : 'var(--border)',
                        color: status === 'accepted' ? '#15803d' : status === 'rejected' ? '#dc2626' : 'var(--muted-foreground)',
                        textTransform: 'uppercase',
                      }}>
                        {status}
                      </span>
                    </div>

                    {/* Bullet diffs */}
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {(sug.bullet_diffs || []).map((diff, i) => (
                        <div key={i} style={{ borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                          <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.04)', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Before</span>
                            <div style={{ marginTop: '4px', color: '#64748b', lineHeight: 1.6 }}>• {diff.original}</div>
                          </div>
                          <div style={{ padding: '8px 12px', background: diff.changed ? 'rgba(34,197,94,0.04)' : 'transparent', fontSize: '12px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: diff.changed ? '#15803d' : 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                              {diff.changed ? 'After' : 'Unchanged'}
                            </span>
                            <div style={{ marginTop: '4px', lineHeight: 1.8 }}>
                              • {diff.changed ? <WordDiff tokens={diff.diff_tokens} /> : diff.optimized}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    {status === 'pending' && (
                      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button className="btn" style={{ fontSize: '12px', borderColor: 'rgba(239,68,68,0.3)', color: '#dc2626' }}
                          onClick={() => handleReject(sug.suggestion_id)}>
                          <span className="mat-icon" style={{ fontSize: '14px' }}>close</span> Reject
                        </button>
                        <button className="btn btn-primary" style={{ fontSize: '12px' }}
                          onClick={() => handleAccept(sug.suggestion_id)}>
                          <span className="mat-icon" style={{ fontSize: '14px' }}>check</span> Accept
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn btn-primary" onClick={handleGapAnalysis} disabled={loading}>
                {loading
                  ? <><span className="mat-icon" style={{ fontSize: '15px', animation: 'spin 1s linear infinite' }}>autorenew</span> Analyzing Gaps…</>
                  : <><span className="mat-icon" style={{ fontSize: '15px' }}>insights</span> Run Gap Analysis →</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ STAGE 3: Gap Analysis ════ */}
      {stage === 3 && gaps && (
        <div className="animate-in">
          <div className="section-card">
            <div className="card-title" style={{ marginBottom: '20px' }}>
              <span className="mat-icon" style={{ color: '#f59e0b' }}>insights</span> Strategic Gap Analysis
            </div>

            {/* Missing Skills */}
            {gaps.missing_skills?.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                  Missing Skills ATS Will Flag
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {gaps.missing_skills.map(skill => (
                    <span key={skill} style={{
                      padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                      background: 'rgba(239,68,68,0.08)', color: '#dc2626',
                      border: '1px solid rgba(239,68,68,0.2)',
                    }}>
                      <span className="mat-icon" style={{ fontSize: '12px', verticalAlign: 'middle' }}>close</span> {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Keywords */}
            {gaps.missing_keywords?.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                  High-Value Keywords Not Found
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {gaps.missing_keywords.map(kw => (
                    <span key={kw} style={{
                      padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                      background: 'rgba(234,179,8,0.1)', color: '#b45309',
                      border: '1px solid rgba(234,179,8,0.25)',
                    }}>
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Strategic Suggestions */}
            {gaps.suggestions && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                  Strategic Suggestions
                </div>
                <div style={{
                  padding: '16px', borderRadius: '12px',
                  background: 'rgba(0,82,255,0.04)', border: '1px solid rgba(0,82,255,0.15)',
                  fontSize: '13px', lineHeight: 1.7, color: 'var(--foreground)',
                }}>
                  {gaps.suggestions.split('\n').map((para, i) => para.trim() && (
                    <p key={i} style={{ margin: 0, marginBottom: i < gaps.suggestions.split('\n').length - 1 ? '10px' : 0 }}>{para}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Restart CTA */}
            <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn" onClick={() => { setStage(0); setJdText(''); setJdId(null); }}>
                <span className="mat-icon" style={{ fontSize: '15px' }}>refresh</span> Analyze New JD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
