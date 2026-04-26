import React, { useState, useEffect, useRef } from 'react';
import { 
  PersonalInfoCard, 
  WorkExperienceCard, 
  ProjectsCard, 
  EducationCard, 
  SkillsCard, 
  AchievementsCard,
  SummaryCard
} from './SectionCards';
import { getProfile, saveProfile, generateSectionContent, runGlobalDiagnostic } from '../lib/api';

export default function MasterProfile({ profile, userId, contextId, editingSection, setEditingSection, setProfile, onOpenUpload }) {
  const globalContext = {
    target_role: profile.target_role || profile.role,
    target_companies: profile.target_companies,
    summary: profile.summary,
    skills: profile.skills
  };

  // Use a ref to prevent the effect from re-running constantly when profile changes
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // sync removed to favor simplicity and manual refresh as requested


  // Sync state from backend on first load (to catch bootstrapped profile)
  useEffect(() => {
    if (!userId || !contextId) return;
    async function init() {
      try {
        const res = await getProfile(userId, contextId);
        if (res.profile && Object.keys(res.profile).length > 0) {
          setProfile(res.profile, false);
        }
      } catch (e) {
        console.warn('Initial profile sync failed');
      }
    }
    // Only run if parent hasn't loaded it yet
    if (Object.keys(profile || {}).length <= 4) { // check if just default
       init();
    }
  }, [userId, contextId]); // Run when userId or contextId is available

  const [diagnosticScore, setDiagnosticScore] = useState(profile.global_diagnostic?.competitiveness_score || null);
  const [refreshingDiagnostic, setRefreshingDiagnostic] = useState(false);

  const handleRefreshDiagnostic = async () => {
    if (!userId || !contextId) return alert("Context required to run diagnostic");
    setRefreshingDiagnostic(true);
    try {
      const res = await runGlobalDiagnostic({ userId, contextId });
      setDiagnosticScore(res.competitiveness_score);
      // Update profile locally so it persists on next save, OR trigger an immediate save
      const p = JSON.parse(JSON.stringify(profile));
      p.global_diagnostic = res;
      setProfile(p);
      // We don't necessarily need to call saveProfile here because the backend /diagnostic endpoint 
      // now handles persistence, but updating local state ensures UI consistency.
    } catch (e) {
      console.error("Diagnostic refresh failed:", e);
      alert("Failed to refresh score. Please try again later.");
    } finally {
      setRefreshingDiagnostic(false);
    }
  };


  const [generatingSection, setGeneratingSection] = useState(null);

  const handleGenerateSection = async (sectionKey) => {
    if (!userId || !contextId) return alert("Context required to generate");
    setGeneratingSection(sectionKey);
    try {
      const res = await generateSectionContent({ userId, contextId, section: sectionKey });
      if (res.content) {
         const p = JSON.parse(JSON.stringify(profile));
         p[sectionKey] = res.content;
         setProfile(p);
         if (userId && contextId) saveProfile(p, userId, contextId);
      }
    } catch (e) {
      alert("Generation failed: " + e.message);
    }
    setGeneratingSection(null);
  };

  // ── Profile completion ──────────────────────────────────────────────────────
  const calcCompletion = (p) => {
    let filled = 0;
    if (p.name) filled++;
    if (p.email) filled++;
    if (p.phone) filled++;
    if (p.location) filled++;
    if (p.experience?.length) filled++;
    if (Object.keys(p.skills || {}).length) filled++;
    if (p.education?.length) filled++;
    const total = 7;
    return Math.floor((filled / total) * 100);
  };

  const pct = calcCompletion(profile);



  // Split into 2 columns for masonry-like view
  const leftSections = [];
  const rightSections = [];
  (profile.section_order || []).forEach((sec, i) => {
    if (sec === 'Summary' || sec === 'Overview') return; // Handled separately or hidden
    if (i % 2 === 0) leftSections.push(sec);
    else rightSections.push(sec);
  });

  const renderSection = (name) => {
    // Replace a bullet anywhere in the profile when user accepts an improvement
    const handleBulletImproved = (original, improved) => {
      const p = JSON.parse(JSON.stringify(profile));
      (p.experience || []).forEach(exp => {
        if (exp.bullets) exp.bullets = exp.bullets.map(b => b === original ? improved : b);
        (exp.projects || []).forEach(proj => {
          if (proj.bullets) proj.bullets = proj.bullets.map(b => b === original ? improved : b);
        });
      });
      (p.projects || []).forEach(proj => {
        if (proj.bullets) proj.bullets = proj.bullets.map(b => b === original ? improved : b);
      });
      setProfile(p);
      if (userId && contextId) saveProfile(p, userId, contextId); // Persist to specific context
    };

    // Replace an entire entry when user accepts entry-level improvement
    const handleEntryImproved = (idx, improvedEntry, section, pIdx = null) => {
      const p = JSON.parse(JSON.stringify(profile));
      if (section === 'experience' && p.experience?.[idx]) {
        p.experience[idx] = { ...p.experience[idx], ...improvedEntry };
      } else if (section === 'experience_project' && p.experience?.[idx]?.projects?.[pIdx]) {
        p.experience[idx].projects[pIdx] = { ...p.experience[idx].projects[pIdx], ...improvedEntry };
      } else if (section === 'projects' && p.projects?.[idx]) {
        p.projects[idx] = { ...p.projects[idx], ...improvedEntry };
      }
      setProfile(p);
      if (userId && contextId) saveProfile(p, userId, contextId); // Persist to specific context
    };

    switch (name) {
      case 'Work Experience': return (
        <WorkExperienceCard
          key={name}
          experience={profile.experience}
          userContext={globalContext}
          userId={userId}
          contextId={contextId}
          isEditing={editingSection === name}
          onEditToggle={setEditingSection}
          onChange={(s) => setProfile({...profile, ...s})}
          onBulletImproved={handleBulletImproved}
          onEntryImproved={handleEntryImproved}
        />
      );
      case 'Projects': return (
        <ProjectsCard
          key={name}
          projects={profile.projects}
          userContext={globalContext}
          userId={userId}
          contextId={contextId}
          isEditing={editingSection === name}
          onEditToggle={setEditingSection}
          onChange={(s) => setProfile({...profile, ...s})}
          onBulletImproved={handleBulletImproved}
          onEntryImproved={handleEntryImproved}
        />
      );
      case 'Education': return (
        <EducationCard 
          key={name} 
          education={profile.education} 
          isEditing={editingSection === name} 
          onEditToggle={setEditingSection} 
          onChange={(s) => setProfile({...profile, ...s})}
        />
      );
      case 'Skills': return (
        <SkillsCard 
          key={name} 
          skills={profile.skills} 
          isEditing={editingSection === name} 
          onEditToggle={setEditingSection} 
          onChange={(s) => setProfile({...profile, ...s})}
          onGenerate={() => handleGenerateSection("skills")} 
          isGenerating={generatingSection === "skills"} 
        />
      );
      case 'Achievements': return (
        <AchievementsCard 
          key={name} 
          achievements={profile.achievements} 
          isEditing={editingSection === name} 
          onEditToggle={setEditingSection} 
          onChange={(s) => setProfile({...profile, ...s})}
          score={profile.achievements_score}
          reasons={profile.achievements_reasons}
          userId={userId}
          contextId={contextId}
          userContext={globalContext}
        />
      );
      default: return null;
    }
  };

  return (
    <div className="main-column animate-in">
      <div className="flex-between" style={{marginBottom: '20px'}}>
        <div>
           <div className="profile-title">{profile.name || "Master Profile"}</div>
           <div className="profile-sub">Manage your resume and context.</div>
        </div>
        <div className="gap-3 flex-row" style={{ alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--muted)', padding: '6px 16px', borderRadius: '24px', border: '1px solid var(--border)' }}>
            <span className="mat-icon" style={{ color: '#ef4444', fontSize: '18px' }}>troubleshoot</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Overall Score:</span>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#ef4444' }}>{diagnosticScore ?? '? '}/10</span>
            <button 
              onClick={handleRefreshDiagnostic} 
              disabled={refreshingDiagnostic}
              style={{ 
                background: 'none', border: 'none', padding: 0, marginLeft: '4px',
                display: 'flex', alignItems: 'center', cursor: 'pointer',
                color: refreshingDiagnostic ? 'var(--muted-foreground)' : 'var(--accent)',
                opacity: refreshingDiagnostic ? 0.5 : 1
              }}
              title="Recalculate Score"
            >
              <span className={`mat-icon ${refreshingDiagnostic ? 'spin' : ''}`} style={{ fontSize: '18px' }}>
                refresh
              </span>
            </button>
          </div>


          <button className="btn" onClick={() => {
            const count = Number(localStorage.getItem('usage_count') || 0);
            if (count >= 5) return alert("Monthly import limit reached! Take Premium to work on more resumes.");
            onOpenUpload();
          }}>
            <span className="mat-icon">upload</span> Upload
          </button>
        </div>
      </div>

      <div className="progress-container">
        <span className="progress-icon" style={{color: pct === 100 ? '#22c55e' : '#f59e0b'}}>
          <span className="mat-icon">{pct === 100 ? 'check_circle' : 'warning'}</span>
        </span>
        <span className="progress-text">Profile {pct}% Complete</span>
        <span className="progress-detail">{pct === 100 ? '' : 'Some fields missing'}</span>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${pct}%` }}></div>
        </div>
      </div>
      
      <SummaryCard 
        summary={profile.summary} 
        isEditing={editingSection === 'Summary'} 
        onEditToggle={setEditingSection} 
        onChange={(s) => setProfile({...profile, ...s})}
        onGenerate={() => handleGenerateSection("summary")}
        isGenerating={generatingSection === "summary"}
        score={profile.summary_score}
        reasons={profile.summary_reasons}
        userId={userId}
        contextId={contextId}
        userContext={globalContext}
      />
      <div className="flex-between" style={{marginBottom: '16px'}}>
        <div />
      </div>

      <div className="col-layout">
        <div>
          <PersonalInfoCard profile={profile} isEditing={editingSection === 'Personal Info'} onEditToggle={setEditingSection} onChange={(p) => setProfile({...profile, ...p})} />
          {leftSections.map(s => s !== 'Personal Info' && renderSection(s))}
        </div>
        <div>
          {rightSections.map(s => s !== 'Personal Info' && renderSection(s))}
        </div>
      </div>
    </div>
  );
}
