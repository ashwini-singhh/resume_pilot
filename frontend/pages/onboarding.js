import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import * as api from '../lib/api';

const ROLE_MAP = {
  'Software Engineering': ['Backend Engineer', 'Frontend Engineer', 'Fullstack Engineer', 'DevOps Engineer', 'Mobile Engineer'],
  'Data Science & AI': ['Data Scientist', 'ML Engineer', 'Data Analyst', 'AI Researcher', 'Data Engineer'],
  'Product Management': ['Product Manager', 'Technical Product Manager', 'Product Analyst', 'Program Manager'],
  'Marketing & Sales': ['Growth Marketer', 'SEO Specialist', 'Account Executive', 'Content Strategist'],
  'Finance & Banking': ['Investment Banker', 'Financial Analyst', 'Quant Analyst', 'Risk Manager'],
  'Healthcare': ['Health Consultant', 'Medical Researcher', 'Hospital Admin', 'Clinical Data Analyst'],
  'Design & Creative': ['UI/UX Designer', 'Product Designer', 'Brand Designer', 'Illustrator'],
  'Education': ['Teacher', 'Instructional Designer', 'Education Consultant', 'Academic Researcher'],
  'Other': ['Specialist', 'Consultant', 'Manager', 'Analyst']
};

const STEPS = [
  {
    id: 'name',
    title: 'Name your Profile',
    subtitle: 'Give this persona a name (e.g. "Software Engineer" or "Staff PM")',
    type: 'input',
    placeholder: 'Profile Name...'
  },
  {
    id: 'experience',
    title: 'Experience Level',
    subtitle: 'Where are you in your career journey?',
    type: 'single',
    options: ['Student', 'Fresher', '1–3 years', '3–5 years', '5+ years'],
  },
  {
    id: 'industry',
    title: 'Industry / Field',
    subtitle: 'Which professional domain do you represent?',
    type: 'select',
    options: Object.keys(ROLE_MAP),
  },
  {
    id: 'roles',
    title: 'Target Roles',
    subtitle: 'What positions are you aiming for?',
    type: 'multi_custom',
  },
  {
    id: 'companies',
    title: 'Target Companies',
    subtitle: 'Which organizations are you aiming for?',
    type: 'multi_custom',
    options: ['Google', 'Meta', 'Amazon', 'Microsoft', 'Netflix', 'Tesla', 'Other'],
  },
  {
    id: 'goals',
    title: 'Career Goal',
    subtitle: 'What is your primary objective right now?',
    type: 'single',
    options: ['Get first job', 'Switch job', 'Get better salary', 'Target top companies'],
  },
  {
    id: 'upload',
    title: 'Final Step: Initialize Profile',
    subtitle: 'Upload a PDF or paste your resume text to build your dashboard.',
    type: 'combined_upload',
  }
];

const COMPANY_SUGGESTIONS = [
  'Google', 'Meta', 'Amazon', 'Microsoft', 'Netflix', 'Tesla', 'Apple', 'NVIDIA', 'Adobe', 'Uber', 'Airbnb', 'Salesforce',
  'HubSpot', 'Slack', 'Stripe', 'Twitter', 'Pinterest', 'Spotify', 'LinkedIn', 'Oracle', 'Intel', 'IBM', 'Cisco',
  'Goldman Sachs', 'Morgan Stanley', 'JP Morgan', 'McKinsey', 'BCG', 'Bain'
];

const STAGES = [
  "Analyzing your career context...",
  "Parsing resume structure...",
  "Optimizing with AI precision...",
  "Extracting measurable impact...",
  "Finalizing your own Dashboard..."
];

