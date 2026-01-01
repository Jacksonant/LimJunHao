#!/bin/bash

# Start Python backend
cd backend
source venv/bin/activate 2>/dev/null || true
uvicorn main:app --reload &
BACKEND_PID=$!

# Start Next.js
cd ..
npm run dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
