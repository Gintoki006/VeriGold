# chaincode

Hyperledger Fabric Go chaincode — VeriGold registry smart contract.

## Directories

- `verigold/src/` — Go chaincode source
- `verigold/tests/` — Chaincode unit tests

## Chaincode Functions

| Function | Description |
|---|---|
| `RegisterPledge` | Creates a new active pledge (borrower hash, gold fingerprint, amount range, lender ID) |
| `ClosePledge` | Transitions ACTIVE → CLOSED; only pledge-owning lender may close |
| `GetPledge` | Returns a pledge record (any enrolled lender may read) |
| `GetBorrowerSummary` | Returns aggregate risk signals: active pledge count, total exposure sum, velocity 7d |
| `GetGoldMatch` | Returns whether a gold fingerprint matches any existing active pledge |
| `GetActivePledges` | Returns active pledge IDs |

See [`../docs/decisions.md`](../docs/decisions.md) Decision 5 for read/write authorization rules.
