/** [RESUME_SAILOR_SYNC] 2026-04-26 11:32
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
  cloneProfile,
} from '../lib/api';
import ResumePreview from './ResumePreview';
import MicroFeedback from './MicroFeedback';
// [RESUME_SAILOR_SYNC] 2026-04-26 11:32
import { useMemo } from 'react';

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
  const stages = ['Scoring', 'ATS Optimization', 'Gap Analysis', 'Finish & Export'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '28px' }}>
      {stages.map((label, i) => {
        const num = i + 1;
        const done = stage > num;
        const active = stage === num;
        return (
          <React.Fragment key={label}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '70px' }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700,
                background: done ? '#22c55e' : active ? 'var(--accent)' : 'var(--muted)',
                color: (done || active) ? '#fff' : 'var(--muted-foreground)',
                transition: 'all 0.3s', boxShadow: active ? '0 0 0 4px rgba(0,82,255,0.15)' : 'none',
              }}>
                {done ? <span className="mat-icon" style={{ fontSize: '12px' }}>check</span> : num}
              </div>
              <span style={{ fontSize: '9px', fontWeight: active ? 700 : 400, color: active ? 'var(--foreground)' : 'var(--muted-foreground)', textAlign: 'center' }}>
                {label}
              </span>
            </div>
            {i < 3 && (
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

export default function JDPipeline({ userId, contextId, profile }) {
  // Pipeline state
  const [stage, setStage] = useState(0);   // 0=upload, 1=scored, 2=optimized, 3=gaps, 4=finish
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSaved, setIsSaved] = useState(false);

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

  // UI state
  const [expandedSections, setExpandedSections] = useState(new Set(['Work Experience', 'Projects']));
  const [gaps, setGaps] = useState(null);
  const [customFinalProfile, setCustomFinalProfile] = useState(null); // For direct edits in Stage 4

  // ── Dynamic Scoring Logic ──────────────────────────────────────────────────
  const alignmentScore = useMemo(() => {
    if (scoredEntries.length === 0) return 0;
    
    // Calculate total possible points from all positive KEEP/OPTIONAL entries
    const totalPotential = scoredEntries.reduce((acc, e) => acc + (e.score > 0 ? e.score : 0), 0);
    if (totalPotential === 0) return 0;

    // Calculate sum of scores for CURRENTLY SELECTED items
    const selectedTotal = scoredEntries.reduce((acc, e) => {
      if (selectedIds.has(e.entry_id)) return acc + (e.score > 0 ? e.score : 0);
      return acc;
    }, 0);

    return Math.round((selectedTotal / totalPotential) * 100);
  }, [scoredEntries, selectedIds]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const toggleSectionExpand = (sec) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sec)) next.delete(sec); else next.add(sec);
      return next;
    });
  };

  // ── Derived Profile Logic (Live Preview) ────────────────────────────────────
  const derivedProfile = useMemo(() => {
    if (!profile) return null;
    
    const newProfile = JSON.parse(JSON.stringify(profile));

    // Stability Fix: instead of filtering (which shifts indices), 
    // we match exactly against the IDs used in ResumePreview.
    const processSection = (items, sectionKey) => {
      if (!items) return [];
      
      return items.map((entry, idx) => {
        const eid = sectionKey === 'experience' ? `exp_${idx}` : `proj_${idx}`;
        const isSelected = selectedIds.has(eid) || stage < 1;

        // Apply optimizations to the entry itself
        const suggestion = optimizedSuggestions.find(s => s.entry_id === eid);
        const status = suggestion ? suggestionStatuses[suggestion.suggestion_id] : null;
        let processedEntry = { ...entry };

        // SHOW DIFF IF: Stage is 2 AND (Status is Pending OR Accepted)
        if (stage === 2 && (status === 'pending' || status === 'accepted')) {
          const newBullets = (suggestion.bullet_diffs || []).map(diff => {
            if (diff.changed) return <WordDiff tokens={diff.diff_tokens} />;
            return diff.optimized || diff.original;
          });
          processedEntry.bullets = newBullets;
        }

        
        // Handle nested projects for experience
        if (sectionKey === 'experience' && entry.projects) {
          processedEntry.projects = entry.projects.map((p, pIdx) => {
            const pid = `${eid}_proj_${pIdx}`;
            const isPSelected = selectedIds.has(pid) || stage < 1;
            
            // Check for SUGGESTIONS on this nested project
            const pSuggestion = optimizedSuggestions.find(s => s.entry_id === pid);
            const pStatus = pSuggestion ? suggestionStatuses[pSuggestion.suggestion_id] : null;
            
            let processedProj = { ...p };
            if (stage === 2 && (pStatus === 'pending' || pStatus === 'accepted')) {
              processedProj.bullets = (pSuggestion.bullet_diffs || []).map(diff => {
                if (diff.changed) return <WordDiff tokens={diff.diff_tokens} />;
                return diff.optimized || diff.original;
              });
            }


            return isPSelected ? processedProj : null;
          }).filter(Boolean);
        }

        const hasVisibleChildren = sectionKey === 'experience' && (processedEntry.projects || []).length > 0;

        // If not selected AND no selected children, hide the entry
        if (stage >= 1 && !isSelected && !hasVisibleChildren) return null;

        return processedEntry;
      }).filter(Boolean);
    };


    newProfile.experience = processSection(newProfile.experience, 'experience');
    newProfile.projects = processSection(newProfile.projects, 'projects');
    return newProfile;
  }, [profile, selectedIds, optimizedSuggestions, suggestionStatuses, stage]);

  // Use either the derived profile or the user's customized final version
  const activeProfile = customFinalProfile || derivedProfile;

  // Group scored entries by their hierarchy for the left panel
  const groupedEntries = useMemo(() => {
    const groups = {
      'Work Experience': [],
      'Projects': [],
      'Achievements': [],
      'Summary': []
    };

    scoredEntries.forEach(entry => {
      if (entry.entry_id.startsWith('exp_') && !entry.entry_id.includes('_proj_')) {
        groups['Work Experience'].push(entry);
      } else if (entry.entry_id.startsWith('proj_')) {
        groups['Projects'].push(entry);
      } else if (entry.entry_id === 'achievements') {
        groups['Achievements'].push(entry);
      } else if (entry.entry_id === 'summary') {
        groups['Summary'].push(entry);
      }
    });

    return groups;
  }, [scoredEntries]);

  // Find child projects for a specific experience ID
  const getSubProjects = (expId) => {
    return scoredEntries.filter(e => e.entry_id.startsWith(`${expId}_proj_`));
  };

  const getEntryName = (eid) => {
    const entry = scoredEntries.find(e => e.entry_id === eid);
    if (!entry) return eid;
    return entry.entry?.company || entry.entry?.name || eid;
  };



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
      
      // Fetch Gaps immediately so user sees what is "lagging"
      try {
        const gapRes = await analyzeGaps({ jd_id: res.jd_id, user_id: userId, context_id: contextId });
        setGaps(gapRes);
      } catch (ge) { console.error("Gap fetch failed", ge); }

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

  const handleFinish = () => {
    // Take a snapshot of current derived profile to allow "Stage 4" editing
    setCustomFinalProfile(JSON.parse(JSON.stringify(derivedProfile)));
    setStage(4);
  };

  const handleSaveAsProfile = async () => {
    setLoading(true); setError('');
    try {
      const name = `Optimized: ${jdTitle || 'Untitled'} @ ${jdCompany || 'Unknown'}`;
      await cloneProfile({
        userId,
        profileName: name,
        profileData: activeProfile
      });
      setIsSaved(true);
      alert("Successfully saved as a new Persona! You can find it in the sidebar.");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ 
      display: 'flex', 
      borderTop: '1px solid var(--border)'
    }}>

      {/* LEFT PANEL: Controls (35%) */}
      <div style={{ 
        flex: '0 0 380px', 
        borderRight: '1px solid var(--border)', 
        overflowY: 'auto',
        padding: '24px',
        background: 'var(--card)'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontFamily: 'Calistoga, serif', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="mat-icon" style={{ fontSize: '24px', color: 'var(--accent)' }}>work_history</span>
            JD Match Engine
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
            Notion-style interactive optimization
          </p>
        </div>

        {stage > 0 && <StageProgress stage={stage} />}

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px', padding: '12px 16px', color: '#dc2626', fontSize: '12px', marginBottom: '16px',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span className="mat-icon" style={{ fontSize: '16px' }}>error</span> {error}
          </div>
        )}

        {/* ════ STAGE 0: JD Upload ════ */}
        {stage === 0 && (
          <div className="animate-in">
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{fontSize: '11px'}}>Role & Company</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Title"
                  value={jdTitle}
                  onChange={e => setJdTitle(e.target.value)}
                  style={{ marginBottom: '8px', fontSize: '13px' }}
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={jdCompany}
                  onChange={e => setJdCompany(e.target.value)}
                  style={{ marginBottom: '8px', fontSize: '13px' }}
                />
              </div>
            </div>
            <label className="form-label" style={{fontSize: '11px'}}>Job Description</label>
            <textarea
              rows={12}
              placeholder="Paste job description..."
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              style={{ fontSize: '13px', resize: 'none', background: 'var(--muted)', border: 'none' }}
            />
            <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading} style={{ width: '100%', marginTop: '16px' }}>
              {loading ? 'Analyzing...' : 'Begin Matching'}
            </button>
          </div>
        )}

        {/* ════ STAGE 1: Scored Entries ════ */}
        {stage === 1 && (
          <div className="animate-in">
            {summary && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, var(--accent), #1d4ed8)',
                  borderRadius: '16px',
                  padding: '24px',
                  color: 'white',
                  textAlign: 'center',
                  boxShadow: '0 8px 24px rgba(0,82,255,0.2)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    Overall Alignment
                  </div>
                  <div style={{ fontSize: '42px', fontWeight: 900, fontFamily: 'Calistoga, serif' }}>
                    {alignmentScore}%
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
                    Match Quality Score
                  </div>
                  {/* Subtle decorative ring */}
                  <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '100px', height: '100px', border: '15px solid rgba(255,255,255,0.05)', borderRadius: '50%' }} />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <div style={{ flex: 1, padding: '8px', background: 'rgba(34,197,94,0.05)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(34,197,94,0.1)' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#22c55e' }}>{summary.keep}</div>
                    <div style={{ fontSize: '9px', color: 'var(--muted-foreground)' }}>KEEP</div>
                  </div>
                  <div style={{ flex: 1, padding: '8px', background: 'rgba(234,179,8,0.05)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(234,179,8,0.1)' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>{summary.optional}</div>
                    <div style={{ fontSize: '9px', color: 'var(--muted-foreground)' }}>MAYBE</div>
                  </div>
                  <div style={{ flex: 1, padding: '8px', background: 'rgba(239,68,68,0.05)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(239,68,68,0.1)' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#ef4444' }}>{summary.remove}</div>
                    <div style={{ fontSize: '9px', color: 'var(--muted-foreground)' }}>HIDDEN</div>
                  </div>
                </div>
              </div>
            )}

            {/* Global Lagging Skills */}
            {gaps && gaps.missing_skills?.length > 0 && (
              <div style={{ 
                background: 'rgba(239,68,68,0.03)', 
                border: '1px solid rgba(239,68,68,0.15)', 
                borderRadius: '12px', 
                padding: '14px', 
                marginBottom: '24px' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '12px', fontWeight: 700, color: '#dc2626' }}>
                  <span className="mat-icon" style={{ fontSize: '16px' }}>running_with_errors</span>
                  Lagging Skills (JD Gaps)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {gaps.missing_skills.map(s => (
                    <span key={s} style={{ padding: '2px 8px', background: 'rgba(239,68,68,0.08)', borderRadius: '6px', fontSize: '10px', color: '#dc2626', fontWeight: 600 }}>
                      {s}
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: '10px', color: 'var(--muted-foreground)', marginTop: '10px', fontStyle: 'italic' }}>
                   These are required by the JD but missing from your entire resume.
                </p>
              </div>
            )}


            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.entries(groupedEntries).map(([sectionName, items]) => {
                if (items.length === 0) return null;
                const isExpanded = expandedSections.has(sectionName);
                
                return (
                  <div key={sectionName} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                    <div 
                      onClick={() => toggleSectionExpand(sectionName)}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', 
                        cursor: 'pointer', marginBottom: '12px',
                        fontSize: '11px', fontWeight: 700, color: 'var(--muted-foreground)',
                        textTransform: 'uppercase', letterSpacing: '0.05em'
                      }}
                    >
                      <span className="mat-icon" style={{ fontSize: '16px', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>expand_more</span>
                      {sectionName}
                      <span style={{ marginLeft: 'auto', background: 'var(--muted)', padding: '2px 8px', borderRadius: '10px', fontSize: '9px' }}>{items.length}</span>
                    </div>

                    {isExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px' }}>
                        {items.map(entry => {
                          const eid = entry.entry_id;
                          const isSelected = selectedIds.has(eid);
                          const scoreColor = entry.score >= 7 ? '#22c55e' : entry.score >= 4 ? '#f59e0b' : '#ef4444';
                          const subProjects = sectionName === 'Work Experience' ? getSubProjects(eid) : [];
                          
                          return (
                            <div key={eid} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div 
                                onClick={() => toggleEntry(eid)}
                                className="notion-item"
                                style={{
                                  padding: '12px',
                                  borderRadius: '10px',
                                  border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                                  background: isSelected ? 'rgba(0,82,255,0.03)' : 'var(--card)',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                }}
                              >
                                <div style={{ display: 'flex', gap: '12px' }}>
                                  <div style={{ 
                                    width: '24px', height: '24px', borderRadius: '50%', 
                                    border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                                    background: isSelected ? 'var(--accent)' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '0px',
                                    flexShrink: 0, transition: 'all 0.2s',
                                    color: isSelected ? 'white' : 'var(--muted-foreground)'
                                  }}>
                                    <span className="mat-icon" style={{ fontSize: '16px' }}>{isSelected ? 'remove' : 'add'}</span>
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                      <span style={{ fontWeight: 700, fontSize: '13px', color: isSelected ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
                                        {entry.entry?.company || entry.entry?.name}
                                      </span>
                                      <span style={{ fontSize: '11px', fontWeight: 800, color: isSelected ? scoreColor : 'var(--muted)' }}>{entry.score.toFixed(1)}</span>
                                    </div>
                                    <p style={{ fontSize: '11px', color: isSelected ? 'var(--muted-foreground)' : 'var(--muted)', marginTop: '6px', lineHeight: 1.5, margin: 0 }}>
                                      {entry.reasoning}
                                    </p>

                                    {/* Keywords Summary */}
                                    {isSelected && (entry.matched_keywords?.length > 0 || entry.missing_keywords?.length > 0) && (
                                      <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {entry.matched_keywords?.slice(0, 3).map(kw => (
                                          <span key={kw} style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(34,197,94,0.1)', color: '#15803d', fontWeight: 600 }}>
                                            {kw}
                                          </span>
                                        ))}
                                        {entry.missing_keywords?.slice(0, 3).map(kw => (
                                          <span key={kw} style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.06)', color: '#dc2626', fontWeight: 600, border: '1px solid rgba(239,68,68,0.1)' }}>
                                            {kw}
                                          </span>
                                        ))}
                                      </div>
                                    )}


                                  </div>
                                </div>
                              </div>

                              {/* Nested Sub-Projects */}
                              {subProjects.length > 0 && (
                                <div style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', borderLeft: '1px solid var(--border)', marginLeft: '8px' }}>
                                  {subProjects.map(sub => {
                                    const sid = sub.entry_id;
                                    const isSubSelected = selectedIds.has(sid);
                                    const sColor = sub.score >= 7 ? '#22c55e' : sub.score >= 4 ? '#f59e0b' : '#ef4444';
                                    return (
                                      <div key={sid} 
                                        onClick={(e) => { e.stopPropagation(); toggleEntry(sid); }}
                                        style={{
                                          padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                                          border: `1px solid ${isSubSelected ? 'var(--accent)' : 'transparent'}`,
                                          background: isSubSelected ? 'rgba(0,82,255,0.02)' : 'transparent',
                                          display: 'flex', flexDirection: 'column', gap: '4px'
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                          <div style={{ 
                                            width: '20px', height: '20px', borderRadius: '50%', 
                                            border: `1.5px solid ${isSubSelected ? 'var(--accent)' : 'var(--border)'}`,
                                            background: isSubSelected ? 'var(--accent)' : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0, transition: 'all 0.2s',
                                            color: isSubSelected ? 'white' : 'var(--muted-foreground)'
                                          }}>
                                            <span className="mat-icon" style={{ fontSize: '14px' }}>{isSubSelected ? 'remove' : 'add'}</span>
                                          </div>
                                          <span style={{ fontSize: '12px', fontWeight: 600, flex: 1, color: isSubSelected ? 'var(--foreground)' : 'var(--muted-foreground)' }}>{sub.entry?.name}</span>
                                          <span style={{ fontSize: '10px', fontWeight: 700, color: isSubSelected ? sColor : 'var(--muted)' }}>{sub.score.toFixed(1)}</span>
                                        </div>
                                        
                                        <p style={{ fontSize: '11px', color: isSubSelected ? 'var(--muted-foreground)' : 'var(--muted)', lineHeight: 1.4, margin: 0, paddingLeft: '30px' }}>
                                          {sub.reasoning}
                                        </p>

                                        {isSubSelected && (sub.matched_keywords?.length > 0 || sub.missing_keywords?.length > 0) && (
                                          <div style={{ paddingLeft: '24px', display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                            {sub.matched_keywords?.slice(0, 3).map(kw => (
                                              <span key={kw} style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(34,197,94,0.08)', color: '#166534' }}>
                                                {kw}
                                              </span>
                                            ))}
                                            {sub.missing_keywords?.slice(0, 3).map(kw => (
                                              <span key={kw} style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.05)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.1)' }}>
                                                {kw}
                                              </span>
                                            ))}
                                          </div>
                                        )}

                                      </div>

                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>


            <button className="btn btn-primary" onClick={handleOptimize} disabled={loading || selectedIds.size === 0} style={{ width: '100%', marginTop: '20px' }}>
              {loading ? 'Optimizing...' : `Optimize ${selectedIds.size} Selected`}
            </button>
          </div>
        )}

        {/* ════ STAGE 2: ATS Diff View ════ */}
        {stage === 2 && (
          <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Accept Suggestions</span>
              <button className="btn btn-primary" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={handleAcceptAll}>Accept All</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {optimizedSuggestions.map(sug => {
                const status = suggestionStatuses[sug.suggestion_id] || 'pending';
                const displayName = getEntryName(sug.entry_id);
                
                return (
                  <div key={sug.suggestion_id} style={{
                    border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden',
                    background: 'var(--card)', boxShadow: status === 'pending' ? '0 4px 12px rgba(0,0,0,0.03)' : 'none',
                    opacity: status === 'rejected' ? 0.6 : 1,
                    transition: 'all 0.3s'
                  }}>
                    <div style={{ padding: '10px 14px', background: 'var(--muted)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted-foreground)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{displayName}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MicroFeedback feature="jd_optimization_suggestion" context={{ entry_id: sug.entry_id, suggestion_id: sug.suggestion_id }} size={14} />
                        <span style={{ opacity: 0.5 }}>{sug.entry_id}</span>
                      </div>
                    </div>
                    
                    <div style={{ padding: '14px' }}>
                      {status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button style={{ flex: 1, padding: '8px', background: 'rgba(239,68,68,0.06)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.1)', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleReject(sug.suggestion_id)}>Reject</button>
                          <button style={{ flex: 1, padding: '8px', background: 'rgba(34,197,94,0.08)', color: '#15803d', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleAccept(sug.suggestion_id)}>Accept</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: status === 'accepted' ? '#22c55e' : '#ef4444' }}>
                          <span className="mat-icon" style={{ fontSize: '16px' }}>{status === 'accepted' ? 'check_circle' : 'cancel'}</span>
                          {status.toUpperCase()}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>


            <button className="btn btn-primary" onClick={handleGapAnalysis} disabled={loading} style={{ width: '100%', marginTop: '20px' }}>
              {loading ? 'Analyzing Gaps...' : 'View Final Gaps →'}
            </button>
          </div>
        )}
        {/* ════ STAGE 3: Gap Analysis ════ */}
        {stage === 3 && gaps && (
          <div className="animate-in">
            <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>Missing Skills</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
              {gaps.missing_skills?.map(s => (
                <span key={s} style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '6px', fontSize: '11px', color: '#dc2626' }}>{s}</span>
              ))}
            </div>
            <button className="btn btn-primary" onClick={handleFinish} style={{ width: '100%', marginTop: '20px' }}>
              Finalize & Preview →
            </button>
          </div>
        )}

        {/* ════ STAGE 4: Final Preview & Export ════ */}
        {stage === 4 && (
          <div className="animate-in">
             <div style={{ padding: '20px', background: 'rgba(34,197,94,0.05)', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.15)', marginBottom: '24px', textAlign: 'center' }}>
                <span className="mat-icon" style={{ fontSize: '32px', color: '#22c55e', marginBottom: '8px' }}>beenhere</span>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--foreground)' }}>Ready for Export!</div>
                <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
                  Your resume has been optimized for the AI screening process. Perform final tweaks on the right.
                </p>
             </div>

             <div className="flex-column gap-3">
                <button className="btn btn-primary" onClick={handleSaveAsProfile} disabled={loading || isSaved} style={{ width: '100%', background: isSaved ? '#22c55e' : 'var(--accent)' }}>
                  <span className="mat-icon">{isSaved ? 'check' : 'save'}</span>
                  {loading ? 'Saving...' : isSaved ? 'Saved as Persona' : 'Save as New Persona'}
                </button>
                
                <button className="btn" onClick={() => window.print()} style={{ width: '100%' }}>
                  <span className="mat-icon">download</span> Download PDF
                </button>

                <div style={{ borderTop: '1px solid var(--border)', margin: '12px 0' }}></div>

                <button className="btn" onClick={() => setStage(0)} style={{ width: '100%', opacity: 0.6 }}>
                   Start New Match
                </button>
             </div>

             {isSaved && (
               <div style={{ marginTop: '20px', padding: '12px', background: 'var(--muted)', borderRadius: '8px', fontSize: '11px', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                  A new profile has been created in your sidebar with this exact version of your resume.
               </div>
             )}
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Live Resume Preview (65%) */}
      <div style={{ 
        flex: 1, 
        background: '#0b1120', // Matching ResumePreview darkbg
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 20px'
      }}>
        <div style={{ 
          maxWidth: '800px', 
          width: '100%',
          transform: (stage === 4) ? 'scale(1)' : 'scale(0.95)',
          transformOrigin: 'top center',
          transition: 'transform 0.4s'
        }}>
          {activeProfile ? (
            <ResumePreview 
              profile={activeProfile} 
              isLivePreview={stage < 4}
              onUpdateProfile={(p) => setCustomFinalProfile(p)}
            />
          ) : (
            <div style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '20px', color: 'rgba(255,255,255,0.3)' }}>
              Resume Preview updates in real-time
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
