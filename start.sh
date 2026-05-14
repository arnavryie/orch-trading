#!/bin/bash
echo "Starting orch-trading..."

# Start backend
cd "$(dirname "$0")"
source .venv/bin/activate 2>/dev/null || python -m venv .venv && source .venv/bin/activate
pip install -q -e . 2>/dev/null
uvicorn web.api:app --host 127.0.0.1 --port 8765 --reload &
BACKEND_PID=$!
echo "Backend started (PID $BACKEND_PID)"

# Start frontend
cd frontend
npm run dev &
FRONTEND_PID=$!
echo "Frontend started (PID $FRONTEND_PID)"

echo ""
echo "✅ orch-trading running!"
echo "   Backend:  http://localhost:8765"
echo "   Frontend: http://localhost:3000 (or 5173)"
echo ""
echo "Press Ctrl+C to stop"
wait
