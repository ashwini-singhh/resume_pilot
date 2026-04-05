import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import MasterProfile from '../components/MasterProfile';
import ResumePreview from '../components/ResumePreview';
import DiffText from '../components/DiffText';
import * as api from '../lib/api';
import { supabase } from '../lib/supabaseClient';

const DEFAULT_PROFILE = {
  name: "",
  email: "",
  phone: "",
  location: "",
  experience: [],
  projects: [],
  education: [],
  skills: {
    "Languages": [],
    "Frameworks": [],
    "Tools": [],
    "Others": []
  },
  certifications: [],
  section_order: ["Work Experience", "Projects", "Education", "Skills", "Certifications"]
};

export default function AppIndex() {
  const router = useRouter();
  const [activePage, setActivePage] = useState('dashboard');
  const [user, setUser] = useState(null);
  
  // Profile & Persona state
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editingSection, setEditingSection] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [activeContextId, setActiveContextId] = useState(null);
  const [githubSyncData, setGithubSyncData] = useState({ fetchedData: null, projects: [], newSkills: [] });

  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        try {
          // 1. Fetch available personas
          const profileList = await api.getProfiles(session.user.id);
          setProfiles(profileList);

          if (profileList.length > 0) {
            // 2. Determine which one is active
            const lastActiveId = localStorage.getItem(`active_profile_${session.user.id}`);
            const selected = profileList.find(p => p.id == lastActiveId) || profileList[0];
            setActiveContextId(selected.id);
            
            // 3. Load the specific resume data for this active persona
            const { profile: dbProfile } = await api.getProfile(session.user.id, selected.id);
            if (dbProfile && Object.keys(dbProfile).length > 0) {
              setProfile(dbProfile);
            } else {
              setProfile({ 
                ...DEFAULT_PROFILE, 
                name: session.user.user_metadata?.full_name || "New User", 
                email: session.user.email 
              });
            }
          } else {
            // No profiles? Go back to onboarding
            router.replace('/onboarding');
          }
        } catch (e) {
          console.error("Error fetching profiles:", e);
        }
      }
      setProfileLoading(false);
    };
    initSession();
  }, [router.pathname]);

  // AI Optimize States
  const [jdText, setJdText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [llmConfig, setLlmConfig] = useState({
    provider: "gemini",
    api_key: "",
    model: "gemini-2.0-flash"
  });

  // Modals
  const [showUpload, setShowUpload] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadText, setUploadText] = useState("");
  const [extractionStep, setExtractionStep] = useState("");
  const fileInputRef = React.useRef(null);

  // --- Profile Handlers ---
  
  async function handleSwitchProfile(id) {
    if (id === activeContextId) return;
    setProfileLoading(true);
    setActiveContextId(id);
    localStorage.setItem(`active_profile_${user.id}`, id);
    try {
      const { profile: dbProfile } = await api.getProfile(user.id, id);
      setProfile(dbProfile && Object.keys(dbProfile).length > 0 ? dbProfile : DEFAULT_PROFILE);
    } catch (e) {
      console.error("Switch profile error:", e);
    }
    setProfileLoading(false);
  }

  function handleNewProfile() {
    router.push('/onboarding?new=true');
  }

  function handleUploadMode() {
    setUploadFile(null);
    setUploadText("");
    setShowUpload(true);
  }

  function handleSettingsMode() {
    setShowSettings(true);
  }

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
        user_id: user.id,
        context_id: activeContextId,
        current_profile: profile
      });

      if (condenseRes.profile) {
        const updatedProfile = {
          ...condenseRes.profile,
          section_order: profile.section_order // preserve section order
        };
        setProfile(updatedProfile);
        // Save to DB
        if (user && activeContextId) {
          await api.saveProfile(updatedProfile, user.id, activeContextId);
        }
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
      if (user && activeContextId) {
        await api.deleteProfile(user.id, activeContextId);
      }
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

  const handleDeleteAccount = async () => {
    const confirmation = prompt("To permanently delete your account and ALL associated data, please type 'DELETE' below:");
    if (confirmation !== 'DELETE') return;

    setLoading(true);
    try {
      if (user) {
        await api.deleteUser(user.id);
        await supabase.auth.signOut();
        router.replace('/');
      }
    } catch (e) {
      alert("Deletion Error: " + e.message);
      setLoading(false);
    }
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
    if (user && activeContextId) {
      api.saveProfile(newProfile, user.id, activeContextId);
    }
    setSuggestions([]);
    setActivePage('preview'); // jump to preview to see final
  };

  return (
    <>
      <Navbar activePage={activePage} setActivePage={setActivePage} onOpenSettings={handleSettingsMode} />
      
      {profileLoading ? (
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="mat-icon spin-icon" style={{ fontSize: '48px', color: 'var(--accent)' }}>sync</span>
        </div>
      ) : activePage === 'dashboard' && (
        <div className="dashboard-container">
          <Sidebar 
            githubSyncData={githubSyncData} 
            setGithubSyncData={setGithubSyncData}
            profiles={profiles}
            activeContextId={activeContextId}
            onSwitchProfile={handleSwitchProfile}
            onNewProfile={handleNewProfile}
          />
          <MasterProfile 
             profile={profile} 
             userId={user?.id}
             contextId={activeContextId}
             setProfile={(newProf, shouldSave = true) => {
               setProfile(newProf);
               if (shouldSave && user && activeContextId) {
                 api.saveProfile(newProf, user.id, activeContextId);
               }
             }} 
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
            <h2><span className="mat-icon">settings</span> Account Settings</h2>
            
            <div style={{marginTop: '32px', padding: '20px', border: '1px solid #fee2e2', background: '#fef2f2', borderRadius: '12px'}}>
              <h4 style={{margin: 0, color: '#991b1b', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span className="mat-icon" style={{fontSize: '18px'}}>warning</span> Danger Zone
              </h4>
              <p style={{fontSize: '12px', color: '#b91c1c', margin: '4px 0 16px 0', opacity: 0.8}}>Permanently delete all your profile data from the server and browser.</p>
              <div className="flex-column gap-2">
                <button 
                  className="btn" 
                  style={{borderColor: '#ef4444', color: '#ef4444', fontWeight: 600, width: '100%', marginBottom: '8px', background: 'transparent'}}
                  onClick={handleClearData}
                >
                  Clear All Data
                </button>
                <button 
                  className="btn" 
                  style={{background: '#ef4444', color: 'white', border: 'none', fontWeight: 600, width: '100%'}}
                  onClick={handleDeleteAccount}
                >
                  Delete Account
                </button>
              </div>
            </div>

            <div className="flex-between" style={{marginTop: '32px'}}>
              <button className="btn" style={{width: '100%'}} onClick={() => setShowSettings(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
