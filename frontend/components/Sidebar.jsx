import React, { useState } from 'react';
import * as api from '../lib/api';

export default function Sidebar(props) {
  const { userId, profiles, activeContextId, onSwitchProfile, onNewProfile, onDeleteProfile, setActivePage, onOpenInterview } = props;

  const [manualText, setManualText] = useState('');
  const [openSection, setOpenSection] = useState(null); // 'github' | 'context' | 'diagnostic' | null

  // Diagnostic State
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticError, setDiagnosticError] = useState(null);

  const handleRunDiagnostic = async () => {
    if (!userId || !activeContextId) return;
    setDiagnosticLoading(true);
    setDiagnosticError(null);
    try {
      const res = await api.runGlobalDiagnostic({ userId, contextId: activeContextId });
      setDiagnosticData(res);
    } catch (e) {
      setDiagnosticError(e.message);
    }
    setDiagnosticLoading(false);
  };



  return (
    <div className="sidebar animate-in">
      <div className="section-badge">
        <span className="section-badge-dot"></span>
        <span className="section-badge-text">Account Active</span>
      </div>

      <div className="sidebar-label-divider">Your Profiles</div>
      <div style={{ marginBottom: '24px' }}>
        {(profiles || []).map((p, i) => {
          const colors = ["#4285F4", "#6366f1", "#E50914", "#f59e0b", "#22c55e"];
          const color = colors[i % colors.length];
          const role = (p.target_roles && p.target_roles.length > 0) ? p.target_roles[0] : "General";

          return (
            <div key={p.id} className={`app-row ${activeContextId === p.id ? 'active' : ''}`} onClick={() => onSwitchProfile(p.id)} style={{ position: 'relative' }}>
              <div className="app-avatar" style={{ background: color }}>{p.name[0]}</div>
              <span className="app-name">{p.name}</span>
              <span className="app-count">{role}</span>
              
              <div className="profile-actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {activeContextId === p.id && (
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></div>
                )}
                <button 
                  className="icon-btn-delete"
                  onClick={(e) => { e.stopPropagation(); onDeleteProfile(p.id); }}
                  style={{ 
                    background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, padding: '4px',
                    display: 'flex', alignItems: 'center', color: 'inherit'
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0.3}
                >
                  <span className="mat-icon" style={{ fontSize: '14px' }}>delete</span>
                </button>
              </div>
            </div>
          );

        })}
        <div className="app-row" style={{ borderStyle: 'dashed', borderLeftColor: 'transparent', borderColor: '#94a3b8', color: '#475569', marginTop: '12px', padding: '6px 16px' }} onClick={onNewProfile}>
          <div className="app-avatar" style={{ width: '24px', height: '24px', background: '#e2e8f0', color: '#475569' }}>
            <span className="mat-icon" style={{ fontSize: '16px' }}>add</span>
          </div>
          <span className="app-name" style={{ color: '#475569', fontSize: '12.5px' }}>Create New Profile</span>
        </div>
      </div>

      <div className="sidebar-label-divider">Data Sources</div>

      {/* GitHub Sync Expander */}
      <div className={`sidebar-expander ${openSection === 'github' ? 'is-open' : ''}`}>
        <div className="sidebar-expander-header" onClick={() => setOpenSection(openSection === 'github' ? null : 'github')}>
          <span className="mat-icon" style={{ color: 'var(--accent)' }}>terminal</span> GitHub Integration
        </div>
        <div className="sidebar-expander-content">
          <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginBottom: '16px' }}>
            Sync your open-source contributions and projects directly from GitHub.
          </p>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
            onClick={() => {
              setActivePage('github');
              setOpenSection(null);
            }}
          >
            <span className="mat-icon" style={{ fontSize: '18px' }}>sync</span>
            Sync Projects
          </button>
        </div>
      </div>

      {/* Add Context Expander */}
      <div className={`sidebar-expander ${openSection === 'context' ? 'is-open' : ''}`}>
        <div className="sidebar-expander-header" onClick={() => setOpenSection(openSection === 'context' ? null : 'context')}>
          <span className="mat-icon" style={{ color: 'var(--accent)' }}>add_circle</span> Add Context
        </div>
        <div className="sidebar-expander-content">
          <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginBottom: '16px' }}>
            Can't find a specific project? Our AI Agent will interview you to extract deep technical context and write elite-tier bullets.
          </p>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
            onClick={() => onOpenInterview()}
          >
            <span className="mat-icon" style={{ fontSize: '18px' }}>psychology</span>
            Launch Interview Agent
          </button>
        </div>
      </div>

      {/* Global Diagnostic Expander */}
      <div className={`sidebar-expander ${openSection === 'diagnostic' ? 'is-open' : ''}`}>
        <div className="sidebar-expander-header" onClick={() => setOpenSection(openSection === 'diagnostic' ? null : 'diagnostic')}>
          <span className="mat-icon" style={{ color: '#ef4444' }}>troubleshoot</span> Industry Diagnostic
        </div>
        <div className="sidebar-expander-content" style={{ padding: '12px' }}>
          {!diagnosticData ? (
             <div className="flex-column gap-2" style={{ alignItems: 'center', textAlign: 'center', margin: '10px 0' }}>
                <span className="mat-icon" style={{ fontSize: '32px', color: 'var(--muted-foreground)' }}>analytics</span>
                <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginBottom: '8px' }}>
                   Analyze your entire resume against industry standards for your target role.
                </p>
                <button className="btn btn-primary" style={{ width: '100%', background: '#ef4444' }} onClick={handleRunDiagnostic} disabled={diagnosticLoading}>
                  {diagnosticLoading ? "Analyzing..." : "Analyze Resume"}
                </button>
                {diagnosticError && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '8px' }}>{diagnosticError}</div>}
             </div>
          ) : (
              <div className="flex-column gap-2">
                <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px', marginBottom: '8px' }} className="custom-scrollbar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', background: 'var(--muted)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '50%', background: `conic-gradient(#ef4444 ${(diagnosticData.competitiveness_score/10)*360}deg, #e5e7eb 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#ef4444' }}>
                          {diagnosticData.competitiveness_score}
                        </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: 600, letterSpacing: '0.05em' }}>Competitiveness</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--foreground)' }}>{diagnosticData.market_position}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--foreground)', marginBottom: '12px' }}>
                    {diagnosticData.executive_summary}
                  </div>

                  {diagnosticData.missing_skills?.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '6px' }}>MISSING SKILLS</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {diagnosticData.missing_skills.map((s, i) => (
                          <span key={i} style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 500 }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {diagnosticData.weak_areas?.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '6px' }}>WEAK AREAS</div>
                      <div className="flex-column gap-2">
                        {diagnosticData.weak_areas.map((w, i) => (
                          <div key={i} style={{ background: '#fff', border: '1px solid #fee2e2', padding: '8px', borderRadius: '6px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#991b1b', marginBottom: '4px' }}>{w.area}</div>
                            <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>{w.issue}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button className="btn" style={{ width: '100%', marginTop: '4px' }} onClick={handleRunDiagnostic} disabled={diagnosticLoading}>
                  {diagnosticLoading ? "Recalculating..." : "Refresh Diagnostic"}
                </button>
             </div>
          )}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', margin: '20px 0', width: '100%' }}></div>

      {/* Usage Limit Section */}
      <div style={{ padding: '0 12px 20px', width: '100%' }}>
        <div className="flex-between" style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Usage (Free)</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--foreground)' }}>
            {Math.min(5, (Number(typeof window !== 'undefined' && localStorage.getItem('usage_count')) || 0))}/5
          </span>
        </div>
        <div style={{ width: '100%', height: '6px', background: 'var(--muted)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
          <div style={{ 
            width: `${Math.min(100, ((Number(typeof window !== 'undefined' && localStorage.getItem('usage_count')) || 0) / 5) * 100)}%`, 
            height: '100%', 
            background: (Number(typeof window !== 'undefined' && localStorage.getItem('usage_count')) || 0) >= 5 ? '#ef4444' : 'var(--accent)',
            transition: 'width 0.4s ease'
          }}></div>
        </div>
        <p style={{ fontSize: '10px', color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.4 }}>
          {(Number(typeof window !== 'undefined' && localStorage.getItem('usage_count')) || 0) >= 5 
            ? "Limit reached. Upgrade for unlimited access." 
            : "5 imports/exports per month."}
        </p>
      </div>

      <div className="talk-btn" style={{ marginTop: 'auto' }}>
        <span className="mat-icon" style={{ fontSize: '14px', marginRight: '4px' }}>chat</span> Talk to us
      </div>
    </div>
  );
}
