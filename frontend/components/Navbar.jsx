import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Navbar({ activePage, setActivePage, onOpenSettings }) {
  const [user, setUser] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const userInitial = user?.email?.[0].toUpperCase() || 'U';
  const userAvatar = user?.user_metadata?.avatar_url;

  return (
    <div className="navbar-container">
      <div className="nav-left">
        <div className="nav-logo">
          <div className="nav-logo-icon" style={{ overflow: 'hidden', background: 'var(--accent)' }}>
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <span className="nav-logo-text">ResumePilot</span>
        </div>
      </div>
      
      <div className="nav-center">
        <div className="nav-pills">
          <button 
            className={`nav-pill-btn ${activePage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActivePage('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`nav-pill-btn ${activePage === 'preview' ? 'active' : ''}`}
            onClick={() => setActivePage('preview')}
          >
            Resume Preview
          </button>
          <button 
            className={`nav-pill-btn ${activePage === 'ai' ? 'active' : ''}`}
            onClick={() => setActivePage('ai')}
          >
            AI Optimize
          </button>
        </div>
      </div>
      
      <div className="nav-right">
        <button className="nav-icon-btn" title="Notifications">
          <span className="mat-icon-apple">notifications</span>
        </button>
        <button className="nav-icon-btn" title="Settings" onClick={onOpenSettings}>
          <span className="mat-icon-apple">settings</span>
        </button>
        
        {/* User Profile Dropdown */}
        <div style={{ position: 'relative' }}>
          <button 
            className="nav-icon-btn profile-trigger" 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{ 
              padding: 0, overflow: 'hidden', width: 32, height: 32, borderRadius: '50%',
              background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            {userAvatar ? (
              <img src={userAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{userInitial}</span>
            )}
          </button>

          {showProfileMenu && (
            <>
              <div 
                style={{ position: 'fixed', inset: 0, zIndex: 99 }} 
                onClick={() => setShowProfileMenu(false)} 
              />
              <div style={{
                position: 'absolute', top: '120%', right: 0, width: 220,
                background: '#fff', borderRadius: 12, border: '1px solid var(--border)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100,
                padding: '8px', overflow: 'hidden'
              }}>
                <div style={{ 
                  padding: '12px 16px', borderBottom: '1px solid var(--border)',
                  marginBottom: 4
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
                    {user?.user_metadata?.full_name || 'User'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.email}
                  </div>
                </div>
                
                <button 
                  className="dropdown-item" 
                  onClick={handleLogout}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 16px',
                    borderRadius: 8, background: 'transparent', border: 'none',
                    fontSize: 13, color: '#ef4444', fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#fef2f2'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span className="mat-icon-apple" style={{ fontSize: 18 }}>logout</span>
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
