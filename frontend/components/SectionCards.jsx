import React, { useState } from 'react';
import EntryImprover from './EntryImprover';
import ImpactScoreBadge from './ImpactScoreBadge';

// Strip leading bullet characters copied verbatim from PDF (•, -, *, ›, ·, ◦, ▪)
const cleanBullet = (text = '') => text.replace(/^[\s•\-\*›·◦▪▸→]+/, '').trim();

// Shared Skill Tag component
export function SkillTags({ skills }) {
  if (!skills) return null;
  return (
    <div>
      {Object.entries(skills).map(([category, tags]) => (
        <div key={category}>
          <div className="tag-cat">{category}</div>
          {tags.map((t, idx) => <span key={idx} className="tag">{t}</span>)}
        </div>
      ))}
    </div>
  );
}

// Personal Info Card
export function PersonalInfoCard({ profile, isEditing, onEditToggle, onChange }) {
  const [tempData, setTempData] = useState(profile);

  if (isEditing) {
    return (
      <div className="section-card animate-in">
        <div className="card-title" style={{marginBottom: '12px'}}>
          <span className="mat-icon">person</span> Edit Personal Info
        </div>
        <div className="flex-column gap-3">
          <div className="flex-row gap-3">
            <div style={{ flex: 1 }}>
              <label className="form-label">Full Name</label>
              <input type="text" placeholder="Name" value={tempData.name || ''} onChange={e => setTempData({...tempData, name: e.target.value})} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Headline / Job Title</label>
              <input type="text" placeholder="e.g. Senior Software Engineer" value={tempData.title || ''} onChange={e => setTempData({...tempData, title: e.target.value})} />
            </div>
          </div>
          <div className="flex-row gap-3">
            <div style={{ flex: 1 }}>
              <label className="form-label">Email</label>
              <input type="text" placeholder="Email" value={tempData.email || ''} onChange={e => setTempData({...tempData, email: e.target.value})} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Phone</label>
              <input type="text" placeholder="Phone" value={tempData.phone || ''} onChange={e => setTempData({...tempData, phone: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="form-label">Location</label>
            <input type="text" placeholder="Location" value={tempData.location || ''} onChange={e => setTempData({...tempData, location: e.target.value})} />
          </div>
          <div className="flex-row gap-3">
            <div style={{ flex: 1 }}>
              <label className="form-label">LinkedIn (Optional)</label>
              <input type="text" placeholder="https://linkedin.com/in/username" value={tempData.linkedin || ''} onChange={e => setTempData({...tempData, linkedin: e.target.value})} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">GitHub (Optional)</label>
              <input type="text" placeholder="https://github.com/username" value={tempData.github || ''} onChange={e => setTempData({...tempData, github: e.target.value})} />
            </div>
          </div>
          <div className="flex-row gap-3">
            <div style={{ flex: 1 }}>
              <label className="form-label">Portfolio / Website (Optional)</label>
              <input type="text" placeholder="https://portfolio.com" value={tempData.portfolio || ''} onChange={e => setTempData({...tempData, portfolio: e.target.value})} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Profile Photo URL (Optional)</label>
              <input type="text" placeholder="https://example.com/photo.jpg" value={tempData.profile_photo_url || ''} onChange={e => setTempData({...tempData, profile_photo_url: e.target.value})} />
            </div>
          </div>
        </div>
        <div className="flex-between" style={{marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px'}}>
          <button className="btn" onClick={() => { setTempData(profile); onEditToggle(null); }}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onChange(tempData); onEditToggle(null); }}>Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="section-card">
      <div className="card-header">
        <div className="card-title">
          <span className="mat-icon">person</span> Personal Information
        </div>
        <button className="card-edit" onClick={() => onEditToggle('Personal Info')}>
          <span className="mat-icon">edit</span>
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {profile.profile_photo_url && (
          <img 
            src={profile.profile_photo_url} 
            alt="Profile" 
            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }} 
          />
        )}
        <div style={{ flex: 1 }}>
          <div style={{fontSize: '14px', fontWeight: 700, color: 'var(--foreground)'}}>{profile.name || 'Your Name'}</div>
          {profile.title && <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600, marginBottom: '4px' }}>{profile.title}</div>}
          <div style={{fontSize: '11px', color: 'var(--muted-foreground)', display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
            <span>📧 {profile.email || 'email@example.com'}</span>
            <span>📱 {profile.phone || 'Phone'}</span>
            <span>📍 {profile.location || 'Location'}</span>
            {profile.linkedin && <span>🔗 LinkedIn</span>}
            {profile.github && <span>💻 GitHub</span>}
            {profile.portfolio && <span>🌐 Portfolio</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Professional Summary Card
export function SummaryCard({ 
  summary, 
  isEditing, 
  onEditToggle, 
  onChange, 
  onGenerate, 
  isGenerating,
  score,
  reasons,
  userId,
  contextId,
  userContext
}) {
  const [tempData, setTempData] = useState(summary);
  const [improvingEntry, setImprovingEntry] = useState(null);

  if (improvingEntry) {
    return (
      <EntryImprover 
        entry={improvingEntry.entry}
        entryId={improvingEntry.entryId}
        section="summary"
        userId={userId}
        contextId={contextId}
        userContext={userContext}
        onClose={() => setImprovingEntry(null)}
        onAccepted={(improved) => {
          onChange({ summary: improved.summary || improved.content || improved.bullets?.[0] || summary });
          setImprovingEntry(null);
        }}
      />
    );
  }


  if (isEditing) {
    return (
      <div className="section-card animate-in">
        <div className="card-header">
           <div className="card-title">
            <span className="mat-icon">description</span> Professional Summary
          </div>
        </div>
        <textarea 
          rows="4"
          placeholder="A brief overview of your professional career and key strengths..."
          value={tempData || ''}
          onChange={e => setTempData(e.target.value)}
          style={{ fontSize: '13px', marginTop: '12px' }}
        />
        <div className="flex-between" style={{ marginTop: '16px' }}>
          <button className="btn" onClick={() => { setTempData(summary); onEditToggle(null); }}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onChange({ summary: tempData }); onEditToggle(null); }}>Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="section-card">
      <div className="card-header">
        <div className="card-title">
          <span className="mat-icon">description</span> Professional Summary
        </div>
        <div className="flex-row gap-2">
          {(!summary || summary.trim() === '') && onGenerate && (
            <button onClick={onGenerate} className="btn-fix-icon" style={{ borderRadius: '6px', width: 'auto', padding: '0 8px' }} disabled={isGenerating}>
              <span className="mat-icon" style={{ fontSize: '13px' }}>auto_awesome</span>
              <span style={{ fontSize: '11px', fontWeight: 600, marginLeft: '4px' }}>{isGenerating ? "Writing..." : "Auto-Write"}</span>
            </button>
          )}
          <button className="card-edit" onClick={() => onEditToggle('Summary')}>
            <span className="mat-icon">edit</span>
          </button>
        </div>
      </div>
      
      <ImpactScoreBadge
        score={score ?? null}
        loading={score === undefined && summary?.length > 0}
        reasons={reasons}
        onImprove={() => setImprovingEntry({ entry: { content: summary }, entryId: 'summary' })}
      />

      <p style={{ fontSize: '13px', color: 'var(--foreground)', fontStyle: 'italic', lineHeight: 1.5, margin: '10px 0 0 0' }}>
        {summary || "No summary provided. Click 'Auto-Write' to generate one using AI based on your experience."}
      </p>
    </div>
  );
}

// Work Experience Card
export function WorkExperienceCard({ experience = [], userContext, userId, contextId, isEditing, onEditToggle, onChange, onEntryImproved }) {
  const [improvingEntry, setImprovingEntry] = useState(null); // { entry, entryId, idx }
  const [tempData, setTempData] = useState(JSON.parse(JSON.stringify(experience)));

  const handleEntryChange = (idx, field, val) => {
    const next = [...tempData];
    if (field === 'bullets') {
      next[idx].bullets = val.split('\n').map(b => b.trim()).filter(b => b);
    } else {
      next[idx][field] = val;
    }
    setTempData(next);
  };

  const handleNestedProjectChange = (expIdx, pIdx, field, val) => {
    const next = [...tempData];
    if (field === 'bullets') {
      next[expIdx].projects[pIdx].bullets = val.split('\n').map(b => b.trim()).filter(b => b);
    } else {
      next[expIdx].projects[pIdx][field] = val;
    }
    setTempData(next);
  };

  const addExperience = () => setTempData([...tempData, { company: '', title: '', period: '', bullets: [], projects: [] }]);
  const removeExperience = (idx) => setTempData(tempData.filter((_, i) => i !== idx));

  const addNestedProject = (idx) => {
    const next = [...tempData];
    next[idx].projects = [...(next[idx].projects || []), { name: '', bullets: [] }];
    setTempData(next);
  };
  const removeNestedProject = (expIdx, pIdx) => {
    const next = [...tempData];
    next[expIdx].projects = next[expIdx].projects.filter((_, i) => i !== pIdx);
    setTempData(next);
  };

  if (isEditing) {
    return (
       <div className="section-card animate-in">
        <div className="card-title" style={{marginBottom: '16px'}}>
          <span className="mat-icon">work</span> Edit Experience
        </div>
        
        {tempData.map((exp, idx) => (
          <div key={idx} style={{marginBottom: '32px', padding: '16px', border: '1px solid var(--border)', borderRadius: '12px', position: 'relative', background: 'rgba(0,0,0,0.01)'}}>
            <button 
              className="btn-icon-only" 
              style={{position: 'absolute', top: '-10px', right: '-10px', background: 'var(--card)', color: '#ef4444'}}
              onClick={() => removeExperience(idx)}
            >
              <span className="mat-icon" style={{fontSize: '16px'}}>delete</span>
            </button>
            <div className="flex-row gap-3" style={{marginBottom: '12px'}}>
              <div style={{flex: 1}}>
                <label className="form-label">Company</label>
                <input type="text" value={exp.company} onChange={e => handleEntryChange(idx, 'company', e.target.value)} />
              </div>
              <div style={{flex: 1}}>
                <label className="form-label">Period</label>
                <input type="text" value={exp.period} onChange={e => handleEntryChange(idx, 'period', e.target.value)} placeholder="e.g. 2020 - Present" />
              </div>
            </div>
            <label className="form-label">Role Title</label>
            <input type="text" value={exp.title} onChange={e => handleEntryChange(idx, 'title', e.target.value)} style={{marginBottom: '16px'}} />

            <label className="form-label">Role Highlights (One per line)</label>
            <textarea 
              rows="3" 
              placeholder="Summary of responsibilities or key achievements..."
              value={(exp.bullets || []).join('\n')} 
              onChange={e => handleEntryChange(idx, 'bullets', e.target.value)}
              style={{fontSize: '13px', marginBottom: '16px'}}
            />

            <div style={{paddingLeft: '16px', borderLeft: '2px dashed var(--border)', marginLeft: '8px'}}>
               <p style={{fontSize: '11px', fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: '8px', textTransform: 'uppercase'}}>Nested Projects</p>
               {(exp.projects || []).map((proj, pIdx) => (
                 <div key={pIdx} style={{marginBottom: '16px', position: 'relative'}}>
                   <button 
                    className="btn-icon-only" 
                    style={{position: 'absolute', top: '0', right: '0', height: '20px', width: '20px'}}
                    onClick={() => removeNestedProject(idx, pIdx)}
                   >
                     <span className="mat-icon" style={{fontSize: '12px'}}>close</span>
                   </button>
                   <input 
                    type="text" 
                    placeholder="Project Name" 
                    value={proj.name} 
                    onChange={e => handleNestedProjectChange(idx, pIdx, 'name', e.target.value)}
                    style={{fontSize: '12px', padding: '6px 10px', marginBottom: '4px', fontWeight: 600}}
                   />
                   <textarea 
                    rows="2" 
                    placeholder="Project bullets (one per line)..."
                    value={(proj.bullets || []).join('\n')} 
                    onChange={e => handleNestedProjectChange(idx, pIdx, 'bullets', e.target.value)}
                    style={{fontSize: '11px', padding: '6px 10px', marginBottom: 0}}
                   />
                 </div>
               ))}
               <button className="btn" style={{fontSize: '11px', padding: '4px 10px'}} onClick={() => addNestedProject(idx)}>
                 <span className="mat-icon" style={{fontSize: '14px'}}>add</span> Add Nested Project
               </button>
            </div>
          </div>
        ))}

        <button className="btn" style={{width: '100%', borderStyle: 'dashed', marginBottom: '24px'}} onClick={addExperience}>
          <span className="mat-icon">add</span> Add New Work Experience
        </button>

        <div className="flex-between">
          <button className="btn" onClick={() => { setTempData(JSON.parse(JSON.stringify(experience))); onEditToggle(null); }}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onChange({ experience: tempData }); onEditToggle(null); }}>Save Changes</button>
        </div>
      </div>
    );
  }

  const handleAcceptEntry = (improvedEntry) => {
    // If it's a nested project...
    if (improvingEntry.isNestedProject) {
      if (onEntryImproved) onEntryImproved(improvingEntry.idx, improvedEntry, 'experience_project', improvingEntry.pIdx);
    } else {
      if (onEntryImproved) onEntryImproved(improvingEntry.idx, improvedEntry, 'experience');
    }
    setImprovingEntry(null);
  };

  return (
    <>
      {improvingEntry && (
        <EntryImprover
          entry={improvingEntry.entry}
          entryId={improvingEntry.entryId}
          section="experience"
          userContext={userContext}
          userId={userId}
          contextId={contextId}
          onAccept={handleAcceptEntry}
          onClose={() => setImprovingEntry(null)}
        />
      )}
      <div className="section-card">
        <div className="card-header">
          <div className="card-title">
            <span className="mat-icon">work</span> Work Experience
          </div>
          <button className="card-edit" onClick={() => onEditToggle('Work Experience')}>
            <span className="mat-icon">edit</span>
          </button>
        </div>
        {experience.length === 0 ? <p style={{fontSize: '12px', color: 'var(--muted-foreground)'}}>No experience added.</p> : null}
      {experience.map((exp, idx) => {
        const eid = `exp_${idx}`;
        return (
          <div key={idx} style={{
            marginBottom: '20px',
            paddingBottom: idx < experience.length - 1 ? '20px' : 0,
            borderBottom: idx < experience.length - 1 ? '1px solid var(--border)' : 'none',
            opacity: exp.hidden ? 0.5 : 1
          }}>
            <div className="flex-between" style={{alignItems: 'flex-start'}}>
              <div style={{display: 'flex', gap: '8px', alignItems: 'flex-start'}}>
                <button 
                  className="btn-icon-only" 
                  onClick={() => {
                    const next = [...experience];
                    next[idx] = { ...next[idx], hidden: !next[idx].hidden };
                    onChange({ experience: next });
                  }}
                  title={exp.hidden ? "Show in Resume" : "Hide from Resume"}
                  style={{marginTop: '2px', color: exp.hidden ? 'var(--muted-foreground)' : 'var(--accent)'}}
                >
                  <span className="mat-icon" style={{fontSize: '18px'}}>
                    {exp.hidden ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
                <div>
                  <strong style={{color: 'var(--foreground)'}}>{exp.title}</strong><br/>
                  <span style={{fontSize: '12px', color: 'var(--muted-foreground)'}}>{exp.company}</span>
                </div>
              </div>
              <div style={{fontSize: '11px', color: 'var(--muted-foreground)'}}>{exp.period}</div>
            </div>

            {/* Impact Score Badge for full Experience entry */}
            <ImpactScoreBadge
              score={exp.impact_score ?? null}
              loading={exp.impact_score === undefined}
              reasons={exp.impact_reasons}
              onImprove={() => setImprovingEntry({ entry: exp, entryId: eid, idx, isNestedProject: false })}
            />

            {/* Top-level bullets (Role highlights) */}
            {exp.bullets && exp.bullets.length > 0 && (
              <ul style={{margin: '8px 0', paddingLeft: '8px', listStyle: 'none', fontSize: '13px'}}>
                {exp.bullets.map((b, bIdx) => (
                  <li key={bIdx} style={{display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '4px'}}>
                    <span style={{color: 'var(--accent)', marginTop: '2px', flexShrink: 0}}>•</span>
                    <span style={{flex: 1, color: 'var(--foreground)'}}>{cleanBullet(b)}</span>
                  </li>
                ))}
              </ul>
            )}

            {exp.projects?.map((proj, pIdx) => {
              const pid = `${eid}_proj_${pIdx}`;
              return (
                <div key={pIdx} style={{
                  marginLeft: '12px', 
                  marginTop: '16px', 
                  borderLeft: '2px solid var(--accent)', 
                  paddingLeft: '16px',
                  background: 'rgba(0,82,255,0.02)',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  borderRadius: '0 8px 8px 0'
                }}>
                  <div className="flex-between">
                    <div style={{fontWeight: 700, fontSize: '13px', color: 'var(--foreground)', marginBottom: '4px'}}>
                      {proj.name}
                    </div>
                  </div>
                  
                  {/* Impact Score Badge for nested Project */}
                  <ImpactScoreBadge
                    score={proj.impact_score ?? null}
                    loading={proj.impact_score === undefined}
                    reasons={proj.impact_reasons}
                    compact={true}
                    onImprove={() => setImprovingEntry({ entry: proj, entryId: pid, idx, pIdx, isNestedProject: true })}
                  />

                  <ul style={{margin: '8px 0 0 0', paddingLeft: '4px', listStyle: 'none', fontSize: '12px'}}>
                    {proj.bullets?.map((pb, pbIdx) => (
                      <li key={pbIdx} style={{display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '4px'}}>
                        <span style={{color: 'var(--accent)', marginTop: '2px', flexShrink: 0}}>›</span>
                        <span style={{flex: 1, color: 'var(--foreground)', fontStyle: 'italic'}}>{cleanBullet(pb)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
    </>
  );
}

// Projects Card
export function ProjectsCard({ projects = [], userContext, userId, contextId, isEditing, onEditToggle, onChange, onEntryImproved }) {
  const [improvingEntry, setImprovingEntry] = useState(null);
  const [tempData, setTempData] = useState(JSON.parse(JSON.stringify(projects)));

  const handleEntryChange = (idx, field, val) => {
    const next = [...tempData];
    if (field === 'bullets') {
      next[idx].bullets = val.split('\n').map(b => b.trim()).filter(b => b);
    } else {
      next[idx][field] = val;
    }
    setTempData(next);
  };

  const addEntry = () => setTempData([...tempData, { name: '', bullets: [] }]);
  const removeEntry = (idx) => setTempData(tempData.filter((_, i) => i !== idx));

  const handleAcceptEntry = (improvedEntry) => {
    if (onEntryImproved) onEntryImproved(improvingEntry.idx, improvedEntry, 'projects');
    setImprovingEntry(null);
  };

  if (isEditing) {
    return (
       <div className="section-card animate-in">
        <div className="card-title" style={{marginBottom: '16px'}}>
          <span className="mat-icon">folder</span> Edit Projects
        </div>
        {tempData.map((proj, idx) => (
          <div key={idx} style={{marginBottom: '24px', padding: '16px', border: '1px solid var(--border)', borderRadius: '12px', position: 'relative', background: 'rgba(0,0,0,0.01)'}}>
            <button 
              className="btn-icon-only" 
              style={{position: 'absolute', top: '-10px', right: '-10px', background: 'var(--card)', color: '#ef4444', width: '24px', height: '24px'}}
              onClick={() => removeEntry(idx)}
            >
              <span className="mat-icon" style={{fontSize: '14px'}}>delete</span>
            </button>
            <label className="form-label">Project Name</label>
            <input type="text" value={proj.name} onChange={e => handleEntryChange(idx, 'name', e.target.value)} style={{marginBottom: '12px'}} />
            
            <label className="form-label">Live Project Link (Optional)</label>
            <input type="text" placeholder="https://demo.com" value={proj.live_link || ''} onChange={e => handleEntryChange(idx, 'live_link', e.target.value)} style={{marginBottom: '12px'}} />

            <label className="form-label">Key Achievements (One per line)</label>
            <textarea 
              rows="4" 
              value={(proj.bullets || []).join('\n')} 
              onChange={e => handleEntryChange(idx, 'bullets', e.target.value)} 
              placeholder="Architected system that enabled asynchronous services...&#10;Implemented PUB-SUB model to handle data updates..."
              style={{fontSize: '13px', marginBottom: 0}}
            />
          </div>
        ))}
        <button className="btn" style={{width: '100%', borderStyle: 'dashed', marginBottom: '24px'}} onClick={addEntry}>
          <span className="mat-icon">add</span> Add New Project
        </button>
        <div className="flex-between">
          <button className="btn" onClick={() => { setTempData(JSON.parse(JSON.stringify(projects))); onEditToggle(null); }}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onChange({ projects: tempData }); onEditToggle(null); }}>Save Changes</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {improvingEntry && (
        <EntryImprover
          entry={improvingEntry.entry}
          entryId={improvingEntry.entryId}
          section="projects"
          userContext={userContext}
          userId={userId}
          contextId={contextId}
          onAccept={handleAcceptEntry}
          onClose={() => setImprovingEntry(null)}
        />
      )}
      <div className="section-card">
        <div className="card-header">
          <div className="card-title"><span className="mat-icon">folder</span> Projects</div>
          <button className="card-edit" onClick={() => onEditToggle('Projects')}><span className="mat-icon">edit</span></button>
        </div>
        {projects.map((proj, idx) => {
        return (
          <div key={idx} style={{
            marginBottom: '16px',
            paddingBottom: idx < projects.length - 1 ? '16px' : 0,
            borderBottom: idx < projects.length - 1 ? '1px solid var(--border)' : 'none',
            opacity: proj.hidden ? 0.5 : 1
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px'}}>
              <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                <button 
                  className="btn-icon-only" 
                  onClick={() => {
                    const next = [...projects];
                    next[idx] = { ...next[idx], hidden: !next[idx].hidden };
                    onChange({ projects: next });
                  }}
                  title={proj.hidden ? "Show in Resume" : "Hide from Resume"}
                  style={{color: proj.hidden ? 'var(--muted-foreground)' : 'var(--accent)'}}
                >
                  <span className="mat-icon" style={{fontSize: '18px'}}>
                    {proj.hidden ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
                <div style={{fontWeight: 600, color: '#dc2626', fontSize: '13px'}}>{proj.name}</div>
              </div>
              {proj.live_link && <div style={{fontSize: '10px', color: 'var(--accent)'}}>🔗 {proj.live_link}</div>}
            </div>

            {/* Impact Score Badge */}
            <ImpactScoreBadge
              score={proj.impact_score ?? null}
              loading={proj.impact_score === undefined}
              reasons={proj.impact_reasons}
              onImprove={() => setImprovingEntry({ entry: proj, entryId: `proj_${idx}`, idx })}
            />

            <ul style={{margin: '6px 0', paddingLeft: '8px', listStyle: 'none', fontSize: '12px'}}>
              {proj.bullets?.map((b, i) => (
                <li key={i} style={{display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '3px'}}>
                  <span style={{color: '#dc2626', marginTop: '2px', flexShrink: 0}}>•</span>
                  <span style={{flex: 1, color: 'var(--foreground)'}}>{cleanBullet(b)}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
    </>
  );
}

// Education Card
export function EducationCard({ education = [], isEditing, onEditToggle, onChange }) {
  const [tempData, setTempData] = useState([...education]);

  const handleEntryChange = (idx, field, val) => {
    const next = [...tempData];
    next[idx] = { ...next[idx], [field]: val };
    setTempData(next);
  };

  const addEntry = () => setTempData([...tempData, { school: '', degree: '', period: '' }]);
  const removeEntry = (idx) => setTempData(tempData.filter((_, i) => i !== idx));

  if (isEditing) {
    return (
      <div className="section-card animate-in">
        <div className="card-title" style={{marginBottom: '16px'}}>
          <span className="mat-icon">school</span> Edit Education
        </div>
        {tempData.map((edu, idx) => (
          <div key={idx} style={{marginBottom: '20px', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', position: 'relative'}}>
            <button 
              className="btn-icon-only" 
              style={{position: 'absolute', top: '-10px', right: '-10px', background: 'var(--card)', color: '#ef4444', width: '24px', height: '24px'}}
              onClick={() => removeEntry(idx)}
            >
              <span className="mat-icon" style={{fontSize: '14px'}}>delete</span>
            </button>
            <input type="text" placeholder="School" value={edu.school} onChange={e => handleEntryChange(idx, 'school', e.target.value)} style={{marginBottom: '8px'}} />
            <input type="text" placeholder="Degree / Field of Study" value={edu.degree} onChange={e => handleEntryChange(idx, 'degree', e.target.value)} style={{marginBottom: '8px'}} />
            <input type="text" placeholder="Date Range (e.g. 2018 - 2022)" value={edu.period} onChange={e => handleEntryChange(idx, 'period', e.target.value)} style={{marginBottom: 0}} />
          </div>
        ))}
        <button className="btn" style={{width: '100%', borderStyle: 'dashed', marginBottom: '24px'}} onClick={addEntry}>
          <span className="mat-icon">add</span> Add Education
        </button>
        <div className="flex-between">
          <button className="btn" onClick={() => { setTempData([...education]); onEditToggle(null); }}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onChange({ education: tempData }); onEditToggle(null); }}>Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="section-card">
      <div className="card-header">
        <div className="card-title"><span className="mat-icon">school</span> Education</div>
        <button className="card-edit" onClick={() => onEditToggle('Education')}><span className="mat-icon">edit</span></button>
      </div>
      {education.length === 0 && <p style={{fontSize: '12px', color: 'var(--muted-foreground)'}}>No education entries.</p>}
      {education.map((edu, idx) => (
        <div key={idx} style={{marginBottom: '12px', opacity: edu.hidden ? 0.5 : 1}}>
          <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
            <button 
              className="btn-icon-only" 
              onClick={() => {
                const next = [...education];
                next[idx] = { ...next[idx], hidden: !next[idx].hidden };
                onChange({ education: next });
              }}
              title={edu.hidden ? "Show in Resume" : "Hide from Resume"}
              style={{color: edu.hidden ? 'var(--muted-foreground)' : 'var(--accent)'}}
            >
              <span className="mat-icon" style={{fontSize: '18px'}}>
                {edu.hidden ? 'visibility_off' : 'visibility'}
              </span>
            </button>
            <strong style={{color: 'var(--foreground)'}}>{edu.degree}</strong>
          </div>
          <div style={{fontSize: '12px', color: 'var(--muted-foreground)', marginLeft: '26px'}}>{edu.school} | {edu.period}</div>
        </div>
      ))}
    </div>
  );
}

// Skills Card
export function SkillsCard({ skills = {}, isEditing, onEditToggle, onChange, onGenerate, isGenerating }) {
  const [tempData, setTempData] = useState(JSON.parse(JSON.stringify(skills)));

  const handleCategoryChange = (oldCat, newCat) => {
    const next = { ...tempData };
    const val = next[oldCat];
    delete next[oldCat];
    next[newCat] = val;
    setTempData(next);
  };

  const handleTagsChange = (cat, tagString) => {
    const tags = tagString.split(',').map(t => t.trim()).filter(t => t);
    setTempData({ ...tempData, [cat]: tags });
  };

  const addCategory = () => setTempData({ ...tempData, "New Category": [] });
  const removeCategory = (cat) => {
    const next = { ...tempData };
    delete next[cat];
    setTempData(next);
  };

  if (isEditing) {
    return (
      <div className="section-card animate-in">
        <div className="card-title" style={{marginBottom: '16px'}}>
          <span className="mat-icon">bolt</span> Edit Skills
        </div>
        {Object.entries(tempData).map(([cat, tags], idx) => (
          <div key={idx} style={{marginBottom: '16px', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', position: 'relative'}}>
             <button 
              className="btn-icon-only" 
              style={{position: 'absolute', top: '-10px', right: '-10px', background: 'var(--card)', color: '#ef4444', width: '24px', height: '24px'}}
              onClick={() => removeCategory(cat)}
            >
              <span className="mat-icon" style={{fontSize: '14px'}}>delete</span>
            </button>
            <input 
              type="text" 
              value={cat} 
              onChange={e => handleCategoryChange(cat, e.target.value)} 
              style={{fontWeight: 600, fontSize: '13px', marginBottom: '8px', border: 'none', padding: 0}}
              placeholder="Category Name"
            />
            <textarea 
              rows="2"
              value={tags.join(', ')} 
              onChange={e => handleTagsChange(cat, e.target.value)}
              placeholder="Enter skills separated by commas..."
              style={{fontSize: '12px', marginBottom: 0}}
            />
          </div>
        ))}
        <button className="btn" style={{width: '100%', borderStyle: 'dashed', marginBottom: '24px'}} onClick={addCategory}>
          <span className="mat-icon">add</span> Add Category
        </button>
        <div className="flex-between">
          <button className="btn" onClick={() => { setTempData(JSON.parse(JSON.stringify(skills))); onEditToggle(null); }}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onChange({ skills: tempData }); onEditToggle(null); }}>Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="section-card">
      <div className="card-header">
        <div className="card-title"><span className="mat-icon">bolt</span> Skills</div>
        <div className="flex-row gap-2">
          {Object.keys(skills || {}).length === 0 && onGenerate && (
            <button onClick={onGenerate} className="btn-fix-icon" style={{ borderRadius: '6px', width: 'auto', padding: '0 8px' }} disabled={isGenerating}>
              <span className="mat-icon" style={{ fontSize: '13px' }}>auto_awesome</span>
              <span style={{ fontSize: '11px', fontWeight: 600, marginLeft: '4px' }}>{isGenerating ? "Generating..." : "Auto-Generate"}</span>
            </button>
          )}
          <button className="card-edit" onClick={() => onEditToggle('Skills')}><span className="mat-icon">edit</span></button>
        </div>
      </div>
      {Object.keys(skills || {}).length === 0 ? (
        <div style={{fontSize: '12px', color: 'var(--muted-foreground)', fontStyle: 'italic'}}>No skills added. Click 'Auto-Generate' to let AI infer them from your experience.</div>
      ) : (
        <SkillTags skills={skills} />
      )}
    </div>
  );
}

// Achievements Card
export function AchievementsCard({ 
  achievements = [], 
  isEditing, 
  onEditToggle, 
  onChange,
  score,
  reasons,
  userId,
  contextId,
  userContext
}) {
  const [tempData, setTempData] = useState(achievements.map(a => typeof a === 'string' ? { text: a, hidden: false } : a));
  const [improvingEntry, setImprovingEntry] = useState(null);

  if (improvingEntry) {
    return (
      <EntryImprover 
        entry={improvingEntry.entry}
        entryId={improvingEntry.entryId}
        section="achievements"
        userId={userId}
        contextId={contextId}
        userContext={userContext}
        onClose={() => setImprovingEntry(null)}
        onAccepted={(improved) => {
          onChange({ achievements: improved.bullets || improved.achievements || achievements });
          setImprovingEntry(null);
        }}
      />
    );
  }


  if (isEditing) {
    return (
      <div className="section-card animate-in">
        <div className="card-title" style={{marginBottom: '12px'}}>
          <span className="mat-icon">workspace_premium</span> Edit Achievements
        </div>
        <label className="form-label">Achievements / Awards (One per line)</label>
        <textarea 
           rows="6" 
           value={tempData.map(a => typeof a === 'string' ? a : a.text).join('\n')} 
           onChange={e => setTempData(e.target.value.split('\n').map(l => ({ text: l, hidden: false })))} 
           style={{fontSize: '13px'}}
           placeholder="AWS Certified Solution Architect&#10;3-star Leetcode Problem Solver"
        />
        <div className="flex-between" style={{marginTop: '16px'}}>
          <button className="btn" onClick={() => { setTempData(achievements.map(a => typeof a === 'string' ? { text: a, hidden: false } : a)); onEditToggle(null); }}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { 
            const list = tempData.filter(l => l.text.trim()).map(l => ({...l, text: l.text.trim()}));
            onChange({ achievements: list }); 
            onEditToggle(null); 
          }}>Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="section-card">
      <div className="card-header">
        <div className="card-title"><span className="mat-icon">workspace_premium</span> Achievements</div>
        <button className="card-edit" onClick={() => onEditToggle('Achievements')}>
          <span className="mat-icon">edit</span>
        </button>
      </div>

      <ImpactScoreBadge
        score={score ?? null}
        loading={score === undefined && achievements.length > 0}
        reasons={reasons}
        onImprove={() => setImprovingEntry({ entry: { bullets: achievements.map(a => typeof a === 'string' ? a : a.text) }, entryId: 'achievements' })}
      />

      {achievements.length === 0 && <p style={{fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '8px'}}>No achievements.</p>}
      <div style={{ marginTop: '10px' }}>
        {achievements.map((a, idx) => {
          const text = typeof a === 'string' ? a : a.text;
          const hidden = typeof a === 'string' ? false : a.hidden;
          return (
            <div key={idx} style={{fontSize: '12px', color: 'var(--foreground)', marginBottom: '4px', display: 'flex', alignItems: 'center', opacity: hidden ? 0.5 : 1}}>
              <button 
                className="btn-icon-only" 
                onClick={() => {
                  const next = achievements.map(x => (typeof x === 'string' ? { text: x, hidden: false } : x));
                  next[idx].hidden = !next[idx].hidden;
                  onChange({ achievements: next });
                }}
                style={{color: hidden ? 'var(--muted-foreground)' : 'var(--accent)', padding: 0, width: '20px', height: '20px'}}
              >
                <span className="mat-icon" style={{fontSize: '14px'}}>{hidden ? 'visibility_off' : 'visibility'}</span>
              </button>
              • {text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
