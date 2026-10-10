#!/usr/bin/env bash
# fabric/network/stop.sh
# Tears down all Fabric containers and volumes.
# Safe to run between demo rehearsals.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FABRIC_SAMPLES_DIR="$SCRIPT_DIR/../fabric-samples"
TEST_NETWORK_DIR="$FABRIC_SAMPLES_DIR/test-network"

export PATH="$FABRIC_SAMPLES_DIR/bin:$PATH"
export FABRIC_CFG_PATH="$FABRIC_SAMPLES_DIR/config"

echo "==> Stopping Fabric test-network and removing all volumes..."
cd "$TEST_NETWORK_DIR"
./network.sh down

echo ""
echo "==> Fabric network stopped. All containers and volumes removed."
