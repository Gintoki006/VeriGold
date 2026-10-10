#!/usr/bin/env bash
# VeriGold — Automated Environment Setup Script (Bash/Linux/macOS)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=========================================="
echo "  VeriGold — Local Setup & Initialization "
echo "=========================================="
echo "Repository root: $REPO_ROOT"

# 1. Environment files configuration
echo -e "\n[1/4] Checking environment files..."
if [ ! -f "$REPO_ROOT/backend/.env" ]; then
    if [ -f "$REPO_ROOT/backend/.env.example" ]; then
        cp "$REPO_ROOT/backend/.env.example" "$REPO_ROOT/backend/.env"
        echo "  -> Created backend/.env from backend/.env.example"
    fi
else
    echo "  -> backend/.env exists."
fi

if [ ! -f "$REPO_ROOT/frontend/.env.local" ]; then
    if [ -f "$REPO_ROOT/frontend/.env.example" ]; then
        cp "$REPO_ROOT/frontend/.env.example" "$REPO_ROOT/frontend/.env.local"
        echo "  -> Created frontend/.env.local from frontend/.env.example"
    fi
else
    echo "  -> frontend/.env.local exists."
fi

# 2. Frontend dependencies
echo -e "\n[2/4] Installing frontend dependencies..."
cd "$REPO_ROOT/frontend"
npm install
echo "  -> Frontend dependencies installed."

# 3. Backend dependencies
echo -e "\n[3/4] Installing backend dependencies..."
cd "$REPO_ROOT/backend"
python3 -m pip install -r requirements.txt
echo "  -> Backend dependencies installed."

# 4. Chaincode verification
echo -e "\n[4/4] Checking chaincode vendor module..."
if [ -d "$REPO_ROOT/chaincode/verigold/vendor" ]; then
    echo "  -> Chaincode vendor directory is available."
else
    echo "  -> Note: Run 'go mod vendor' inside chaincode/verigold if needed."
fi

echo -e "\nSetup complete! Run './scripts/test.sh' to verify tests."
