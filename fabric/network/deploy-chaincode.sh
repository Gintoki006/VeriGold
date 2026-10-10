#!/usr/bin/env bash
# fabric/network/deploy-chaincode.sh
# Full chaincode lifecycle: package -> install -> approve -> commit
# Chaincode name: verigold | version: 1.0 | channel: mychannel

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FABRIC_SAMPLES_DIR="$SCRIPT_DIR/../fabric-samples"
TEST_NETWORK_DIR="$FABRIC_SAMPLES_DIR/test-network"
CHAINCODE_PATH="$SCRIPT_DIR/../../chaincode/verigold"

export PATH="$FABRIC_SAMPLES_DIR/bin:$PATH"
export FABRIC_CFG_PATH="$FABRIC_SAMPLES_DIR/config"

CC_NAME="verigold"
CC_VERSION="1.0"
CC_SEQUENCE="1"
CHANNEL="mychannel"

echo "==> Deploying chaincode: $CC_NAME v$CC_VERSION on channel $CHANNEL"

cd "$TEST_NETWORK_DIR"

./network.sh deployCC \
  -ccn "$CC_NAME" \
  -ccp "$CHAINCODE_PATH" \
  -ccl go \
  -ccv "$CC_VERSION" \
  -ccs "$CC_SEQUENCE" \
  -c "$CHANNEL"

echo ""
echo "==> Chaincode '$CC_NAME' deployed and committed on channel '$CHANNEL'."
