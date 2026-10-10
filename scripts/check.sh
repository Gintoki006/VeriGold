#!/usr/bin/env bash
# VeriGold — Codebase & Environment Health Auditor (Bash)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=========================================="
echo "  VeriGold — Health & Pre-flight Checker  "
echo "=========================================="

# 1. Environment configuration
echo -e "\n[1/4] Checking environment files..."
[ -f "$REPO_ROOT/backend/.env" ] && echo "  OK: backend/.env exists." || echo "  WARN: backend/.env missing."
[ -f "$REPO_ROOT/frontend/.env.local" ] && echo "  OK: frontend/.env.local exists." || echo "  WARN: frontend/.env.local missing."

# 2. Python syntax compilation
echo -e "\n[2/4] Verifying Python bytecode compilation..."
cd "$REPO_ROOT/backend"
python3 -m compileall app risk_engine -q && echo "  OK: Python syntax compiled without errors."

# 3. Frontend linting
echo -e "\n[3/4] Running ESLint check..."
cd "$REPO_ROOT/frontend"
npm run lint && echo "  OK: ESLint passed with 0 errors."

# 4. Docker Compose config validation
echo -e "\n[4/4] Validating Docker Compose configuration..."
cd "$REPO_ROOT"
if command -v docker >/dev/null 2>&1; then
    docker compose config -q && echo "  OK: docker-compose.yml configuration is valid." || true
fi

echo -e "\nAudit complete!"
