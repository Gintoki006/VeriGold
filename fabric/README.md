# fabric

Hyperledger Fabric network scripts (wraps `fabric-samples/test-network`).

## Usage

### 1. Start the network
```bash
./network/start.sh
```
Brings up orderer, 2 CA services (Org1, Org2), 2 peers, CouchDB.

### 2. Deploy the chaincode
```bash
./network/deploy-chaincode.sh
```
Runs full lifecycle: package → install → approve → commit on `mychannel`.

### 3. Enroll demo lender identities
```bash
./network/enroll-lenders.sh
```
Enrolls Org1Admin and Org2Admin via Fabric CA. MSP credentials stored in `crypto-config/` (gitignored).

### 4. Stop the network
```bash
./network/stop.sh
```
Tears down all containers and volumes. Safe to run between demo rehearsals.

## Directory Structure

```
fabric/
├── network/
│   ├── start.sh             — Brings up test-network (CA + peers + CouchDB)
│   ├── deploy-chaincode.sh  — Full chaincode lifecycle
│   ├── stop.sh              — Tears down all containers
│   └── enroll-lenders.sh    — Enrolls demo lender MSP identities
├── fabric-samples/          — GITIGNORED (cloned at runtime)
├── crypto-config/           — GITIGNORED (generated at runtime)
├── channel-artifacts/       — GITIGNORED (generated at runtime)
└── README.md
```

## Prerequisites

- Docker and Docker Compose installed
- Fabric binaries in PATH (from `fabric-samples/bin`)
- `fabric-samples` cloned into `fabric/fabric-samples/` (run `git clone https://github.com/hyperledger/fabric-samples.git fabric/fabric-samples`)
