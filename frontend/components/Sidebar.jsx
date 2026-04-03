import React, { useState } from 'react';

export default function Sidebar({ githubSyncData, setGithubSyncData }) {
  const [ghUrl, setGhUrl] = useState('');
  const [ghToken, setGhToken] = useState('');
  const [maxRepos, setMaxRepos] = useState(8);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStep, setSyncStep] = useState(0); // 0 = ready, 1 = fetched, 2 = extracted
  
  const [manualText, setManualText] = useState('');

  const applications = [
    { name: "Google", count: "Software Engineer", color: "#4285F4", status: "green" },
    { name: "Stripe", count: "Backend Engineer", color: "#6366f1", status: "yellow" },
    { name: "Netflix", count: "Senior SDE", color: "#E50914", status: "red" }
  ];

  const handleFetchRepos = async () => {
    if (!ghUrl) return alert("Enter GitHub URL");
    setIsSyncing(true);
    // Simulate GitHub fetch using backend or mock
    setTimeout(() => {
      setGithubSyncData({
        ...githubSyncData,
        fetchedData: {
          username: "johndoe",
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
    // Notify parent to merge
    alert("Merged to profile state! (Demo)");
    setSyncStep(0);
    setGithubSyncData({ fetchedData: null, projects: [], newSkills: [] });
  };

  return (
    <div className="sidebar animate-in">
      <div className="section-badge">
        <span className="section-badge-dot"></span>
        <span className="section-badge-text">Action Required</span>
      </div>

      <div style={{ marginBottom: '24px' }}>
        {applications.map((app, i) => (
          <div key={i} className={`app-row ${i === 0 ? 'active' : ''}`}>
            <div className="app-avatar" style={{ background: app.color }}>{app.name[0]}</div>
            <span className="app-name">{app.name}</span>
            <span className="app-count">{app.count}</span>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: app.status === 'green' ? '#22c55e' : app.status === 'yellow' ? '#f59e0b' : '#ef4444' }}></div>
          </div>
        ))}
      </div>

      <div className="sidebar-label-divider">Data Sources</div>

      {/* GitHub Sync Expander */}
      <div className="sidebar-expander">
        <div className="sidebar-expander-header">
          <span className="mat-icon">link</span> Link GitHub
        </div>
        <div className="sidebar-expander-content">
          <label className="form-label">GitHub URL or username</label>
          <input 
            type="text" 
            placeholder="github.com/username" 
            value={ghUrl} 
            onChange={e => setGhUrl(e.target.value)} 
          />
          
          <label className="form-label">Personal Access Token (optional)</label>
          <input 
            type="password" 
            placeholder="For higher rate limits" 
            value={ghToken} 
            onChange={e => setGhToken(e.target.value)} 
          />
          
          <div className="flex-between" style={{ marginBottom: '12px' }}>
            <label className="form-label">Max repos to analyse: {maxRepos}</label>
            <input 
              type="range" 
              min="1" max="20" 
              value={maxRepos} 
              onChange={e => setMaxRepos(e.target.value)} 
              style={{ width: '50%' }}
            />
          </div>

          {syncStep === 0 && (
            <button className="btn" style={{ width: '100%' }} onClick={handleFetchRepos} disabled={isSyncing}>
              {isSyncing ? "Connecting..." : "① Fetch Repos"}
            </button>
          )}

          {syncStep >= 1 && githubSyncData.fetchedData && (
            <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '8px', marginBottom: '12px', fontSize: '11px' }}>
              <strong>@{githubSyncData.fetchedData.username}</strong> · {githubSyncData.fetchedData.public_repos} repos
              <br/>
              <div style={{marginTop: '4px'}}>
                {githubSyncData.fetchedData.repos.map(r => (
                  <div key={r.name}>- {r.name} ({r.language})</div>
                ))}
              </div>
            </div>
          )}

          {syncStep === 1 && (
            <button className="btn" style={{ width: '100%' }} onClick={handleExtractWithAI} disabled={isSyncing}>
              {isSyncing ? "Extracting..." : "② Extract Projects with AI"}
            </button>
          )}

          {syncStep === 2 && (
             <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleMergeToProfile}>
               ③ Merge into My Profile
             </button>
          )}
        </div>
      </div>

      {/* Add Context Expander */}
      <div className="sidebar-expander">
        <div className="sidebar-expander-header">
          <span className="mat-icon">add_circle</span> Add Context
        </div>
        <div className="sidebar-expander-content">
          <textarea 
            rows="3" 
            placeholder="Paste achievements here..." 
            value={manualText} 
            onChange={e => setManualText(e.target.value)} 
          />
          <button className="btn" style={{ width: '100%' }} onClick={() => alert("Merged context!")}>Merge Context</button>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', margin: '20px 0', width: '100%' }}></div>
      <div className="talk-btn">
        <span className="mat-icon" style={{ fontSize: '14px', marginRight: '4px' }}>chat</span> Talk to us
      </div>
    </div>
  );
}
