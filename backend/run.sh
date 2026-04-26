#!/bin/bash
# Local development runner for the backend
echo "🚀 Starting Resume Auditor Backend..."
uvicorn main:app --reload --port 8000
