import React, { useState } from 'react';
import { cleanBullet } from '../lib/resumeUtils';
import { templateRegistry } from '../lib/templateRegistry';

export default function ResumePreview({ profile, onOpenUpload, onEditTab, onUpdateProfile, isLivePreview = false }) {
  const [previewProfile, setPreviewProfile] = useState(profile);
  const [accentColor, setAccentColor] = useState('#2563eb');
  const [sectionGap, setSectionGap] = useState(20);
  const [blockGap, setBlockGap] = useState(12);
  const [docPadding, setDocPadding] = useState(40);
  const [fontSz, setFontSz] = useState(11);
  const [fontFam, setFontFam] = useState("Times New Roman");
  const [lineHt, setLineHt] = useState(1.6);
  const [fitPage, setFitPage] = useState(false);
  const [activeTab, setActiveTab] = useState('styling'); // 'styling' or 'templates'
  const [selectedTemplate, setSelectedTemplate] = useState('standard');
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const ALL_SECTIONS = ["Work Experience", "Projects", "Education", "Skills", "Achievements"];
  const sectionOrder = profile?.preview_section_order || profile?.section_order || ALL_SECTIONS;

  const handleToggleSection = (sec) => {
    let newOrder = [...sectionOrder];
    if (newOrder.includes(sec)) {
      newOrder = newOrder.filter(s => s !== sec);
    } else {
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

  const ActiveTemplate = templateRegistry[selectedTemplate].component;

  const toggleVisibility = (entryId) => {
    let hidden = [...(previewProfile.hidden_entries || [])];
    if (hidden.includes(entryId)) {
      hidden = hidden.filter(h => h !== entryId);
    } else {
      hidden.push(entryId);
    }
    setPreviewProfile({ ...previewProfile, hidden_entries: hidden });
  };

  const handleDirectEdit = (path, value) => {
    // Deep clone to ensure isolated state updates
    const updated = JSON.parse(JSON.stringify(previewProfile));
    const parts = path.split('.');
    let current = updated;
    for (let i = 0; i < parts.length - 1; i++) {
        // Handle array indices and object keys
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    setPreviewProfile(updated);
  };

  return (
    <div className={!isLivePreview ? "dashboard-container" : ""} style={!isLivePreview ? {maxWidth: '1200px'} : { height: '100%' }}>
      
      {/* Settings / Control Panel */}
      {!isLivePreview && (
        <div className="sidebar" style={{width: '320px', display: 'flex', flexDirection: 'column'}}>
          
          {/* Tab Navigation */}
          <div style={{ display: 'flex', background: 'var(--muted)', borderRadius: '12px', padding: '4px', marginBottom: '24px' }}>
            <button 
              onClick={() => setActiveTab('styling')}
              style={{ 
                flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                background: activeTab === 'styling' ? 'var(--card)' : 'transparent',
                color: activeTab === 'styling' ? 'var(--foreground)' : 'var(--muted-foreground)',
                boxShadow: activeTab === 'styling' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Styling
            </button>
            <button 
              onClick={() => setActiveTab('templates')}
              style={{ 
                flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                background: activeTab === 'templates' ? 'var(--card)' : 'transparent',
                color: activeTab === 'templates' ? 'var(--foreground)' : 'var(--muted-foreground)',
                boxShadow: activeTab === 'templates' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Templates
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            {activeTab === 'styling' ? (
              <>
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

                <h3 style={{marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span className="mat-icon" style={{color: 'var(--muted-foreground)'}}>format_bold</span> Text Formatting
                </h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                  {[
                    { cmd: 'bold', icon: 'format_bold', label: 'B' },
                    { cmd: 'italic', icon: 'format_italic', label: 'I' },
                    { cmd: 'underline', icon: 'format_underlined', label: 'U' },
                    { cmd: 'removeFormat', icon: 'format_clear', label: 'Clear' }
                  ].map(tool => (
                    <button
                      key={tool.cmd}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevents losing focus on the editable element
                        document.execCommand(tool.cmd, false, null);
                      }}
                      className="btn"
                      style={{ 
                        flex: 1, 
                        flexDirection: 'column', 
                        padding: '12px 0', 
                        gap: '4px',
                        background: 'var(--card)',
                        border: '1px solid var(--border)'
                      }}
                      title={tool.cmd}
                    >
                      <span className="mat-icon" style={{fontSize: '20px'}}>{tool.icon}</span>
                      <span style={{fontSize: '10px', fontWeight: 600}}>{tool.label}</span>
                    </button>
                  ))}
                </div>

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

                <div style={{borderBottom: '1px solid var(--border)', margin: '24px 0'}}></div>
                
                <h3 style={{marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span className="mat-icon" style={{color: 'var(--muted-foreground)'}}>brush</span> Dynamic Styling
                </h3>

                <label className="form-label">Accent Color</label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                  <input 
                    type="color" 
                    value={accentColor} 
                    onChange={e => setAccentColor(e.target.value)}
                    style={{ width: '40px', height: '40px', padding: 0, border: 'none', background: 'none' }}
                  />
                  <input 
                    type="text" 
                    value={accentColor} 
                    onChange={e => setAccentColor(e.target.value)}
                    style={{ flex: 1, fontSize: '13px' }}
                  />
                </div>

                <div className="flex-between" style={{marginBottom: '12px'}}>
                  <label className="form-label">Section Spacing</label>
                  <span style={{fontSize: '11px'}}>{sectionGap}px</span>
                </div>
                <input type="range" min="8" max="64" value={sectionGap} onChange={e => setSectionGap(Number(e.target.value))} style={{width: '100%', marginBottom: '16px'}} />

                <div className="flex-between" style={{marginBottom: '12px'}}>
                  <label className="form-label">Entry Spacing</label>
                  <span style={{fontSize: '11px'}}>{blockGap}px</span>
                </div>
                <input type="range" min="4" max="32" value={blockGap} onChange={e => setBlockGap(Number(e.target.value))} style={{width: '100%', marginBottom: '16px'}} />

                <div className="flex-between" style={{marginBottom: '12px'}}>
                  <label className="form-label">Page Margins</label>
                  <span style={{fontSize: '11px'}}>{docPadding}px</span>
                </div>
                <input type="range" min="0" max="80" value={docPadding} onChange={e => setDocPadding(Number(e.target.value))} style={{width: '100%', marginBottom: '24px'}} />

                <button className="btn" style={{width: '100%', gap: '8px'}} onClick={() => { 
                   setFontFam("Inter (Modern)"); setFontSz(11); setLineHt(1.6); setFitPage(false); 
                   setAccentColor('#2563eb'); setSectionGap(20); setBlockGap(12); setDocPadding(40);
                   setPreviewProfile(profile);
                }}>
                  <span className="mat-icon">history</span> Reset to Master
                </button>

                <div style={{borderBottom: '1px solid var(--border)', margin: '24px 0'}}></div>

                <h3 style={{marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span className="mat-icon" style={{color: 'var(--muted-foreground)'}}>reorder</span> Section Order
                </h3>
                <p style={{fontSize: '11px', color: 'var(--muted-foreground)', marginBottom: '12px'}}>Drag items to reorder. Toggle eye to hide.</p>
                
                <div className="section-order-list">
                  {sectionOrder.map((sec, idx) => (
                    <div 
                      key={sec}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                      onDrop={(e) => handleDrop(e, idx)}
                      className="section-order-item"
                      style={{
                        padding: '10px 12px', background: 'var(--card)', borderRadius: '8px', fontSize: '13px',
                        border: `1px solid ${dragOverIdx === idx ? 'var(--accent)' : 'var(--border)'}`,
                        marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'grab', transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <span style={{fontWeight: 700, color: 'var(--accent)', minWidth: '18px'}}>{idx + 1}.</span>
                        <span style={{fontWeight: 500}}>{sec}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="animate-in">
                <h3 style={{marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span className="mat-icon" style={{color: 'var(--muted-foreground)'}}>auto_awesome_motion</span> Templates
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginBottom: '16px' }}>Preview only (does not affect saved data)</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {['Visual', 'Professional', 'Tech', 'Modern', 'Traditional', 'Corporate', 'Creative'].map(cat => {
                    const group = Object.entries(templateRegistry).filter(([_, cfg]) => cfg.category === cat);
                    if (group.length === 0) return null;
                    return (
                      <div key={cat}>
                        <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: '8px', paddingLeft: '4px' }}>{cat}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {group.map(([id, config]) => (
                            <div 
                              key={id} 
                              onClick={() => setSelectedTemplate(id)}
                              style={{
                                padding: '10px 12px', borderRadius: '10px',
                                border: `1px solid ${selectedTemplate === id ? 'var(--accent)' : 'var(--border)'}`,
                                background: selectedTemplate === id ? 'rgba(0,82,255,0.04)' : 'var(--card)',
                                cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '10px'
                              }}
                            >
                              <div style={{ 
                                width: '32px', height: '32px', borderRadius: '8px', 
                                background: selectedTemplate === id ? 'var(--accent)' : 'var(--muted)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}>
                                <span className="mat-icon" style={{ fontSize: '18px', color: selectedTemplate === id ? 'white' : 'var(--muted-foreground)' }}>{config.icon}</span>
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '12px', fontWeight: 700 }}>{config.name}</div>
                                <div style={{ fontSize: '10px', color: 'var(--muted-foreground)' }}>{config.description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div style={{borderBottom: '1px solid var(--border)', margin: '24px 0'}}></div>
          <button className="btn btn-primary" style={{width: '100%', gap: '8px'}} onClick={onOpenUpload}>
            <span className="mat-icon">auto_awesome</span> Upload & Parse
          </button>
        </div>
      )}

      {/* Actual Rendered Document Panel */}
      <div className="main-column" style={{background: isLivePreview ? 'transparent' : '#0b1120', padding: isLivePreview ? '4px' : '32px', borderRadius: '16px', flex: 1, minWidth: 0}}>
        {!isLivePreview && (
          <>
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
          </>
        )}

        <div className="resume-doc-container" style={{transformOrigin: 'top center', overflow: isLivePreview ? 'hidden' : undefined, borderRadius: isLivePreview ? '12px' : 0}}>
          <ActiveTemplate 
            profile={previewProfile} 
            sectionOrder={sectionOrder}
            scale={scale}
            lineHt={lineHt}
            ff={ff}
            accentColor={accentColor}
            spacing={{ sectionGap: `${sectionGap}px`, blockGap: `${blockGap}px`, padding: `${docPadding}px` }}
            isLivePreview={isLivePreview}
            onToggleVisibility={toggleVisibility}
            onDirectEdit={handleDirectEdit}
          />
        </div>

      </div>
    </div>
  );
}
