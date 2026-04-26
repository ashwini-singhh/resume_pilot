/**
 * ImpactScoreBadge — Displays a 0–10 impact score for a single entry.
 *
 * Props:
 *   score      {number|null}   Score value or null (not yet loaded)
 *   loading    {boolean}       Show spinner
 *   onImprove  {fn}            Called when "Improve Entry" is clicked
 *   compact    {boolean}       Compact mode (for inline use)
 */
import React from 'react';

function ScoreFill({ score }) {
  const pct = Math.round((score / 10) * 100);
  const color = score >= 8 ? '#22c55e' : score >= 5.5 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{
        width: '48px', height: '5px',
        background: 'var(--muted)', borderRadius: '99px', overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: color, borderRadius: '99px',
          transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: 700, color }}>{score.toFixed(1)}</span>
      <span style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>/10</span>
    </div>
  );
}

export default function ImpactScoreBadge({ score, loading, reasons, onImprove, compact, className = "" }) {
  const showImproveBtn = !loading && score !== null && onImprove;

  const emoji = score === null ? '' : score >= 8 ? '🟢' : score >= 5.5 ? '🟡' : '🔴';
  const label = score === null ? '' : score >= 8 ? 'Strong' : score >= 5.5 ? 'Moderate' : 'Weak';
  const labelColor = score === null ? 'var(--muted-foreground)' : score >= 8 ? '#15803d' : score >= 5.5 ? '#92400e' : '#dc2626';
  const bgColor = score === null ? 'transparent' : score >= 8 ? 'rgba(34,197,94,0.06)' : score >= 5.5 ? 'rgba(245,158,11,0.06)' : 'rgba(239,68,68,0.06)';
  const borderColor = score === null ? 'var(--border)' : score >= 8 ? 'rgba(34,197,94,0.2)' : score >= 5.5 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)';

  const animations = (
    <style>{`
      @keyframes score-pulse {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
      }
      @keyframes spin-slow {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .score-loading {
        animation: score-pulse 2s infinite ease-in-out;
      }
      .spin-icon {
        animation: spin-slow 3s infinite linear;
      }
      .btn-fix-icon {
        background: transparent;
        color: var(--accent);
        border: 1px solid transparent;
        border-radius: 20px;
        height: 28px;
        width: 28px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s, border-color 0.2s, transform 0.2s;
        overflow: hidden;
        white-space: nowrap;
        padding: 0;
      }
      .btn-fix-icon:hover {
        width: 68px;
        background: rgba(0, 82, 255, 0.08);
        border-color: rgba(0, 82, 255, 0.15);
        transform: translateY(-1px);
      }
      .btn-fix-icon .fix-text {
        font-size: 11px;
        font-weight: 700;
        margin-left: 4px;
        opacity: 0;
        transition: opacity 0.2s;
      }
      .btn-fix-icon:hover .fix-text {
        opacity: 1;
        transition-delay: 0.1s;
      }
    `}</style>
  );

  if (compact) {
    return (
      <div className={`${className} no-print`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
        {animations}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {loading ? (
            <span className="score-loading" style={{ fontSize: '11px', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="mat-icon spin-icon" style={{ fontSize: '13px' }}>hourglass_empty</span> Scoring...
            </span>
          ) : score !== null ? (
            <span style={{ fontSize: '11px', color: labelColor }}>
              {emoji} Impact: <b>{score.toFixed(1)}/10</b>
            </span>
          ) : null}
        </div>
        {showImproveBtn && (
          <button onClick={onImprove} className="btn-fix-icon" title="Fix Entry">
            <span className="mat-icon" style={{ fontSize: '14px' }}>auto_awesome</span>
            <span className="fix-text">Fix</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`${className} no-print`} style={{
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: '10px',
      padding: '10px 14px',
      marginTop: '10px',
      marginBottom: '4px',
    }}>
      {animations}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {loading ? (
            <span className="score-loading" style={{ fontSize: '12px', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="mat-icon spin-icon" style={{ fontSize: '16px' }}>hourglass_empty</span> Analyzing impact...
            </span>
          ) : score !== null ? (
            <>
              <ScoreFill score={score} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: labelColor }}>{emoji} {label}</span>
            </>
          ) : null}
        </div>

        {showImproveBtn && (
          <button onClick={onImprove} className="btn-fix-icon" title="Fix Entry">
            <span className="mat-icon" style={{ fontSize: '15px' }}>auto_awesome</span>
            <span className="fix-text">Fix</span>
          </button>
        )}
      </div>

      {/* Reasons (if score is low, show 1–2 tips) */}
      {!loading && score !== null && score < 7.5 && reasons?.length > 0 && (
        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {reasons.slice(0, 2).map((r, i) => (
            <span key={i} style={{
              fontSize: '11px', color: 'var(--muted-foreground)',
              background: 'var(--muted)', padding: '2px 8px', borderRadius: '4px',
            }}>
              {r}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
