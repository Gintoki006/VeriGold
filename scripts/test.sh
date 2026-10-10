#!/usr/bin/env bash
# VeriGold — Test Runner Script (Bash/Linux/macOS)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=========================================="
echo "  VeriGold — Automated Test Suite Runner "
echo "=========================================="

FAILED=0

# 1. Backend tests
echo -e "\n[1/3] Running backend unit & integration tests..."
cd "$REPO_ROOT/backend"
if python3 -m pytest; then
    echo "  PASSED: Backend tests completed successfully."
else
    echo "  FAILED: Backend tests encountered errors."
    FAILED=$((FAILED + 1))
fi

# 2. Chaincode tests
echo -e "\n[2/3] Running chaincode smart contract unit tests..."
cd "$REPO_ROOT/chaincode/verigold"
if [ -d "$REPO_ROOT/chaincode/verigold/vendor" ]; then
    go test -mod=vendor ./... || FAILED=$((FAILED + 1))
else
    go test ./... || FAILED=$((FAILED + 1))
fi

# 3. Frontend production build
echo -e "\n[3/3] Running frontend production build check..."
cd "$REPO_ROOT/frontend"
npm run build || FAILED=$((FAILED + 1))

echo -e "\n=========================================="
if [ "$FAILED" -eq 0 ]; then
    echo "  ALL TEST SUITES PASSED! [100% OK]"
else
    echo "  TEST SUITE COMPLETED WITH $FAILED FAILURES"
fi
echo "=========================================="
exit "$FAILED"
