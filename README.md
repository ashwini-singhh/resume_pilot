# ResumePilot SaaS Pipeline 🚀

A production-grade, full-stack SaaS application for AI-powered resume optimization. This project represents a migration from a monolithic Streamlit app to a modern, decoupled architecture.

---

## 🏗️ System Architecture

The application is split into a clean frontend-backend architecture for scalability and performance.

### 1. Frontend (`/frontend`) - Next.js (React)
- **Interactive UI**: A premium, dark-mode dashboard built with modern React.
- **Word-Level Diff**: Visualizes AI suggestions with green (additions) and red (deletions).
- **State Management**: Handles granular "Accept/Reject/Accept All" logic for AI suggestions.
- **Styling**: Pure CSS Modules for a high-performance, custom-branded experience.

### 2. Backend (`/backend`) - FastAPI (Python)
- **Stateless API**: Pure REST endpoints for resume parsing, JD analysis, and LLM optimization.
- **Core Logic**: Decoupled Python modules for heavy-lifting text analysis.
- **Generic LLM Client**: Supports Google Gemini, OpenAI, and other providers via unified prompts.

### 3. Database (`/supabase`) - Supabase (PostgreSQL)
- **Schema**: Relational design for Users, Resumes, Job Descriptions, and Optimization Suggestions.
- **RLS**: Row-Level Security for multi-tenant data protection.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js, React, Lucide Icons, Diff-js.
- **Backend**: FastAPI, Pydantic, PyMuPDF, Python-dotenv.
- **AI/LLM**: Google Gemini (Standard), OpenAI (Configurable).
- **Database**: Supabase / PostgreSQL.

---

## 🚀 Getting Started

Follow these steps to set up the project locally.

### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```
*The API will be available at `http://localhost:8000`. Swagger docs at `/docs`.*

### 2. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start the Next.js dev server
npm run dev
```
*The UI will be available at `http://localhost:3000`.*

### 3. Database Setup

1. Create a new project on [Supabase.com](https://supabase.com).
2. Open the **SQL Editor** in the Supabase dashboard.
3. Copy the contents of `supabase/schema.sql` and run them to initialize your tables and security policies.
4. **Auth Setup**: Follow the detailed [Supabase & Google Auth Guide](SUPABASE_AUTH_SETUP.md) to enable social logins.

---

## 🔄 User Workflow

1. **Config**: Enter your Gemini or OpenAI API Key in the dashboard.
2. **Parse**: Upload a PDF or paste resume text. The backend parses it into structured sections.
3. **Analyze**: Paste a Job Description. The backend extracts keywords and identifies "optimization candidates."
4. **Optimize**: Click "Run AI Optimization." The system generates word-level suggestions to bridge the keyword gap.
5. **Refine**: Review each suggestion. **Accept** to keep changes or **Reject** to revert to original text.
6. **Apply**: Rebuild your optimized resume with all accepted changes.

---

Developed as a senior-architected SaaS migration project.