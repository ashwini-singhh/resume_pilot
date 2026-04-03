import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import MasterProfile from '../components/MasterProfile';
import ResumePreview from '../components/ResumePreview';
import DiffText from '../components/DiffText';
import * as api from '../lib/api';

const DEFAULT_PROFILE = {
  name: "Ashwini Singh",
  email: "ashwini@example.com",
  phone: "(555) 555-5555",
  location: "San Francisco, CA",
  experience: [
    {
      title: "Senior Software Engineer", company: "Google", period: "Jan 2021 — Present",
      bullets: ["Led development of microservices handling 10M+ daily requests."],
      projects: [
        {
          name: "AdSense Modernization",
          bullets: ["Optimized rendering paths resulting in 30% performance boost.", "Integrated machine learning for predictive bidding assistance."]
        }
      ]
    }
  ],
  projects: [
    { name: "Resume Auditor SaaS", bullets: ["Migrated Streamlit app to Next.js + FastAPI decoupled architecture."] }
  ],
  education: [
    { degree: "B.S. Computer Science", school: "University", period: "2016 — 2020" }
  ],
  skills: {
    "Languages": ["Python", "JavaScript", "Go"],
    "Frameworks": ["React", "Next.js", "FastAPI"]
  },
  certifications: ["AWS Certified Solutions Architect"],
  section_order: ["Work Experience", "Projects", "Education", "Skills", "Certifications"]
};

