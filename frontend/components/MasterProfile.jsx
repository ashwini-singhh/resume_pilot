import React, { useState, useEffect, useRef } from 'react';
import { 
  PersonalInfoCard, 
  WorkExperienceCard, 
  ProjectsCard, 
  EducationCard, 
  SkillsCard, 
  CertificationsCard 
} from './SectionCards';
import { getProfile, saveProfile } from '../lib/api';

export default function MasterProfile({ profile, userId, contextId, editingSection, setEditingSection, setProfile, onOpenUpload }) {
  // Use a ref to prevent the effect from re-running constantly when profile changes
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    const hasPendingScore = (p) => {
      if (!p) return false;
      const exp = p.experience || [];
      const proj = p.projects || [];
      return exp.some(e => 
        e.impact_score === undefined || (e.projects || []).some(sp => sp.impact_score === undefined)
      ) || proj.some(p => p.impact_score === undefined);
    };

    if (!profile || !hasPendingScore(profile) || !userId || !contextId) return;

    const interval = setInterval(async () => {
      // Re-verify if we still need to poll using the latest ref
      if (!hasPendingScore(profileRef.current)) {
        clearInterval(interval);
        return;
      }

      try {
        const res = await getProfile(userId, contextId);
        if (res.profile && Object.keys(res.profile).length > 0) {
          // Check if it's actually different or has new scores
          if (JSON.stringify(res.profile) !== JSON.stringify(profileRef.current)) {
             setProfile(res.profile, false); // <--- DO NOT SAVE redundant data
          }
        }
      } catch (e) {
        console.warn('Polling profile failed:', e.message);
      }
    }, 8000); // slowing down to 8s to be safe

    return () => clearInterval(interval);
  }, [userId, contextId]); // Only restart if user or context changes

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
      if (userId) saveProfile(p, userId); // Persist and trigger re-score
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
      if (userId) saveProfile(p, userId); // Persist and trigger re-score
    };

    switch (name) {
      case 'Work Experience': return (
        <WorkExperienceCard
          key={name}
          experience={profile.experience}
          isEditing={editingSection === name}
          onEditToggle={setEditingSection}
          onBulletImproved={handleBulletImproved}
          onEntryImproved={handleEntryImproved}
        />
      );
      case 'Projects': return (
        <ProjectsCard
          key={name}
          projects={profile.projects}
          isEditing={editingSection === name}
          onEditToggle={setEditingSection}
          onBulletImproved={handleBulletImproved}
          onEntryImproved={handleEntryImproved}
        />
      );
      case 'Education': return <EducationCard key={name} education={profile.education} isEditing={editingSection === name} onEditToggle={setEditingSection} />;
      case 'Skills': return <SkillsCard key={name} skills={profile.skills} isEditing={editingSection === name} onEditToggle={setEditingSection} />;
      case 'Certifications': return <CertificationsCard key={name} certifications={profile.certifications} isEditing={editingSection === name} onEditToggle={setEditingSection} />;
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
        <div className="gap-2 flex-row">
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
