# ResumePilot (ResumeDad) SaaS Platform 🚀

A production-grade, full-stack AI SaaS platform for resume optimization, grading, and career persona management. This application is architected for scale, high-performance AI inference, and automated CI/CD.

---

## 🏗️ System Architecture

The project follows a modern, decoupled cloud architecture:

### 1. Frontend (`/frontend`) - Next.js (Vercel)
- **Framework**: Next.js 14+ (App Router ready).
- **Deployment**: Automated via Vercel with high-performance edge caching.
- **Features**: 
  - Premium Dark-Mode Dashboard.
  - Real-time Word-Level Diff Visualization.
  - Granular "Accept/Reject/Accept All" suggestion state management.
- **Environment**: `NEXT_PUBLIC_API_URL` points to the Cloud Run backend.

### 2. Backend (`/backend`) - FastAPI (Google Cloud Run)
- **Infrastructure**: Containerized Python 3.11 serverless deployment.
- **CI/CD**: Automated GitHub Actions workflow (`deploy-backend.yml`).
- **Capabilities**: 
  - High-concurrency PDF parsing via PyMuPDF.
  - Complex JD keyword extraction and matching algorithms.
  - Context-aware LLM optimization loops.

### 3. Database & Auth - Supabase (PostgreSQL)
- **Data Layer**: Production-grade PostgreSQL hosting User Profiles, Resumes, and Scoring History.
- **Security**: Row-Level Security (RLS) ensures multi-tenant data privacy.
- **Persistence**: Hybrid connection support for both Supabase (Cloud) and SQLite (Local Dev).

### 4. AI Engine - OpenRouter
- **Model**: Defaulting to `google/gemini-2.0-flash-001` for high-speed, cost-effective reasoning.
- **Flexibility**: Dynamically switchable via `MODEL_NAME` environment variable.
- **Optimization**: Custom OpenRouter headers in `LLMClient` ensure high-priority routing.

---

## 🛠️ Production Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | Next.js, React, Framer Motion, Lucide-React |
| **Backend** | FastAPI, SQLModel, Pydantic, uvicorn |
| **Database** | Supabase (PostgreSQL) |
| **AI API** | OpenRouter (Optimized for Gemini & Claude) |
| **Cloud Hosting** | Google Cloud Run (Backend), Vercel (Frontend) |
| **CI/CD** | GitHub Actions |

---

## 🚀 Environment Configuration

To run this in production, ensure the following keys are set:

### Backend (GitHub Secrets / Cloud Run)
- `DATABASE_URL`: Your Supabase connection string.
- `OPENROUTER_API_KEY`: Your OpenRouter provider key.
- `OPENROUTER_BASE_URL`: `https://openrouter.ai/api/v1`
- `MODEL_NAME`: `google/gemini-2.0-flash-001` (Recommended)

### Frontend (Vercel Dashboard)
- `NEXT_PUBLIC_API_URL`: Your Cloud Run service URL.
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase public key.

---

## 🔄 Automated Deployment Workflow

1. **Code Push**: Push changes to the `main` branch.
2. **Backend Build**: GitHub Action builds the Docker container and pushes to Google Artifact Registry.
3. **Cloud Run Deploy**: Automatically creates a new revision on Google Cloud Run.
4. **Vercel Deploy**: Vercel detects the push, builds the Next.js bundle, and flips the production alias.

---

## 👨‍💻 Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```