import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import MasterProfile from '../components/MasterProfile';
import ResumePreview from '../components/ResumePreview';
import UpgradeModal from '../components/UpgradeModal';
import JDPipeline from '../components/JDPipeline';
import GithubFlow from '../components/GithubFlow';
import InterviewPanel from '../components/InterviewPanel';
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
  achievements: [],
  section_order: ["Work Experience", "Projects", "Education", "Skills", "Achievements"],
  preview_section_order: ["Work Experience", "Projects", "Education", "Skills", "Achievements"]
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
  const [showInterview, setShowInterview] = useState(false);

  const [userStatus, setUserStatus] = useState({ subscription_status: 'free', free_runs_remaining: 5 });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    const handleShowUpgrade = () => setShowUpgradeModal(true);
    window.addEventListener('show-upgrade-modal', handleShowUpgrade);
    return () => window.removeEventListener('show-upgrade-modal', handleShowUpgrade);
  }, []);

  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        try {
          // Fetch user payment limits
          try {
            const status = await api.getUserStatus(session.user.id);
            setUserStatus(status);
          } catch(e) { console.warn("Failed to fetch user payment status", e) }

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

  const [loading, setLoading] = useState(false);

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

  async function handleDeleteProfile(contextId) {
    if (!window.confirm("Are you sure you want to delete this persona? This will permanently remove its resume data.")) return;
    try {
      await api.deleteProfile(user.id, contextId);
      const updated = profiles.filter(p => p.id !== contextId);
      setProfiles(updated);
      if (activeContextId === contextId) {
        if (updated.length > 0) {
          handleSwitchProfile(updated[0].id);
        } else {
          router.replace('/onboarding');
        }
      }
    } catch (e) {
      alert("Failed to delete profile: " + e.message);
    }
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
      setExtractionStep("Working...");
      const resultProfile = await api.executeExtractionPipeline(user.id, activeContextId, uploadFile, uploadText, profile);

      if (resultProfile) {
        const updatedProfile = {
          ...resultProfile,
          section_order: profile.section_order // preserve section order
        };
        setProfile(updatedProfile);

        // Usage is now updated in DB, refresh status locally.
        const status = await api.getUserStatus(user.id);
        setUserStatus(status);

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



  return (
    <>
      <Navbar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        onOpenSettings={handleSettingsMode} 
        userStatus={userStatus}
        onUpgrade={() => setShowUpgradeModal(true)}
      />
      
      {profileLoading ? (
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="mat-icon spin-icon" style={{ fontSize: '48px', color: 'var(--accent)' }}>sync</span>
        </div>
      ) : activePage === 'dashboard' && (
        <div className="dashboard-container">
          <Sidebar 
            userId={user?.id}
            githubSyncData={githubSyncData} 
            setGithubSyncData={setGithubSyncData}
            profiles={profiles}
            activeContextId={activeContextId}
            onSwitchProfile={handleSwitchProfile}
            onNewProfile={handleNewProfile}
            onDeleteProfile={handleDeleteProfile}
            setActivePage={setActivePage}
            profile={profile}
            setProfile={setProfile}
            onOpenInterview={() => setShowInterview(true)}
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

      {activePage === 'github' && (
        <div style={{ padding: '40px', minHeight: '80vh' }}>
          <GithubFlow 
            userId={user?.id} 
            contextId={activeContextId} 
            onComplete={(newProfile) => {
              setProfile(newProfile);
              setActivePage('dashboard');
              // Trigger diagnostic refresh since data changed
              api.runGlobalDiagnostic({ userId: user.id, contextId: activeContextId });
            }} 
          />
        </div>
      )}

      {activePage === 'jd' && (
        <div style={{ padding: '32px 40px', minHeight: '80vh' }}>
          <JDPipeline userId={user?.id} contextId={activeContextId} profile={profile} />
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
                  style={{borderColor: '#ef4444', color: '#ef4444', fontWeight: 600, width: '100%', background: 'transparent'}}
                  onClick={handleClearData}
                >
                  Clear All Data
                </button>
              </div>
            </div>

            <div className="flex-between" style={{marginTop: '32px'}}>
              <button className="btn" style={{width: '100%'}} onClick={() => setShowSettings(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showUpgradeModal && (
        <UpgradeModal 
          user={user} 
          onClose={() => setShowUpgradeModal(false)}
          onSuccess={async () => {
             setShowUpgradeModal(false);
             const status = await api.getUserStatus(user.id);
             setUserStatus(status);
          }}
        />
      )}

      {showInterview && (
        <InterviewPanel 
          userId={user?.id}
          contextId={activeContextId}
          profile={profile}
          onClose={() => setShowInterview(false)}
          onMergeSuccess={(newProf) => {
            setProfile(newProf);
          }}
        />
      )}

    </>
  );
}
