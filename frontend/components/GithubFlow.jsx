import React, { useState } from 'react';
import { fetchGithubRepos, mergeGithubRepos } from '../lib/api';

/**
 * GithubFlow — Stage 1: Search/List, Stage 2: Selection, Stage 3: Processing
 */
export default function GithubFlow({ userId, contextId, onComplete }) {
  const [step, setStep] = useState(1); // 1: Search, 2: Select, 3: Processing
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [repos, setRepos] = useState([]);
  const [selectedNames, setSelectedNames] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0, name: '' });

  const handleFetch = async () => {
    if (!url) return setError('Please enter a GitHub URL or username');
    setLoading(true);
    setError('');
    try {
      const res = await fetchGithubRepos(url, token);
      setRepos(res?.repos || []);
      // Auto-select repos with > 5 stars or recent ones
      const autoList = (res?.repos || []).filter(r => r.stars > 5).map(r => r.name);
      const auto = new Set(autoList);
      setSelectedNames(auto);
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleRepo = (name) => {
    setSelectedNames(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleMerge = async () => {
    if (selectedNames.size === 0) return setError('Please select at least one repository');
    setStep(3);
    setLoading(true);
    setError('');
    
    const names = Array.from(selectedNames);
    setProgress({ current: 0, total: names.length, name: names[0] });

    try {
      // In a real multi-repo flow we might want a stream, 
      // but for now the backend handles the loop.
      const res = await mergeGithubRepos({
        userId,
        contextId, 
        githubUrl: url,
        selectedRepoNames: names,
        token
      });
      
      if (onComplete) onComplete(res.profile);
    } catch (e) {
      setError(e.message);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card animate-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '32px' }}>
      {/* HEADER */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ 
          width: '64px', height: '64px', borderRadius: '16px', background: 'var(--foreground)', color: 'var(--background)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
        }}>
          <span className="mat-icon" style={{ fontSize: '32px' }}>terminal</span>
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Enrich with GitHub</h2>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '14px' }}>
          Import your best projects and technical highlights directly into your resume.
        </p>
      </div>

      {error && (
        <div style={{ 
          padding: '12px 16px', background: 'rgba(239,68,68,0.1)', color: '#dc2626', 
          borderRadius: '10px', fontSize: '13px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span className="mat-icon" style={{ fontSize: '18px' }}>error_outline</span>
          {error}
        </div>
      )}

      {/* STEP 1: SEARCH */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="form-label" style={{ fontSize: '12px' }}>GitHub Profile URL or Username</label>
            <input 
              type="text" 
              placeholder="e.g. github.com/username or just 'username'" 
              className="form-control"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFetch()}
            />
          </div>
          <div style={{ background: 'var(--muted)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '12px', fontWeight: 700 }}>
              <span className="mat-icon" style={{ fontSize: '16px' }}>lock</span>
              Private Repositories?
            </div>
            <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginBottom: '12px' }}>
              If you want to import projects from private repositories, provide a GitHub Personal Access Token (PAT).
            </p>
            <input 
              type="password" 
              placeholder="GitHub Token (Optional)" 
              className="form-control"
              style={{ fontSize: '12px', background: 'transparent' }}
              value={token}
              onChange={e => setToken(e.target.value)}
            />
          </div>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '14px' }} 
            onClick={handleFetch}
            disabled={loading}
          >
            {loading ? 'Connecting to GitHub...' : 'Find Repositories'}
          </button>
        </div>
      )}

      {/* STEP 2: SELECT */}
      {step === 2 && (
        <div className="animate-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Select Projects ({selectedNames.size})</h3>
            <button className="btn btn-ghost" style={{ fontSize: '12px' }} onClick={() => setStep(1)}>Change User</button>
          </div>

          <div style={{ 
            maxHeight: '400px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
            paddingRight: '8px', marginBottom: '24px'
          }}>
            {repos.map(repo => {
              const isSelected = selectedNames.has(repo.name);
              return (
                <div 
                  key={repo.name}
                  onClick={() => toggleRepo(repo.name)}
                  style={{
                    padding: '16px', borderRadius: '12px', cursor: 'pointer',
                    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    background: isSelected ? 'rgba(0,82,255,0.02)' : 'var(--card)',
                    transition: 'all 0.2s', position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px' }}>{repo.name}</span>
                    <div style={{ 
                      width: '18px', height: '18px', borderRadius: '4px', border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {isSelected && <span className="mat-icon" style={{ fontSize: '12px', color: '#fff' }}>check</span>}
                    </div>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '32px' }}>
                    {repo.description || 'No description provided.'}
                  </p>
                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '10px', fontWeight: 600 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span className="mat-icon" style={{ fontSize: '12px', color: '#f59e0b' }}>star</span>
                      {repo.stars}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
                      {repo.language}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '14px' }} 
            onClick={handleMerge}
          >
            Import {selectedNames.size} Projects
          </button>
        </div>
      )}

      {/* STEP 3: PROCESSING */}
      {step === 3 && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 24px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>AI Processing...</h3>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '13px' }}>
            We're analyzing your code and READMEs to generate professional project descriptions.
          </p>
          <div style={{ marginTop: '24px', padding: '16px', background: 'var(--muted)', borderRadius: '12px' }}>
             <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '4px' }}>
                Analyzing Repositories
             </p>
             <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ 
                  height: '100%', background: 'var(--accent)', borderRadius: '2px',
                  width: `${(progress.current / progress.total) * 100}%`, transition: 'width 0.5s' 
                }} />
             </div>
             <p style={{ fontSize: '12px', fontWeight: 600 }}>This may take a minute depending on selection size</p>
          </div>
        </div>
      )}
    </div>
  );
}
