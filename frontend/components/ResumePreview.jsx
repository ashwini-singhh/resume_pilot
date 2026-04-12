import React, { useState } from 'react';

const cleanBullet = (text = '') => text.replace(/^[\s•\-\*›·◦▪▸→]+/, '').trim();

export default function ResumePreview({ profile, onOpenUpload, onEditTab, onUpdateProfile }) {
  const [fontFam, setFontFam] = useState("Inter (Modern)");
  const [fontSz, setFontSz] = useState(11);
  const [lineHt, setLineHt] = useState(1.6);
  const [fitPage, setFitPage] = useState(false);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const ALL_SECTIONS = ["Work Experience", "Projects", "Education", "Skills", "Achievements"];
  const sectionOrder = profile.preview_section_order || profile.section_order || ALL_SECTIONS;

  const handleToggleSection = (sec) => {
    let newOrder = [...sectionOrder];
    if (newOrder.includes(sec)) {
      newOrder = newOrder.filter(s => s !== sec);
    } else {
      // Add back in a reasonable place or just at the end
      newOrder.push(sec);
    }
    onUpdateProfile({ ...profile, preview_section_order: newOrder });
  };

  const handleDragStart = (e, idx) => {
    e.dataTransfer.setData('sourceIdx', idx);
  };

  const handleDrop = (e, targetIdx) => {
    const sourceIdx = e.dataTransfer.getData('sourceIdx');
    if (sourceIdx === targetIdx) return;
    const newOrder = [...sectionOrder];
    const [moved] = newOrder.splice(sourceIdx, 1);
    newOrder.splice(targetIdx, 0, moved);
    onUpdateProfile({ ...profile, preview_section_order: newOrder });
    setDragOverIdx(null);
  };

  const ffMap = {
    "Inter (Modern)": "'Inter', sans-serif",
    "Arial": "Arial, sans-serif",
    "Times New Roman": "'Times New Roman', serif",
    "Georgia": "Georgia, serif"
  };

  const scale = fontSz / 11.0;
  const ff = ffMap[fontFam] || ffMap["Inter (Modern)"];

  return (
    <div className="dashboard-container" style={{maxWidth: '1200px'}}>
      
      {/* Settings / Control Panel */}
      <div className="sidebar" style={{width: '320px'}}>
        <h3 style={{marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
          <span className="mat-icon" style={{color: 'var(--muted-foreground)'}}>palette</span> Font Styling
        </h3>
        
        <label className="form-label">Font Family</label>
        <select value={fontFam} onChange={e => setFontFam(e.target.value)}>
          <option>Inter (Modern)</option>
          <option>Arial</option>
          <option>Times New Roman</option>
          <option>Georgia</option>
        </select>

        <div className="flex-between" style={{marginBottom: '16px'}}>
          <label className="form-label">Font Size</label>
          <span style={{fontSize: '12px'}}>{fontSz}pt</span>
        </div>
        <input 
          type="range" 
          min="9" max="14" 
          value={fontSz} 
          onChange={e => setFontSz(Number(e.target.value))} 
          style={{width: '100%', marginBottom: '24px'}}
        />

        <div className="flex-between" style={{marginBottom: '16px'}}>
          <label className="form-label">Line Spacing</label>
          <span style={{fontSize: '12px'}}>{lineHt}</span>
        </div>
        <input 
          type="range" 
          min="1" max="2.5" step="0.1"
          value={lineHt} 
          onChange={e => setLineHt(Number(e.target.value))} 
          style={{width: '100%', marginBottom: '24px'}}
        />

        <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '24px'}}>
          <input type="checkbox" checked={fitPage} onChange={e => setFitPage(e.target.checked)} style={{width: 'auto', marginBottom: 0}} />
          Fit to one page
        </label>

        <button className="btn" style={{width: '100%'}} onClick={() => { setFontFam("Inter (Modern)"); setFontSz(11); setLineHt(1.6); setFitPage(false); }}>
          <span className="mat-icon">undo</span> Reset defaults
        </button>

        <div style={{borderBottom: '1px solid var(--border)', margin: '24px 0'}}></div>

        <h3 style={{marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
          <span className="mat-icon" style={{color: 'var(--muted-foreground)'}}>reorder</span> Section Order
        </h3>
        <p style={{fontSize: '11px', color: 'var(--muted-foreground)', marginBottom: '12px'}}>Drag items to reorder. Toggle eye to hide.</p>
        
        <div className="section-order-list">
          {/* First show active sections in their current order */}
          {sectionOrder.map((sec, idx) => {
            return (
              <div 
                key={sec}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                onDrop={(e) => handleDrop(e, idx)}
                className="section-order-item"
                style={{
                  padding: '10px 12px',
                  background: 'var(--card)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  border: `1px solid ${dragOverIdx === idx ? 'var(--accent)' : 'var(--border)'}`,
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'grab',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <span style={{fontWeight: 700, color: 'var(--accent)', minWidth: '18px'}}>{idx + 1}.</span>
                  <span style={{fontWeight: 500}}>{sec}</span>
                </div>
                <button 
                  onClick={() => handleToggleSection(sec)}
                  style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex'}}
                  title="Hide Section"
                >
                  <span className="mat-icon" style={{fontSize: '20px'}}>visibility</span>
                </button>
              </div>
            );
          })}

          {/* Then show hidden sections at the bottom */}
          {ALL_SECTIONS.filter(s => !sectionOrder.includes(s)).map((sec) => (
            <div 
              key={sec}
              className="section-order-item"
              style={{
                padding: '10px 12px',
                background: 'transparent',
                borderRadius: '8px',
                fontSize: '13px',
                border: '1px solid var(--border)',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: 0.5,
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <span style={{minWidth: '18px'}}>—</span>
                <span style={{fontWeight: 500}}>{sec}</span>
              </div>
              <button 
                onClick={() => handleToggleSection(sec)}
                style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex'}}
                title="Show Section"
              >
                <span className="mat-icon" style={{fontSize: '20px'}}>visibility_off</span>
              </button>
            </div>
          ))}
        </div>

        <div style={{borderBottom: '1px solid var(--border)', margin: '24px 0'}}></div>
        
        <button className="btn btn-primary" style={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}} onClick={() => {
          const count = Number(localStorage.getItem('usage_count') || 0);
          if (count >= 5) return alert("Monthly import limit reached! Take Premium to work on more resumes.");
          onOpenUpload();
        }}>
          <span className="mat-icon">auto_awesome</span> Upload & Parse
        </button>
      </div>

      {/* Actual Rendered Document Panel */}
      <div className="main-column" style={{background: '#0b1120', padding: '32px', borderRadius: '16px', flex: 1}}>
        <div className="flex-between" style={{marginBottom: '24px'}}>
            <h2 style={{color: 'white', margin: 0}}>Resume Preview</h2>
            <div className="flex-row gap-2">
              <button className="btn" onClick={onEditTab}><span className="mat-icon">edit</span> Edit</button>
              <button className="btn" onClick={() => alert("Cloud Sync: coming soon")}><span className="mat-icon">save</span> Save</button>
              <button className="btn btn-danger" onClick={() => {
                const count = Number(localStorage.getItem('usage_count') || 0);
                if (count >= 5) return alert("Monthly export limit reached! Take Premium to work on more resumes.");
                localStorage.setItem('usage_count', (count + 1).toString());
                window.print();
              }}>
                <span className="mat-icon">download</span> Export PDF
              </button>
            </div>
        </div>

        <div className="info-banner" style={{background: 'rgba(5b, 130, 246, 0.1)', color: '#93c5fd', borderColor: 'rgba(59,130,246,0.3)'}}>
          <span className="mat-icon" style={{color: '#3b82f6'}}>info</span>
          This format is used when your resume is exported.
        </div>

        <div className="resume-doc-container" style={{transformOrigin: 'top center'}}>
          <div className={`resume-doc animate-in ${fitPage ? 'fit-one-page' : ''}`} style={{fontFamily: ff, lineHeight: lineHt}}>
            <div className="r-name" style={{fontSize: `${32*scale}px`}}>{profile.name || 'JOHN DOE'}</div>
            <div className="r-contact" style={{fontSize: `${12*scale}px`}}>
              {profile.email || 'johndoe@email.com'} | {profile.phone || '555-5555'} | {profile.location || 'New York, NY'}
            </div>

            {sectionOrder.map(sec => {
              if (sec.includes('Experience') && (profile.experience || []).length > 0) {
                 return (
                   <React.Fragment key="exp">
                     <div className="r-section" style={{fontSize: `${14*scale}px`}}>WORK EXPERIENCE</div>
                     {profile.experience.map((e, idx) => {
                       const eid = `exp_${idx}`;
                       const isHidden = (profile.hidden_entries || []).includes(eid);
                       return (
                         <div key={idx} style={{marginBottom: '12px', position: 'relative', opacity: isHidden ? 0.3 : 1}}>
                           <button 
                             className="hide-entry-btn"
                             onClick={() => {
                               let hidden = [...(profile.hidden_entries || [])];
                               if (isHidden) hidden = hidden.filter(h => h !== eid);
                               else hidden.push(eid);
                               onUpdateProfile({...profile, hidden_entries: hidden});
                             }}
                             title={isHidden ? "Show entry" : "Hide entry"}
                           >
                             <span className="mat-icon" style={{fontSize: '16px'}}>{isHidden ? 'visibility' : 'visibility_off'}</span>
                           </button>

                           <div className="r-entry-header" style={{fontSize: `${14*scale}px`}}>
                             <span>{e.company}</span>
                             <span>{e.period}</span>
                           </div>
                           <div className="r-entry-sub" style={{fontSize: `${13*scale}px`}}>{e.title}</div>
                           
                           {/* Render role-level bullets (Highlights) */}
                           {!isHidden && e.bullets?.map((b, bIdx) => (
                             <div key={bIdx} className="r-bullet" style={{fontSize: `${12*scale}px`}}>{cleanBullet(b)}</div>
                           ))}

                           {!isHidden && (e.projects || []).map((proj, pIdx) => {
                             const pid = `${eid}_proj_${pIdx}`;
                             const isHiddenProj = (profile.hidden_entries || []).includes(pid);
                             return (
                               <div key={pIdx} style={{marginTop: '6px', opacity: isHiddenProj ? 0.3 : 1, position: 'relative'}}>
                                 <button 
                                   className="hide-entry-btn"
                                   onClick={() => {
                                     let hidden = [...(profile.hidden_entries || [])];
                                     if (isHiddenProj) hidden = hidden.filter(h => h !== pid);
                                     else hidden.push(pid);
                                     onUpdateProfile({...profile, hidden_entries: hidden});
                                   }}
                                 >
                                    <span className="mat-icon" style={{fontSize: '14px'}}>{isHiddenProj ? 'visibility' : 'visibility_off'}</span>
                                 </button>
                                 <div style={{fontSize: `${13*scale}px`, fontWeight: 600, fontStyle: 'italic', color: '#4b5563'}}>{proj.name}</div>
                                 {!isHiddenProj && proj.bullets?.map((pb, pbIdx) => (
                                   <div key={pbIdx} className="r-bullet" style={{fontSize: `${12*scale}px`, marginLeft: '12px'}}>{cleanBullet(pb)}</div>
                                 ))}
                               </div>
                             );
                           })}
                         </div>
                       );
                     })}
                   </React.Fragment>
                 );
              }
              if (sec.includes('Education') && (profile.education || []).length > 0) {
                 return (
                   <React.Fragment key="edu">
                     <div className="r-section" style={{fontSize: `${14*scale}px`}}>EDUCATION</div>
                     {profile.education.map((e, idx) => (
                       <div key={idx} style={{marginBottom: '12px'}}>
                         <div className="r-entry-header" style={{fontSize: `${14*scale}px`}}>
                           <span>{e.school}</span>
                           <span>{e.period}</span>
                         </div>
                         <div className="r-entry-sub" style={{fontSize: `${13*scale}px`}}>{e.degree}</div>
                       </div>
                     ))}
                   </React.Fragment>
                 );
              }
              if (sec.includes('Projects') && (profile.projects || []).length > 0) {
                 return (
                   <React.Fragment key="proj">
                     <div className="r-section" style={{fontSize: `${14*scale}px`}}>PROJECTS</div>
                     {profile.projects.map((p, idx) => {
                       const eid = `proj_${idx}`;
                       const isHidden = (profile.hidden_entries || []).includes(eid);
                       return (
                         <div key={idx} style={{marginBottom: '12px', position: 'relative', opacity: isHidden ? 0.3 : 1}}>
                            <button 
                             className="hide-entry-btn"
                             onClick={() => {
                               let hidden = [...(profile.hidden_entries || [])];
                               if (isHidden) hidden = hidden.filter(h => h !== eid);
                               else hidden.push(eid);
                               onUpdateProfile({...profile, hidden_entries: hidden});
                             }}
                            >
                              <span className="mat-icon" style={{fontSize: '16px'}}>{isHidden ? 'visibility' : 'visibility_off'}</span>
                            </button>
                           <div className="r-entry-header" style={{fontSize: `${14*scale}px`}}>
                             <span>{p.name}</span>
                           </div>
                           {!isHidden && p.bullets?.map((b, bIdx) => (
                             <div key={bIdx} className="r-bullet" style={{fontSize: `${13*scale}px`}}>{cleanBullet(b)}</div>
                           ))}
                         </div>
                       );
                     })}
                   </React.Fragment>
                 );
              }
              if (sec.includes('Skills') && Object.keys(profile.skills || {}).length > 0) {
                 return (
                   <React.Fragment key="sk">
                     <div className="r-section" style={{fontSize: `${14*scale}px`}}>SKILLS</div>
                     {Object.entries(profile.skills).map(([cat, tags], idx) => (
                       <div key={idx} style={{fontSize: `${13*scale}px`, marginBottom: '4px'}}>
                         <strong>{cat}: </strong> {tags.join(", ")}
                       </div>
                     ))}
                   </React.Fragment>
                 );
              }
              if (sec.includes('Achievements') && (profile.achievements || []).length > 0) {
                 return (
                   <React.Fragment key="cert">
                     <div className="r-section" style={{fontSize: `${14*scale}px`}}>ACHIEVEMENTS</div>
                     {profile.achievements.map((c, idx) => (
                       <div key={idx} style={{fontSize: `${13*scale}px`, marginBottom: '2px'}}>• {c}</div>
                     ))}
                   </React.Fragment>
                 );
              }
              return null;
            })}

          </div>
        </div>

      </div>
    </div>
  );
}
