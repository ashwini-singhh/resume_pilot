/**
 * EntryImprover — 3-Stage Entry Enhancement Pipeline
 *
 * Step 0: Recruiter Evaluation Report (READ-ONLY analysis, no modification)
 *   → Score, strength level, issues, context gaps, targeted questions
 * Step 1: Targeted Interview Chat (context extraction)
 *   → Pre-seeded with the questions from Step 0
 * Step 2: Industry-Grade Proposal (STAR + ATS rewrite + word diff)
 *   → Accept | Modify | Reject
 */

import React, { useState, useEffect, useRef } from 'react';
import { evaluateEntry, entryInterviewTurn, improveEntry, acceptImprovement, rejectImprovement } from '../lib/api';

// ── Word-level diff renderer ─────
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

// ── Step indicator ─────
function StepDots({ current }) {
  const steps = ['Evaluation', 'Interview', 'Proposal'];
  return (
    <div style={{ display: 'flex', gap: '0', alignItems: 'center', marginBottom: '20px' }}>
      {steps.map((label, i) => {
        const step = i;
        const done = current > step;
        const active = current === step;
        return (
          <React.Fragment key={label}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '72px' }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: 700,
                background: done ? '#22c55e' : active ? 'var(--accent)' : 'var(--muted)',
                color: (done || active) ? '#fff' : 'var(--muted-foreground)',
                transition: 'all 0.3s',
                boxShadow: active ? '0 0 0 3px rgba(0,82,255,0.15)' : 'none',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '10px', fontWeight: active ? 600 : 400, color: active ? 'var(--foreground)' : 'var(--muted-foreground)', textAlign: 'center' }}>
                {label}
              </span>
            </div>
            {i < 2 && <div style={{ flex: 1, height: '2px', background: done ? '#22c55e' : 'var(--border)', transition: 'background 0.3s', marginBottom: '16px' }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Score Ring ─────
function ScoreRing({ score }) {
  if (score === null || score === undefined) return null;
  const color = score >= 8 ? '#22c55e' : score >= 6 ? '#f59e0b' : score >= 4 ? '#f97316' : '#ef4444';
  const label = score >= 9 ? 'Exceptional' : score >= 7 ? 'Strong' : score >= 4 ? 'Average' : 'Weak';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
      <div style={{
        width: '64px', height: '64px', borderRadius: '50%',
        border: `3px solid ${color}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: `${color}14`, flexShrink: 0,
      }}>
        <div style={{ fontSize: '18px', fontWeight: 700, color, lineHeight: 1 }}>{score.toFixed(1)}</div>
        <div style={{ fontSize: '8px', color: 'var(--muted-foreground)', lineHeight: 1 }}>/ 10</div>
      </div>
      <div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
          background: `${color}18`, color,
        }}>
          {label}
        </span>
        <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', margin: '4px 0 0 0' }}>
          Impact Score
        </p>
      </div>
    </div>
  );
}

// ── Chip ─────
function Chip({ text, variant = 'issue' }) {
  const styles = {
    issue: { bg: 'rgba(239,68,68,0.08)', color: '#dc2626', border: 'rgba(239,68,68,0.2)' },
    gap: { bg: 'rgba(245,158,11,0.08)', color: '#b45309', border: 'rgba(245,158,11,0.2)' },
  };
  const s = styles[variant];
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: '16px',
      fontSize: '11px', fontWeight: 500, margin: '3px 4px 3px 0',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {text}
    </span>
  );
}

// ── Question Card ─────
function QuestionCard({ question, index }) {
  return (
    <div style={{
      display: 'flex', gap: '10px', alignItems: 'flex-start',
      padding: '10px 12px', borderRadius: '10px',
      background: 'rgba(0,82,255,0.04)', border: '1px solid rgba(0,82,255,0.12)',
      marginBottom: '6px',
    }}>
      <span style={{
        width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent)',
        color: '#fff', fontSize: '10px', fontWeight: 700, display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px',
      }}>
        {index + 1}
      </span>
      <span style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--foreground)' }}>{question}</span>
    </div>
  );
}


// ── Global Cache (Client-side persistence for the session) ─────
const evaluationCache = {};
const interviewCache = {};
const proposalCache = {};

export default function EntryImprover({ entry, entryId, section, userContext, userId, contextId, onAccept, onClose }) {
  const [step, setStep] = useState(0);     // 0=evaluation, 1=interview, 2=proposal
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [status, setStatus] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [evaluation, setEvaluation] = useState(null);   // Step 0 data

  const chatContainerRef = useRef(null);
  const abortRef = useRef(false);
  const MAX_TURNS = 6;

  const entryLabel = entry?.company || entry?.name || 'Entry';
  const preQuestions = evaluation?.follow_up_questions || [];

  // Generate a unique key for this entry
  const cacheKey = `${userId || 'anon'}_${contextId || 'none'}_${section}_${entryId}`;

  // ── Auto-scroll chat ─────
  useEffect(() => {
    if (chatContainerRef.current) {
      requestAnimationFrame(() => {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      });
    }
  }, [messages, status]);

  // ── Step 0: Fetch evaluation on mount ─────
  useEffect(() => {
    if (!entry) return;
    abortRef.current = false;

    // Check Cache first
    if (evaluationCache[cacheKey]) {
      setEvaluation(evaluationCache[cacheKey]);
      setStatus('idle');
      return;
    }

    const runEvaluation = async () => {
      setStatus('loading');
      try {
        // Use user_id + context_id if provided (server-side lookup), else fall back to direct entry
        let evalResult;
        if (userId && contextId && entryId) {
          evalResult = await evaluateEntry({ user_id: userId, context_id: contextId, entry_id: entryId, section });
        } else {
          // Fallback
          evalResult = {
            entry_id: entryId,
            score: null,
            strength_level: null,
            issues: [],
            context_gaps: [],
            reasoning: 'Could not load evaluation — proceeding to interview.',
            follow_up_questions: [],
          };
        }
        if (abortRef.current) return;
        
        // Save to cache
        evaluationCache[cacheKey] = evalResult;
        
        setEvaluation(evalResult);
        setStatus('idle');
      } catch (err) {
        if (abortRef.current) return;
        // Non-fatal: show error but allow proceeding
        setEvaluation({
          entry_id: entryId,
          score: null,
          strength_level: null,
          issues: [],
          context_gaps: [],
          reasoning: `Evaluation unavailable: ${err.message}`,
          follow_up_questions: [],
        });
        setStatus('idle');
      }
    };

    runEvaluation();
    return () => { abortRef.current = true; };
  }, [entry, entryId, section, cacheKey]);

  // ── Step 1: Start interview (pre-seeded with questions from evaluation) ─────
  const startInterview = async () => {
    setStep(1);
    
    // Check Cache for initial turn
    const initialTurnKey = `${cacheKey}_initial`;
    if (interviewCache[initialTurnKey]) {
      const resp = interviewCache[initialTurnKey];
      const newHistory = [{ role: 'assistant', content: resp.reply_text }];
      setMessages(newHistory);
      setConfidence(resp.confidence_score || 0);
      if (resp.ready_to_propose) {
        setStatus('generating_proposal');
        triggerProposal(newHistory);
      } else {
        setStatus('idle');
      }
      return;
    }

    setStatus('loading');
    try {
      const resp = await entryInterviewTurn({
        section, entry, entry_id: entryId,
        chat_history: [],
        user_context: userContext,
        pre_identified_questions: preQuestions,
      });
      if (abortRef.current) return;

      // Save to cache
      interviewCache[initialTurnKey] = resp;

      const newHistory = [{ role: 'assistant', content: resp.reply_text }];
      setMessages(newHistory);
      setConfidence(resp.confidence_score || 0);
      if (resp.ready_to_propose) {
        setStatus('generating_proposal');
        triggerProposal(newHistory);
      } else {
        setStatus('idle');
      }
    } catch (err) {
      if (abortRef.current) return;
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const handleSend = () => {
    if (!chatInput.trim() || status !== 'idle') return;
    const newHistory = [...messages, { role: 'user', content: chatInput.trim() }];
    setMessages(newHistory);
    setChatInput('');
    performTurn(newHistory);
  };

  const performTurn = async (currentHistory) => {
    // Check Cache for this specific turn
    const turnKey = `${cacheKey}_${JSON.stringify(currentHistory)}`;
    if (interviewCache[turnKey]) {
      const resp = interviewCache[turnKey];
      const newHistory = [...currentHistory, { role: 'assistant', content: resp.reply_text }];
      setMessages(newHistory);
      setConfidence(resp.confidence_score || 0);

      const userTurnCount = newHistory.filter(m => m.role === 'user').length;
      if (resp.ready_to_propose || userTurnCount >= MAX_TURNS) {
        setStatus('generating_proposal');
        triggerProposal(newHistory);
      } else {
        setStatus('idle');
      }
      return;
    }

    setStatus('loading');
    try {
      const resp = await entryInterviewTurn({
        section, entry, entry_id: entryId,
        chat_history: currentHistory,
        user_context: userContext,
        pre_identified_questions: preQuestions,
      });
      if (abortRef.current) return;

      // Save to cache
      interviewCache[turnKey] = resp;

      const newHistory = [...currentHistory, { role: 'assistant', content: resp.reply_text }];
      setMessages(newHistory);
      setConfidence(resp.confidence_score || 0);

      const userTurnCount = newHistory.filter(m => m.role === 'user').length;
      if (resp.ready_to_propose || userTurnCount >= MAX_TURNS) {
        setStatus('generating_proposal');
        triggerProposal(newHistory);
      } else {
        setStatus('idle');
      }
    } catch (err) {
      if (abortRef.current) return;
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const triggerProposal = async (history) => {
    // Check Cache first - use a key that includes history to ensure context
    const historyKey = JSON.stringify(history);
    const fullPropKey = `${cacheKey}_${historyKey}`;

    if (proposalCache[fullPropKey]) {
      setResult(proposalCache[fullPropKey]);
      setStep(2);
      setStatus('idle');
      return;
    }

    try {
      const res = await improveEntry({
        section, entry, entry_id: entryId, chat_history: history, user_context: userContext
      });
      if (abortRef.current) return;

      // Save to cache
      proposalCache[fullPropKey] = res;

      setResult(res);
      setStep(2);
      setStatus('idle');
    } catch (err) {
      if (abortRef.current) return;
      setErrorMsg('Failed to generate proposal: ' + err.message);
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

  const handleModify = () => {
    setResult(null);
    setStep(1);
    const newHistory = [
      ...messages,
      { role: 'assistant', content: "Let's refine further. What specifically would you like to adjust or add?" }
    ];
    setMessages(newHistory);
    setStatus('idle');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={e => { if (e.target.className === 'modal-overlay') onClose(); }}>
      <div className="animate-in" style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '28px',
        width: '100%',
        maxWidth: '660px',
        minHeight: '580px',
        height: '85vh',
        maxHeight: '92vh',
        boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="mat-icon" style={{ color: 'var(--accent)', fontSize: '20px' }}>workspace_premium</span>
              Improve: {entryLabel}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
              {section === 'experience' ? 'Work Experience' : 'Project'}
              {step === 1 && (
                <span style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', marginLeft: '8px' }}>
                  {messages.filter(m => m.role === 'user').length} / {MAX_TURNS} Turns
                </span>
              )}
            </p>
          </div>
          <button className="card-edit" onClick={onClose}>
            <span className="mat-icon">close</span>
          </button>
        </div>

        <StepDots current={step} />

        {/* ═══ STEP 0: EVALUATION REPORT ═══ */}
        {step === 0 && (
          <div className="animate-in" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            {status === 'loading' ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted-foreground)' }}>
                <span className="mat-icon" style={{ fontSize: '36px', display: 'block', marginBottom: '12px', color: 'var(--accent)', animation: 'spin 1.5s linear infinite' }}>analytics</span>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Analyzing entry as a recruiter…</div>
                <div style={{ fontSize: '11px', marginTop: '6px', opacity: 0.7 }}>Reading bullets, detecting gaps, generating questions</div>
              </div>
            ) : evaluation ? (
              <>
                {/* Score ring + strength level */}
                <ScoreRing score={evaluation.score} />

                {/* Reasoning */}
                {evaluation.reasoning && (
                  <div style={{
                    padding: '12px 14px', borderRadius: '10px', marginBottom: '16px',
                    background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)',
                    fontSize: '12px', color: 'var(--muted-foreground)', lineHeight: 1.7,
                    fontStyle: 'italic',
                  }}>
                    <span className="mat-icon" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '6px', color: 'var(--muted-foreground)' }}>format_quote</span>
                    {evaluation.reasoning}
                  </div>
                )}

                {/* Issues */}
                {evaluation.issues?.length > 0 && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span className="mat-icon" style={{ fontSize: '13px' }}>warning</span> Issues Found
                    </div>
                    <div>
                      {evaluation.issues.map((issue, i) => <Chip key={i} text={issue} variant="issue" />)}
                    </div>
                  </div>
                )}

                {/* Context Gaps */}
                {evaluation.context_gaps?.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span className="mat-icon" style={{ fontSize: '13px' }}>search</span> Missing Context
                    </div>
                    <div>
                      {evaluation.context_gaps.map((gap, i) => <Chip key={i} text={gap} variant="gap" />)}
                    </div>
                  </div>
                )}

                {/* Follow-up questions */}
                {evaluation.follow_up_questions?.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span className="mat-icon" style={{ fontSize: '13px' }}>quiz</span> Interview Questions
                    </div>
                    {evaluation.follow_up_questions.map((q, i) => <QuestionCard key={i} question={q} index={i} />)}
                    <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '8px' }}>
                      The AI interview will use these questions to extract the missing context from you.
                    </p>
                  </div>
                )}

                {/* CTA */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexShrink: 0, paddingTop: '8px' }}>
                  <button className="btn" onClick={onClose}>Skip</button>
                  <button className="btn btn-primary" onClick={startInterview}>
                    <span className="mat-icon" style={{ fontSize: '15px' }}>chat</span>
                    Start Interview →
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ═══ STEP 1: TARGETED INTERVIEW CHAT ═══ */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* Confidence bar */}
            {messages.length > 0 && status !== 'generating_proposal' && (
              <div style={{ height: '3px', background: 'var(--border)', width: '100%', borderRadius: '2px', marginBottom: '12px', overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ width: `${confidence}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.5s ease' }} />
              </div>
            )}

            {/* Chat messages */}
            <div
              ref={chatContainerRef}
              style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', paddingBottom: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '85%', padding: '10px 14px', borderRadius: '14px',
                    fontSize: '13px', lineHeight: 1.5,
                    background: m.role === 'user' ? 'var(--accent)' : 'var(--secondary)',
                    color: m.role === 'user' ? '#fff' : 'var(--foreground)',
                    boxShadow: m.role === 'user' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                    borderBottomRightRadius: m.role === 'user' ? '4px' : '14px',
                    borderBottomLeftRadius: m.role === 'assistant' ? '4px' : '14px',
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}

              {status === 'loading' && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ padding: '8px 14px', borderRadius: '14px', background: 'var(--secondary)', color: 'var(--muted-foreground)', fontSize: '13px' }}>
                    <span className="mat-icon" style={{ fontSize: '14px', animation: 'spin 1s linear infinite', verticalAlign: 'middle' }}>autorenew</span>
                  </div>
                </div>
              )}

              {status === 'generating_proposal' && (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted-foreground)' }}>
                  <span className="mat-icon" style={{ fontSize: '32px', marginBottom: '12px', display: 'block', color: 'var(--accent)', animation: 'pulse 1.5s infinite' }}>auto_awesome</span>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Crafting industry-grade bullets…</div>
                  <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>Applying STAR framework + ATS optimization</div>
                </div>
              )}
            </div>

            {/* Chat input */}
            {status !== 'generating_proposal' && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexShrink: 0 }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' ? handleSend() : null}
                  placeholder="Type your answer…"
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '24px', border: '1px solid var(--border)', fontSize: '13px', background: 'var(--card)' }}
                  disabled={status !== 'idle'}
                />
                <button
                  onClick={handleSend}
                  disabled={status !== 'idle' || !chatInput.trim()}
                  style={{
                    background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '50%',
                    width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: (status !== 'idle' || !chatInput.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (status !== 'idle' || !chatInput.trim()) ? 0.6 : 1,
                  }}
                >
                  <span className="mat-icon" style={{ fontSize: '18px' }}>send</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 2: PROPOSAL + DIFF ═══ */}
        {step === 2 && result && (
          <div className="animate-in" style={{ flex: 1, overflowY: 'auto' }}>
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
                <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginBottom: '14px', display: 'flex', gap: '10px' }}>
                  <span style={{ background: 'rgba(34,197,94,0.15)', color: '#15803d', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>🟢 Added</span>
                  <span style={{ background: 'rgba(239,68,68,0.12)', color: '#dc2626', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>🔴 Removed</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                  {result.bullet_diffs?.map((diff, i) => (
                    <div key={i} style={{
                      borderRadius: '10px',
                      border: `1px solid ${diff.changed ? 'rgba(34,197,94,0.25)' : 'var(--border)'}`,
                      overflow: 'hidden',
                    }}>
                      <div style={{ padding: '8px 14px', background: 'rgba(239,68,68,0.04)', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Before</span>
                        <div style={{ marginTop: '4px', color: '#64748b', lineHeight: 1.6 }}>• {diff.original}</div>
                      </div>
                      <div style={{ padding: '8px 14px', background: diff.changed ? 'rgba(34,197,94,0.04)' : 'transparent', fontSize: '12px' }}>
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
              <button className="btn" onClick={handleReject} style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#dc2626' }}>
                <span className="mat-icon" style={{ fontSize: '15px' }}>close</span> Reject
              </button>
              <button className="btn" onClick={handleModify}>
                <span className="mat-icon" style={{ fontSize: '15px' }}>edit</span> Modify
              </button>
              <button className="btn btn-primary" onClick={handleAccept} disabled={!result.changed}>
                <span className="mat-icon" style={{ fontSize: '15px' }}>check</span> Accept
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px', padding: '12px 16px', color: '#dc2626', fontSize: '13px', marginTop: '12px',
            flexShrink: 0,
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
