#!/usr/bin/env bash
# fabric/explorer/stop-explorer.sh
# Stop Hyperledger Fabric Explorer
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Stopping Hyperledger Explorer containers..."
docker compose -f docker-compose-explorer.yaml down -v
echo "==> Explorer stopped."
