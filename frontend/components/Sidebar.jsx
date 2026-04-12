import React, { useState } from 'react';
import * as api from '../lib/api';

export default function Sidebar(props) {
  const { userId, githubSyncData, setGithubSyncData, profiles, activeContextId, onSwitchProfile, onNewProfile, onDeleteProfile } = props;
  const [ghUrl, setGhUrl] = useState('');
  const [ghToken, setGhToken] = useState('');
  const [maxRepos, setMaxRepos] = useState(8);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStep, setSyncStep] = useState(0); // 0 = ready, 1 = fetched, 2 = extracted

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

  const handleFetchRepos = async () => {
    if (!ghUrl) return alert("Enter GitHub URL");
    setIsSyncing(true);
    // Simulate GitHub fetch
    setTimeout(() => {
      setGithubSyncData({
        ...githubSyncData,
        fetchedData: {
          username: ghUrl.replace('https://github.com/', '').replace('github.com/', ''),
          public_repos: maxRepos,
          followers: 120,
          languages: ["Python", "JavaScript", "Go"],
          repos: [
            { name: "resume_auditor", language: "Python", stars: 45, description: "AI Resume Agent SaaS" },
            { name: "crypto_trader", language: "Go", stars: 12, description: "Algorithmic trading engine" }
          ]
        }
      });
      setSyncStep(1);
      setIsSyncing(false);
    }, 1000);
  };

  const handleExtractWithAI = async () => {
    setIsSyncing(true);
    // Simulate AI extraction
    setTimeout(() => {
      setGithubSyncData({
        ...githubSyncData,
        projects: [
          { name: "resume_auditor", bullets: ["Integrated Fast API backend", "Developed React Next.js UI matching Streamlit UX"] },
          { name: "crypto_trader", bullets: ["Built high-frequency trading engine in Go", "Deployed via Docker Compose"] }
        ],
        newSkills: ["Python", "Go", "Docker", "Next.js", "FastAPI"]
      });
      setSyncStep(2);
      setIsSyncing(false);
    }, 1500);
  };

  const handleMergeToProfile = () => {
    alert("Merged to profile state! (Demo)");
    setSyncStep(0);
    setGithubSyncData({ fetchedData: null, projects: [], newSkills: [] });
    setOpenSection(null);
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
          <span className="mat-icon" style={{ color: 'var(--accent)' }}>link</span> Link GitHub
        </div>
        <div className="sidebar-expander-content">
          <label className="form-label">Username or Profile URL</label>
          <input
            type="text"
            placeholder="github.com/username"
            value={ghUrl}
            onChange={e => setGhUrl(e.target.value)}
            style={{ marginBottom: '16px' }}
          />

          <label className="form-label">Personal Access Token (optional)</label>
          <input
            type="password"
            placeholder="For higher rate limits"
            value={ghToken}
            onChange={e => setGhToken(e.target.value)}
            style={{ marginBottom: '16px' }}
          />

          <div className="flex-between" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Analysing {maxRepos} Respos</label>
            <input
              type="range"
              min="1" max="20"
              value={maxRepos}
              onChange={e => setMaxRepos(e.target.value)}
              style={{ width: '50%', height: '4px', margin: 0 }}
            />
          </div>

          {syncStep === 0 && (
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleFetchRepos} disabled={isSyncing}>
              {isSyncing ? <span className="mat-icon spin-icon" style={{ fontSize: '16px' }}>sync</span> : "Fetch Repositories"}
            </button>
          )}

          {syncStep >= 1 && githubSyncData.fetchedData && (
            <div style={{ padding: '12px', background: 'var(--muted)', borderRadius: '10px', marginBottom: '16px', fontSize: '11px' }}>
              <div className="flex-row gap-2" style={{ marginBottom: '8px' }}>
                <span className="mat-icon" style={{ fontSize: '14px' }}>account_circle</span>
                <strong>@{githubSyncData.fetchedData.username}</strong>
              </div>
              <div style={{ opacity: 0.8 }}>
                {githubSyncData.fetchedData.repos.map((r, ri) => (
                  <div key={ri} style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>• {r.name}</span>
                    <span style={{ fontWeight: 700 }}>{r.language}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {syncStep === 1 && (
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleExtractWithAI} disabled={isSyncing}>
              {isSyncing ? "Extracting..." : "Process with AI"}
            </button>
          )}

          {syncStep === 2 && (
            <button className="btn btn-primary" style={{ width: '100%', background: '#22c55e' }} onClick={handleMergeToProfile}>
              Merge into Profile
            </button>
          )}
        </div>
      </div>

      {/* Add Context Expander */}
      <div className={`sidebar-expander ${openSection === 'context' ? 'is-open' : ''}`}>
        <div className="sidebar-expander-header" onClick={() => setOpenSection(openSection === 'context' ? null : 'context')}>
          <span className="mat-icon" style={{ color: 'var(--accent)' }}>add_circle</span> Add Context
        </div>
        <div className="sidebar-expander-content">
          <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginBottom: '12px' }}>Paste any extra achievements, awards, or projects the AI missed.</p>
          <textarea
            rows="4"
            placeholder="I won the hackathon at HackNYC 2024..."
            value={manualText}
            onChange={e => setManualText(e.target.value)}
            style={{ fontSize: '12px' }}
          />
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { alert("Context merged!"); setOpenSection(null); }}>Merge Context</button>
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

                <button className="btn" style={{ width: '100%', marginTop: '8px' }} onClick={handleRunDiagnostic} disabled={diagnosticLoading}>
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

      <div className="talk-btn">
        <span className="mat-icon" style={{ fontSize: '14px', marginRight: '4px' }}>chat</span> Talk to us
      </div>
    </div>
  );
}
