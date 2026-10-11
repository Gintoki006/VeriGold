#!/usr/bin/env bash
# fabric/explorer/start-explorer.sh
# Start Hyperledger Fabric Explorer connected to the test-network
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Ensure the fabric_test network is running
if ! docker network ls | grep -q "fabric_test"; then
  echo "ERROR: Docker network 'fabric_test' is not running."
  echo "Please start the Fabric network first using: ./fabric/network/start.sh"
  exit 1
fi

echo "==> Starting Hyperledger Explorer DB and Web App..."
docker compose -f docker-compose-explorer.yaml up -d

echo ""
echo "=========================================================="
echo " Hyperledger Fabric Explorer is starting up!"
echo " Web UI:      http://localhost:8080"
echo " Channel:     mychannel"
echo " Credentials: exploreradmin / exploreradminpw"
echo "=========================================================="
echo ""
echo "Wait ~15-20 seconds for the Explorer server to sync with the blockchain."
