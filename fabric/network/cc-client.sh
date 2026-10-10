#!/usr/bin/env bash
# fabric/network/cc-client.sh
# Bridge script to query and invoke verigold chaincode using peer CLI
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FABRIC_SAMPLES_DIR="$SCRIPT_DIR/../fabric-samples"
TEST_NETWORK_DIR="$FABRIC_SAMPLES_DIR/test-network"

export PATH="$FABRIC_SAMPLES_DIR/bin:$PATH"
export FABRIC_CFG_PATH="$FABRIC_SAMPLES_DIR/config"
export TEST_NETWORK_HOME="$TEST_NETWORK_DIR"

. "$TEST_NETWORK_DIR/scripts/envVar.sh" >/dev/null 2>&1

COMMAND="${1:-query}"
ORG="${2:-1}"
FN_NAME="${3:-}"
shift 3 || true

# Map MSP IDs to Org numbers
if [ "$ORG" = "Org1MSP" ] || [ "$ORG" = "1" ]; then
    ORG=1
elif [ "$ORG" = "Org2MSP" ] || [ "$ORG" = "2" ]; then
    ORG=2
else
    ORG=1
fi

# Build JSON args array: '{"Args":["FnName","arg1","arg2",...]}'
ARGS_JSON="{\"Args\":[\"$FN_NAME\""
for arg in "$@"; do
    escaped_arg=$(printf '%s' "$arg" | sed 's/\\/\\\\/g; s/"/\\"/g')
    ARGS_JSON="$ARGS_JSON,\"$escaped_arg\""
done
ARGS_JSON="$ARGS_JSON]}"

if [ "$COMMAND" = "query" ]; then
    setGlobals "$ORG" >/dev/null 2>&1
    peer chaincode query -C mychannel -n verigold -c "$ARGS_JSON"
elif [ "$COMMAND" = "invoke" ]; then
    # Gather endorsement peer params
    parsePeerConnectionParameters 1 2 >/dev/null 2>&1
    
    # Ensure current invoking org credentials take precedence
    setGlobals "$ORG" >/dev/null 2>&1
    
    OUTPUT=$(peer chaincode invoke \
        -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.example.com \
        --tls \
        --cafile "$ORDERER_CA" \
        -C mychannel \
        -n verigold \
        "${PEER_CONN_PARMS[@]}" \
        --waitForEvent \
        -c "$ARGS_JSON" 2>&1)
    
    if echo "$OUTPUT" | grep -q "status:200"; then
        TXID=$(echo "$OUTPUT" | grep -o 'txid \[[a-f0-9]*\]' | awk -F'[][]' '{print $2}' || true)
        if [ -z "$TXID" ]; then
            TXID=$(echo "$OUTPUT" | sha256sum | awk '{print $1}')
        fi
        echo "SUCCESS:$TXID"
    else
        echo "ERROR:$OUTPUT" >&2
        exit 1
    fi
else
    echo "Unknown command: $COMMAND" >&2
    exit 1
fi
