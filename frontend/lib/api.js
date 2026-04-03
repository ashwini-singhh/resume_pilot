const API_BASE = 'http://127.0.0.1:8000/api';

export async function parseResume(text) {
  const formData = new FormData();
  formData.append('text', text);

  const res = await fetch(`${API_BASE}/parse-resume`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function parseResumeFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/parse-resume`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function analyzeJD(jobDescription, resumeBullets) {
  const res = await fetch(`${API_BASE}/analyze-jd`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_description: jobDescription, resume_bullets: resumeBullets }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function generateSuggestions(bullets, targetKeywords, llmConfig) {
  const res = await fetch(`${API_BASE}/generate-suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bullets,
      target_keywords: targetKeywords,
      ...llmConfig,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function applyChanges(suggestions, sections) {
  const res = await fetch(`${API_BASE}/apply-changes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suggestions, sections }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
export async function condenseProfile(data) {
  const res = await fetch(`${API_BASE}/condense`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getProfile(userId) {
  const res = await fetch(`${API_BASE}/profile/${userId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteProfile(userId = 1) {
  const res = await fetch(`${API_BASE}/profile/${userId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function saveProfile(profile, userId = 1) {
  const res = await fetch(`${API_BASE}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, user_id: userId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── On-Demand Bullet Improvement ─────────────────────────────────────

export async function generateImprovementQuestions({ run_id, section, bullet_text }) {
  const res = await fetch(`${API_BASE}/improve/generate-questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run_id, section, bullet_text }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { questions: [...] }
}

export async function submitImprovementAnswers({ run_id, questions, answers, original_bullet }) {
  const res = await fetch(`${API_BASE}/improve/submit-answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run_id, questions, answers, original_bullet }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function generateImprovedBullet({ original_bullet, questions, answers, run_id, section }) {
  const res = await fetch(`${API_BASE}/improve/generate-improvement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ original_bullet, questions, answers, run_id, section }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { original_bullet, improved_bullet, diff, suggestion_id, changed }
}

export async function acceptImprovement(suggestion_id) {
  const res = await fetch(`${API_BASE}/improve/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suggestion_id }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function rejectImprovement(suggestion_id) {
  const res = await fetch(`${API_BASE}/improve/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suggestion_id }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Entry-Level Impact Scoring ─────────────────────────────────────────────

export async function scoreEntries({ experience, projects }) {
  const res = await fetch(`${API_BASE}/score-entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ experience, projects }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { experience: [...], projects: [...] }
}

export async function generateEntryQuestions({ section, entry, entry_id }) {
  const res = await fetch(`${API_BASE}/entry/generate-questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section, entry, entry_id }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { entry_id, questions: [...] }
}

export async function improveEntry({ section, entry, entry_id, questions, answers }) {
  const res = await fetch(`${API_BASE}/entry/improve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section, entry, entry_id, questions, answers }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { entry_id, original_entry, improved_entry, bullet_diffs, changed }
}
