# Hyperledger Fabric Explorer for VeriGold

Web-based blockchain explorer for the VeriGold Hyperledger Fabric consortium network (`mychannel`).

## Features
- **Dashboard:** Real-time metrics for blocks, transactions, nodes, and chaincodes.
- **Blocks & Transactions:** Detailed cryptographic explorer showing tx hash, payload, endorsers, and read-write sets (`rwset`).
- **Chaincodes:** View deployed `verigold` chaincode details.
- **Peers & Channels:** Monitor peer status and channel topology.

## Prerequisites
The Fabric network must be running before starting Explorer:
```bash
./fabric/network/start.sh
./fabric/network/deploy-chaincode.sh
```

## How to Start
From WSL or terminal:
```bash
./fabric/explorer/start-explorer.sh
```
Or directly with docker compose:
```bash
cd fabric/explorer
docker compose -f docker-compose-explorer.yaml up -d
```

## Accessing the Web UI
- **URL:** [http://localhost:8080](http://localhost:8080)
- **Default Username:** `exploreradmin`
- **Default Password:** `exploreradminpw`

> Note: Allow ~15–20 seconds after launch for `explorer-db` to complete initialization and for the explorer service to sync blocks from `peer0.org1.example.com`.

## How to Stop
```bash
./fabric/explorer/stop-explorer.sh
```
