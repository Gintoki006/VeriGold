#!/usr/bin/env bash
# VeriGold — Local Development Starter (Bash)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=========================================="
echo "  VeriGold — Development Server Launcher  "
echo "=========================================="
echo "Starting Backend on http://localhost:8000"
echo "Starting Frontend on http://localhost:3000"

(cd "$REPO_ROOT/backend" && python3 -m uvicorn app.main:app --reload --port 8000) &
BACKEND_PID=$!

(cd "$REPO_ROOT/frontend" && npm run dev) &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID" SIGINT SIGTERM EXIT
wait