export default function AppIndex() {
  const [activePage, setActivePage] = useState('dashboard');
  
  // App overarching state (equivalent to st.session_state["profile"])
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [editingSection, setEditingSection] = useState(null);
  
  const [githubSyncData, setGithubSyncData] = useState({ fetchedData: null, projects: [], newSkills: [] });

  // AI Optimize States
  const [jdText, setJdText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [llmConfig, setLlmConfig] = useState({
    provider: "gemini",
    api_key: "",
    model: "gemini-2.0-flash"
  });

  // Modal dialog states
  const [showUpload, setShowUpload] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Upload Modal States
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadText, setUploadText] = useState("");
  const [extractionStep, setExtractionStep] = useState(""); // "" | "parsing" | "condensing" | "scoring"
  const fileInputRef = React.useRef(null);

  // --- Handlers ---
  
  const handleUploadMode = () => {
    setUploadFile(null);
    setUploadText("");
    setShowUpload(true);
  };
  const handleSettingsMode = () => setShowSettings(true);

  const extractAllBullets = (prof) => {
    let bullets = [];
    (prof.experience || []).forEach(e => bullets.push(...(e.bullets || [])));
    (prof.projects || []).forEach(p => bullets.push(...(p.bullets || [])));
    return bullets;
  };

  const handleRunAI = async () => {
    const bullets = extractAllBullets(profile);
    if (bullets.length === 0) return alert("Your profile has no bullet points to optimize.");
    if (!jdText) return alert("Please paste a Job Description.");
    if (!llmConfig.api_key) return alert("Please configure API Key in settings.");

    setLoading(true);
    try {
      const analysis = await api.analyzeJD(jdText, bullets);
      const targetKeywords = analysis.coverage?.uncovered_keywords?.slice(0, 10) || [];
      const bulletsToOptimize = analysis.candidates?.map(c => c.bullet) || bullets.slice(0, 5);

      const { suggestions } = await api.generateSuggestions(bulletsToOptimize, targetKeywords, llmConfig);
      setSuggestions(suggestions.map(s => ({ ...s, status: 'pending' })));
    } catch (e) {
      alert("Error: " + e.message);
    }
    setLoading(false);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleExtract = async () => {
    if (!uploadFile && !uploadText.trim()) {
      return alert("Please upload a PDF or paste resume text.");
    }

    setLoading(true);
    try {
      let rawText = uploadText;
      
      // 1. If file, parse it first
      if (uploadFile) {
        setExtractionStep("Extracing text from PDF...");
        const parseRes = await api.parseResumeFile(uploadFile);
        rawText = parseRes.raw_text;
      }

      // 2. Condense/Parse via AI Agent
      setExtractionStep("AI Agent is condensing profile...");
      const condenseRes = await api.condenseProfile({
        pdf_text: rawText,
        current_profile: profile
      });

      if (condenseRes.profile) {
        setProfile({
          ...condenseRes.profile,
          section_order: profile.section_order // preserve section order
        });
        setExtractionStep("Success!");
        setShowUpload(false);
      }
    } catch (e) {
      alert("Extraction Error: " + e.message);
      setExtractionStep("");
    }
    setLoading(false);
  };

  const handleClearData = async () => {
    if (!confirm("Are you sure you want to PERMANENTLY delete all your resume data? This cannot be undone.")) return;
    setLoading(true);
    try {
      await api.deleteProfile(1);
      setProfile({
        name: "", email: "", phone: "", location: "",
        experience: [], projects: [], education: [], skills: {}, certifications: [],
        section_order: ["Work Experience", "Projects", "Education", "Skills", "Certifications"]
      });
      alert("Data cleared successfully!");
      setShowSettings(false);
    } catch (e) {
      alert("Clear Error: " + e.message);
    }
    setLoading(false);
  };

  const handleApplyAIOptimizations = () => {
    // Trivial application of accepted optimization back to profile state
    let newProfile = JSON.parse(JSON.stringify(profile));
    const acceptedMap = {};
    suggestions.forEach(s => {
      if (s.status === 'accepted' && s.original !== s.modified) {
        acceptedMap[s.original] = s.modified;
      }
    });

    (newProfile.experience || []).forEach(e => {
      e.bullets = (e.bullets || []).map(b => acceptedMap[b] || b);
    });
    (newProfile.projects || []).forEach(p => {
      p.bullets = (p.bullets || []).map(b => acceptedMap[b] || b);
    });

    setProfile(newProfile);
    setSuggestions([]);
    setActivePage('preview'); // jump to preview to see final
  };

  return (
    <>
      <Navbar activePage={activePage} setActivePage={setActivePage} onOpenSettings={handleSettingsMode} />
      
      {activePage === 'dashboard' && (
        <div className="dashboard-container">
          <Sidebar githubSyncData={githubSyncData} setGithubSyncData={setGithubSyncData} />
          <MasterProfile 
             profile={profile} 
             setProfile={setProfile} 
             editingSection={editingSection} 
             setEditingSection={setEditingSection} 
             onOpenUpload={handleUploadMode} 
          />
        </div>
      )}

      {activePage === 'preview' && (
        <ResumePreview 
          profile={profile} 
          onOpenUpload={handleUploadMode} 
          onEditTab={() => setActivePage('dashboard')} 
          onUpdateProfile={(newProfile) => setProfile(newProfile)}
        />
      )}

      {activePage === 'ai' && (
        <div className="dashboard-container">
          <div className="sidebar">
             <div className="section-card">
               <div className="card-title"><span className="mat-icon">work</span> 1. Job Description</div>
               <textarea rows="8" placeholder="Paste JD here..." value={jdText} onChange={e => setJdText(e.target.value)} style={{marginTop: '12px'}} />
             </div>
             
             <button className="btn btn-primary" style={{width: '100%', padding: '16px'}} onClick={handleRunAI} disabled={loading}>
                {loading ? "Generating Output..." : "⚡ Run AI Optimization"}
             </button>
          </div>
          
          <div className="main-column">
             {suggestions.length === 0 ? (
               <div className="section-card" style={{minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)'}}>
                 <span className="mat-icon" style={{fontSize: '64px', marginBottom: '16px'}}>auto_awesome</span>
                 <h3>AI Optimizer</h3>
                 <p style={{fontSize: '14px'}}>Paste a Job Description and click Run to see AI-tailored tweaks to your Master Profile.</p>
               </div>
             ) : (
               <div className="animate-in">
                 <div className="flex-between" style={{marginBottom: '20px'}}>
                   <h2 style={{margin: 0}}>Optimization Suggestions</h2>
                   <div className="flex-row gap-2">
                     <button className="btn" onClick={() => setSuggestions(suggestions.map(s => ({...s, status: 'accepted'})))}>
                       <span className="mat-icon" style={{color: '#22c55e'}}>check_circle</span> Accept All
                     </button>
                     <button className="btn" onClick={() => setSuggestions(suggestions.map(s => ({...s, status: 'rejected'})))}>
                       <span className="mat-icon" style={{color: '#ef4444'}}>cancel</span> Reject All
                     </button>
                     <button className="btn btn-primary" onClick={handleApplyAIOptimizations}>
                       Apply to Profile
                     </button>
                   </div>
                 </div>

                 {suggestions.map((s, i) => (
                   <div key={i} className="section-card" style={{
                     borderColor: s.status === 'accepted' ? '#22c55e' : s.status === 'rejected' ? '#ef4444' : 'var(--border)'
                   }}>
                     <div style={{fontSize: '12px', color: 'var(--muted-foreground)', marginBottom: '8px', fontWeight: 600}}>Original:</div>
                     <div style={{fontSize: '13px', marginBottom: '16px'}}>{s.original}</div>
                     
                     <div style={{fontSize: '12px', color: 'var(--muted-foreground)', marginBottom: '8px', fontWeight: 600}}>AI Suggestion:</div>
                     <DiffText original={s.original} suggested={s.modified} />

                     <div className="flex-row gap-2" style={{marginTop: '16px'}}>
                        <button className="btn btn-icon-only" style={{background: 'rgba(34,197,94,0.1)', color: '#16a34a', borderColor: 'transparent'}} onClick={() => {let arr=[...suggestions]; arr[i].status='accepted'; setSuggestions(arr)}}>
                          <span className="mat-icon">check</span>
                        </button>
                        <button className="btn btn-icon-only" style={{background: 'rgba(239,68,68,0.1)', color: '#dc2626', borderColor: 'transparent'}} onClick={() => {let arr=[...suggestions]; arr[i].status='rejected'; setSuggestions(arr)}}>
                          <span className="mat-icon">close</span>
                        </button>
                        {s.status !== 'pending' && <span style={{marginLeft: '12px', fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)'}}>{s.status.toUpperCase()}</span>}
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>
      )}

      {/* MODALS */}
      {showUpload && (
        <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setShowUpload(false) }}>
          <div className="modal-content animate-in">
            <h2><span className="mat-icon">upload_file</span> Upload Resume</h2>
            <p style={{fontSize: '14px', color: 'var(--muted-foreground)', marginBottom: '24px'}}>Upload a PDF or paste text to overwrite your Master Profile.</p>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{display: 'none'}} 
              accept=".pdf" 
              onChange={handleFileChange} 
            />
            
            <div 
              className="file-uploader flex-column gap-2" 
              style={{
                marginBottom: '16px', 
                cursor: 'pointer',
                borderColor: uploadFile ? 'var(--accent)' : 'var(--border)',
                background: uploadFile ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
              }}
              onClick={() => fileInputRef.current.click()}
            >
               <span className="mat-icon" style={{fontSize: '32px', color: 'var(--accent)'}}>{uploadFile ? 'task_alt' : 'cloud_upload'}</span>
               <div style={{fontSize: '14px', fontWeight: 600}}>
                 {uploadFile ? uploadFile.name : "Click to select PDF file"}
               </div>
               {uploadFile && <div style={{fontSize: '12px', color: 'var(--muted-foreground)'}} onClick={(e) => {e.stopPropagation(); setUploadFile(null)}}>Remove file</div>}
            </div>

            <textarea 
              rows="6" 
              placeholder="Or paste text here..." 
              style={{marginBottom: '24px'}} 
              value={uploadText}
              onChange={(e) => setUploadText(e.target.value)}
            />

            <div className="flex-between">
              <button className="btn" onClick={() => setShowUpload(false)}>Cancel</button>
              <div className="flex-column" style={{alignItems: 'flex-end', gap: '8px'}}>
                {loading && (
                    <div style={{fontSize: '12px', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'}}>
                        <span className="mat-icon spin-icon" style={{fontSize: '14px'}}>hourglass_empty</span>
                        {extractionStep}
                    </div>
                )}
                <button className="btn btn-primary" onClick={handleExtract} disabled={loading} style={{minWidth: '120px'}}>
                  {loading ? "Working..." : "Extract via AI"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setShowSettings(false) }}>
          <div className="modal-content animate-in">
            <h2><span className="mat-icon">settings</span> Configuration</h2>
            <div style={{marginTop: '24px'}}>
              <label className="form-label">Provider</label>
              <select value={llmConfig.provider} onChange={e => setLlmConfig({...llmConfig, provider: e.target.value})}>
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
              </select>
              
              <label className="form-label">API Key</label>
              <input type="password" placeholder="AIzaSy..." value={llmConfig.api_key} onChange={e => setLlmConfig({...llmConfig, api_key: e.target.value})} />
              <p style={{fontSize: '12px', color: 'var(--muted-foreground)'}}>Your key is stored securely in browser memory and never logged.</p>
            </div>
            
            <div style={{marginTop: '32px', padding: '20px', border: '1px solid #fee2e2', background: '#fef2f2', borderRadius: '12px'}}>
              <h4 style={{margin: 0, color: '#991b1b', fontSize: '14px'}}>Danger Zone</h4>
              <p style={{fontSize: '12px', color: '#b91c1c', margin: '4px 0 16px 0'}}>Permanently delete all your profile data from the server and browser.</p>
              <button 
                className="btn" 
                style={{borderColor: '#ef4444', color: '#ef4444', fontWeight: 600, width: '100%'}}
                onClick={handleClearData}
              >
                Clear All Data
              </button>
            </div>

            <div className="flex-between" style={{marginTop: '32px'}}>
              <button className="btn" onClick={() => setShowSettings(false)}>Close</button>
              <button className="btn btn-primary" onClick={() => setShowSettings(false)}>Save Settings</button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
