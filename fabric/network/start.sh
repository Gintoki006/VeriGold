#!/usr/bin/env bash
# fabric/network/start.sh
# Brings up the Hyperledger Fabric test-network with CA, CouchDB, and mychannel.
# DO NOT modify test-network scripts directly — extend via this wrapper only.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FABRIC_SAMPLES_DIR="$SCRIPT_DIR/../fabric-samples"
TEST_NETWORK_DIR="$FABRIC_SAMPLES_DIR/test-network"

# Validate fabric-samples is present
if [ ! -d "$TEST_NETWORK_DIR" ]; then
  echo "ERROR: fabric-samples not found at $FABRIC_SAMPLES_DIR"
  echo "Run: git clone https://github.com/hyperledger/fabric-samples.git fabric/fabric-samples"
  exit 1
fi

# Export Fabric binary path and config path
export PATH="$FABRIC_SAMPLES_DIR/bin:$PATH"
export FABRIC_CFG_PATH="$FABRIC_SAMPLES_DIR/config"

echo "==> Starting Fabric test-network (CA + peers + CouchDB)..."
cd "$TEST_NETWORK_DIR"
./network.sh up createChannel -ca -s couchdb -c mychannel

echo ""
echo "==> Fabric network is up. Channel: mychannel"
echo "    Next: run ./network/deploy-chaincode.sh"
