#!/usr/bin/env bash
# fabric/network/enroll-lenders.sh
# Enrolls demo lender identities (Org1Admin, Org2Admin) via Fabric CA.
# MSP credentials are stored in fabric/crypto-config/ (gitignored).
# These credentials are used by the backend to sign Fabric Gateway transactions.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FABRIC_SAMPLES_DIR="$SCRIPT_DIR/../fabric-samples"
CRYPTO_CONFIG_DIR="$SCRIPT_DIR/../crypto-config"

export PATH="$FABRIC_SAMPLES_DIR/bin:$PATH"
export FABRIC_CFG_PATH="$FABRIC_SAMPLES_DIR/config"

mkdir -p "$CRYPTO_CONFIG_DIR/org1" "$CRYPTO_CONFIG_DIR/org2"

echo "==> Enrolling Org1 (LenderA) admin identity..."
export FABRIC_CA_CLIENT_HOME="$CRYPTO_CONFIG_DIR/org1"
fabric-ca-client enroll \
  -u https://admin:adminpw@localhost:7054 \
  --caname ca-org1 \
  --tls.certfiles "$FABRIC_SAMPLES_DIR/test-network/organizations/fabric-ca/org1/tls-cert.pem"

echo ""
echo "==> Enrolling Org2 (LenderB) admin identity..."
export FABRIC_CA_CLIENT_HOME="$CRYPTO_CONFIG_DIR/org2"
fabric-ca-client enroll \
  -u https://admin:adminpw@localhost:8054 \
  --caname ca-org2 \
  --tls.certfiles "$FABRIC_SAMPLES_DIR/test-network/organizations/fabric-ca/org2/tls-cert.pem"

echo ""
echo "==> Lender MSP credentials enrolled."
echo "    Org1 MSP: $CRYPTO_CONFIG_DIR/org1"
echo "    Org2 MSP: $CRYPTO_CONFIG_DIR/org2"
echo ""
echo "    Set FABRIC_MSP_CONFIG_PATH in backend/.env to point to this directory."
