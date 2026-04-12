const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '') + '/api';

/**
 * Standardized fetch helper to handle AppResponse structure
 */
async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);

  if (res.status === 402) {
    // Dispatch global event so the UI can pop up the Upgrade modal
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('show-upgrade-modal'));
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Payment Required');
  }

  const json = await res.json();
  
  // Handle AppResponse structure
  if (json && typeof json.success !== 'undefined') {
    if (!json.success) {
      const errorMsg = json.error || 'An unknown error occurred';
      throw new Error(errorMsg);
    }
    return json.data;
  }
  
  // Fallback for legacy endpoints or direct FastAPI errors
  if (!res.ok) {
    throw new Error(json?.detail || `Request failed with status ${res.status}`);
  }
  return json;
}

export async function parseResume(text) {
  const formData = new FormData();
  formData.append('text', text);
  return request('/parse-resume', {
    method: 'POST',
    body: formData,
  });
}

export async function parseResumeFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/parse-resume', {
    method: 'POST',
    body: formData,
  });
}


export async function generateSuggestions(bullets, targetKeywords, llmConfig) {
  return request('/generate-suggestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bullets,
      target_keywords: targetKeywords,
      ...llmConfig,
    }),
  });
}

export async function applyChanges(suggestions, sections) {
  return request('/apply-changes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suggestions, sections }),
  });
}
export async function condenseProfile(data) {
  return request('/condense', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function getProfile(userId, contextId) {
  if (!userId || !contextId) throw new Error("userId and contextId are required for getProfile");
  return request(`/profile/${userId}/${contextId}`);
}

export async function getProfiles(userId) {
  if (!userId) throw new Error("userId is required for getProfiles");
  const data = await request(`/user/${userId}/onboarding-status`);
  return data.profiles || [];
}

export async function getOnboardingStatus(userId) {
  if (!userId) throw new Error("userId is required for getOnboardingStatus");
  return request(`/user/${userId}/onboarding-status?t=${Date.now()}`);
}

export async function deleteProfile(userId, contextId) {
  if (!userId || !contextId) throw new Error("userId and contextId are required for deleteProfile");
  return request(`/profile/${userId}/${contextId}`, {
    method: 'DELETE',
  });
}

export async function deleteUser(userId) {
  if (!userId) throw new Error("userId is required for deleteUser");
  return request(`/user/${userId}`, {
    method: 'DELETE',
  });
}

export async function saveProfile(profile, userId, contextId) {
  if (!userId || !contextId) throw new Error("userId and contextId are required for saveProfile");
  return request('/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, user_id: userId, context_id: contextId }),
  });
}

export async function submitOnboarding(payload) {
  return request('/user/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ── On-Demand Bullet Improvement ─────────────────────────────────────

export async function generateImprovementQuestions({ run_id, section, bullet_text }) {
  return request('/improve/generate-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run_id, section, bullet_text }),
  });
}

export async function submitImprovementAnswers({ run_id, questions, answers, original_bullet }) {
  return request('/improve/submit-answers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run_id, questions, answers, original_bullet }),
  });
}

export async function generateImprovedBullet({ original_bullet, questions, answers, run_id, section }) {
  return request('/improve/generate-improvement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ original_bullet, questions, answers, run_id, section }),
  });
}

export async function acceptImprovement(suggestion_id) {
  return request('/improve/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suggestion_id }),
  });
}

export async function rejectImprovement(suggestion_id) {
  return request('/improve/reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suggestion_id }),
  });
}

// ── Entry-Level Impact Scoring ─────────────────────────────────────────────

export async function scoreEntries({ experience, projects }) {
  return request('/score-entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ experience, projects }),
  });
}

export async function runGlobalDiagnostic({ userId, contextId }) {
  return request('/profile/diagnostic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, context_id: contextId }),
  });
}

export async function generateSectionContent({ userId, contextId, section }) {
  return request('/profile/generate-section', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, context_id: contextId, section }),
  });
}

export async function evaluateEntry({ user_id, context_id, entry_id, section }) {
  return request('/entry/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id, context_id, entry_id, section }),
  });
}

export async function entryInterviewTurn({ section, entry, entry_id, chat_history, user_context, pre_identified_questions = [] }) {
  return request('/entry/interview-turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section, entry, entry_id, chat_history, user_context, pre_identified_questions }),
  });
}

export async function improveEntry({ section, entry, entry_id, chat_history, user_context }) {
  return request('/entry/improve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section, entry, entry_id, chat_history, user_context }),
  });
}


/**
 * Shared logic for Onboarding & Dashboard Upload
 * Handles: PDF Parse -> AI Condensation -> Returns new Profile JSON
 */
export async function executeExtractionPipeline(userId, contextId, file, text, currentProfile = null) {
  // 1. PDF Parsing if file provided
  let rawText = text;
  if (file) {
    const parseRes = await parseResumeFile(file);
    rawText = parseRes.raw_text;
  }

  // 2. AI Condensation (Updates DB on backend automatically)
  const result = await condenseProfile({
    pdf_text: rawText,
    user_id: userId,
    context_id: contextId,
    current_profile: currentProfile
  });

  return result.profile;
}


// ── JD Matching Pipeline ────────────────────────────────────────────────────

export async function analyzeJD({ jd_text, jd_title, jd_company, user_id, context_id }) {
  return request('/jd/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jd_text, jd_title, jd_company, user_id, context_id }),
  });
}

export async function optimizeEntries({ jd_id, selected_entry_ids, user_id, context_id }) {
  return request('/jd/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jd_id, selected_entry_ids, user_id, context_id }),
  });
}

export async function analyzeGaps({ jd_id, user_id, context_id }) {
  return request('/jd/gaps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jd_id, user_id, context_id }),
  });
}

export async function acceptJDSuggestion({ suggestion_id, user_id }) {
  return request('/jd/accept-suggestion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suggestion_id, user_id }),
  });
}

export async function rejectJDSuggestion({ suggestion_id, user_id }) {
  return request('/jd/reject-suggestion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suggestion_id, user_id }),
  });
}

export async function getJDResults(jd_id, user_id) {
  const params = new URLSearchParams({ user_id });
  return request(`/jd/results/${jd_id}?${params}`);
}

// ── Payment & Subscription ──────────────────────────────────────────────────

export async function createCheckoutSession(userId, amount) {
  return request('/payment/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, amount }),
  });
}

export async function getUserStatus(userId) {
  return request(`/user/status/${userId}`, { method: 'GET' });
}