export default function Onboarding() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: 'General',
    experience: '',
    industry: 'Software Engineering',
    roles: [],
    companies: [],
    goals: '',
  });
  const [customInput, setCustomInput] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadText, setUploadText] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [setupStage, setSetupStage] = useState(0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!router.isReady) return; // Wait for the URL query to be ready

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/');
      } else {
        setUser(session.user);
        
        // Only skip to dashboard if it's NOT a request for a new profile
        const isNew = router.query.new === 'true';
        if (!isNew) {
           const profiles = await api.getProfiles(session.user.id);
           if (profiles.length > 0) {
              router.replace('/dashboard');
           }
        }
      }
    };
    checkUser();
  }, [router.isReady, router.query.new]);

  // Stage animation effect
  useEffect(() => {
    if (loading && !setupComplete) {
      const interval = setInterval(() => {
        setSetupStage((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev));
      }, 1600);
      return () => clearInterval(interval);
    }
  }, [loading, setupComplete]);

  const step = STEPS[currentStep];

  const handleOptionToggle = (option) => {
    if (step.type === 'single' || step.type === 'select') {
      setFormData({ ...formData, [step.id]: option });
    } else {
      const current = formData[step.id] || [];
      if (current.includes(option)) {
        setFormData({ ...formData, [step.id]: current.filter((o) => o !== option) });
      } else {
        setFormData({ ...formData, [step.id]: [...current, option] });
      }
    }
  };

  // customInput is now handled automatically during handleSubmit

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!uploadFile && !uploadText.trim()) {
      return alert("Please upload a PDF or paste text to initialize your profile.");
    }

    setLoading(true);
    try {
      // 1. Save Onboarding Context
      // Merge custom input if "Other" was selected in any multi_custom step
      const finalRoles = formData.roles.includes('Other') && customInput.trim()
        ? [...formData.roles.filter(r => r !== 'Other'), customInput.trim()]
        : formData.roles.filter(r => r !== 'Other');

      const finalCompanies = formData.companies.includes('Other') && customInput.trim()
        ? [...formData.companies.filter(c => c !== 'Other'), customInput.trim()]
        : formData.companies.filter(c => c !== 'Other');

      const contextPayload = {
        user_id: user.id,
        profile_name: formData.name,
        experience_level: formData.experience,
        target_roles: finalRoles,
        industries: [formData.industry],
        target_companies: finalCompanies,
        goals: formData.goals,
      };

      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');
      const contextRes = await fetch(`${apiBase}/api/user/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contextPayload),
      });
      if (!contextRes.ok) {
        const errText = await contextRes.text();
        console.error('Onboarding Context Error Response:', errText);
        throw new Error(`Profile initialization failed (${contextRes.status}): ${errText || 'Server Error'}`);
      }
      const contextData = await contextRes.json();
      const newContextId = contextData.context_id;

      // 2. Process Resume (Identical logic to dashboard.js)
      let rawText = uploadText;
      if (uploadFile) {
        setSetupStage(1); // parsing
        const parseRes = await api.parseResumeFile(uploadFile);
        rawText = parseRes.raw_text;
      }

      setSetupStage(2); // AI condensing
      await api.condenseProfile({
        pdf_text: rawText,
        user_id: user.id,
        context_id: newContextId
      });

      // 3. Finish
      setSetupComplete(true);
    } catch (err) {
      console.error('Setup failed detail:', err);
      alert(`Setup failed: ${err.message || "Unknown Error"}`);
      setLoading(false);
    }
  };

  const getOptionsForStep = () => {
    if (step.id === 'roles') {
      return ROLE_MAP[formData.industry] || ROLE_MAP['Other'];
    }
    return step.options;
  };

  const isStepValid = () => {
    if (step.type === 'combined_upload') return !!uploadFile || uploadText.trim().length > 10;
    const val = formData[step.id];
    if (step.type === 'input') return val?.trim().length > 2;
    if (step.type === 'single' || step.type === 'select') return val !== '';
    return val?.length > 0;
  };

  const renderCardContent = () => {
    if (setupComplete) {
      return (
        <div className="setup-success animate-in">
          <div className="success-icon">
            <span className="mat-icon">task_alt</span>
          </div>
          <h2>Profile Ready!</h2>
          <p>Your Harvard-optimized dashboard has been prepared based on your context and resume.</p>
          <button className="btn btn-primary" style={{ marginTop: '32px', height: '56px', width: '100%' }} onClick={() => window.location.href = '/dashboard'}>
            Go to Dashboard <span className="mat-icon" style={{ fontSize: '18px', marginLeft: '6px' }}>chevron_right</span>
          </button>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="setup-processing animate-in">
          <div className="setup-loader">
            <div className="loader-inner"></div>
            <span className="mat-icon spin-icon">sync</span>
          </div>
          <h2 className="setup-stage-text">{STAGES[setupStage]}</h2>
          <div className="setup-progress-track">
            <div className="setup-progress-fill" style={{ width: `${((setupStage + 1) / STAGES.length) * 100}%` }}></div>
          </div>
          <p className="setup-subtext">This may take a few minutes, please stay patient...</p>
        </div>
      );
    }

    return (
      <div className="onboarding-flow-container">
        <div className="onboarding-header">
          <span className="step-count">Step {currentStep + 1} of {STEPS.length}</span>
          <h1>{step.title}</h1>
          <p>{step.subtitle}</p>
        </div>

        <div className="onboarding-body">
          {step.type === 'select' ? (
            <select
              value={formData[step.id]}
              onChange={(e) => handleOptionToggle(e.target.value)}
              className="onboarding-select"
            >
              {step.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : step.type === 'combined_upload' ? (
            <div className="unified-uploader">
              <div
                className={`onboarding-upload-zone ${uploadFile ? 'selected' : ''}`}
                onClick={() => fileInputRef.current.click()}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" style={{ display: 'none' }} />
                <span className="mat-icon">{uploadFile ? 'description' : 'upload'}</span>
                <span>{uploadFile ? uploadFile.name : 'Upload PDF'}</span>
              </div>
              <div className="divider-text">OR</div>
              <textarea
                rows="6"
                placeholder="Paste your resume text here..."
                className="onboarding-textarea"
                value={uploadText}
                onChange={(e) => setUploadText(e.target.value)}
              />
            </div>
          ) : (
            <div className="options-grid">
              {step.type === 'input' ? (
                <div className="custom-input-wrapper" style={{ width: '100%' }}>
                  <input
                    type="text"
                    placeholder={step.placeholder}
                    value={formData[step.id]}
                    onChange={(e) => setFormData({ ...formData, [step.id]: e.target.value })}
                    className="onboarding-input"
                    autoFocus
                  />
                </div>
              ) : getOptionsForStep().map((option) => {
                const isSelected = step.type === 'single'
                  ? formData[step.id] === option
                  : formData[step.id]?.includes(option);

                return (
                  <div
                    key={option}
                    className={`option-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleOptionToggle(option)}
                  >
                    <div className="option-check">
                      {isSelected && <span className="mat-icon">check</span>}
                    </div>
                    <span className="option-text">{option}</span>
                  </div>
                );
              })}
              {step.type === 'multi_custom' && formData[step.id]?.includes('Other') && (
                <div className="custom-input-wrapper animate-in">
                  <input
                    type="text"
                    placeholder={`Type your ${step.id === 'roles' ? 'role' : 'company'}...`}
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    list={step.id === 'companies' ? 'company-suggestions' : undefined}
                    className="onboarding-input"
                    autoFocus
                  />
                  {step.id === 'companies' && (
                    <datalist id="company-suggestions">
                      {COMPANY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
                    </datalist>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="onboarding-footer">
          <button className="btn" onClick={() => (currentStep > 0 ? setCurrentStep(currentStep - 1) : null)} disabled={currentStep === 0}>Back</button>
          <button className="btn btn-primary" onClick={() => (currentStep < STEPS.length - 1 ? setCurrentStep(currentStep + 1) : handleSubmit())} disabled={!isStepValid()}>
            {currentStep === STEPS.length - 1 ? 'Complete Setup' : 'Next Step'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="onboarding-page">
      <Head>
        <title>Setup | ResumePilot</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="onboarding-container">
        {!loading && !setupComplete && (
          <div className="onboarding-progress-wrapper">
            <div className="onboarding-progress-track">
              <div className="onboarding-progress-fill" style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} />
            </div>
          </div>
        )}
        <div className={`onboarding-card ${loading ? 'onboarding-loading' : ''}`}>
          {renderCardContent()}
        </div>
      </div>
    </div>
  );
}
