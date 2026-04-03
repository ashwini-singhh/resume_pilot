import React from 'react';

export default function Navbar({ activePage, setActivePage, onOpenSettings }) {
  return (
    <div className="navbar-container">
      <div className="nav-left">
        <div className="nav-logo">
          <span className="nav-logo-icon">R</span> ResumeAI
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
        <button className="nav-icon-btn" title="Help">
          <span className="mat-icon-apple">help</span>
        </button>
      </div>
    </div>
  );
}
