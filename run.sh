#!/bin/bash
# Root runner to start both Backend and Frontend concurrently

echo "🚀 Starting Resume Auditor Full-Stack..."

# Start Backend
echo "📡 Starting Backend on http://localhost:8000..."
(cd backend && ./run.sh) &
BACKEND_PID=$!

# Wait a moment for backend to initialize
sleep 2

# Start Frontend
echo "💻 Starting Frontend on http://localhost:3000..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

# Handle cleanup on interrupt
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit
}

trap cleanup SIGINT SIGTERM

# Keep script running
wait
