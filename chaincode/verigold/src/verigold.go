package main

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ---------------------------------------------------------------------------
// Composite key prefixes
// ---------------------------------------------------------------------------
const (
	keyPrefixPledge          = "pledge~id"
	keyPrefixBorrowerHash    = "borrower~hash"
	keyPrefixGoldFingerprint = "gold~fingerprint"
	statusActive             = "ACTIVE"
	statusClosed             = "CLOSED"
	sevenDaysSeconds         = int64(7 * 24 * 3600) // 604800
	activePledgesCap         = 100
)

// ---------------------------------------------------------------------------
// VeriGoldContract — Fabric smart contract
// ---------------------------------------------------------------------------
type VeriGoldContract struct {
	contractapi.Contract
}

// ---------------------------------------------------------------------------
// RegisterPledge — Creates a new ACTIVE pledge record on the ledger.
// Authorization: caller MSPID is stored as lender_id; only that org can close it.
// ---------------------------------------------------------------------------
func (c *VeriGoldContract) RegisterPledge(
	ctx contractapi.TransactionContextInterface,
	pledgeID string,
	borrowerHash string,
	goldFingerprint string,
	amountRange int,
) error {
	// --- Input validation ---
	if pledgeID == "" || borrowerHash == "" || goldFingerprint == "" {
		return fmt.Errorf("pledgeID, borrowerHash, and goldFingerprint must be non-empty")
	}
	if amountRange < AmountRange0 || amountRange > AmountRange4 {
		return fmt.Errorf("amountRange must be 0–4, got %d", amountRange)
	}

	// --- Duplicate guard ---
	existing, err := ctx.GetStub().GetState(pledgeCompositeKey(ctx, pledgeID))
	if err != nil {
		return fmt.Errorf("failed to read state: %w", err)
	}
	if existing != nil {
		return fmt.Errorf("pledge %s already exists", pledgeID)
	}

	// --- Resolve caller identity ---
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get caller MSPID: %w", err)
	}

	// --- Build pledge ---
	txTime, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get tx timestamp: %w", err)
	}
	pledge := &Pledge{
		PledgeID:        pledgeID,
		BorrowerHash:    borrowerHash,
		GoldFingerprint: goldFingerprint,
		LenderID:        mspID,
		AmountRange:     amountRange,
		Status:          statusActive,
		CreatedAt:       txTime.Seconds,
	}

	pledgeBytes, err := json.Marshal(pledge)
	if err != nil {
		return fmt.Errorf("failed to marshal pledge: %w", err)
	}

	// --- Primary key ---
	if err := ctx.GetStub().PutState(pledgeCompositeKey(ctx, pledgeID), pledgeBytes); err != nil {
		return fmt.Errorf("failed to write pledge state: %w", err)
	}

	// --- Index: borrower~hash~{borrowerHash}~{pledgeID} ---
	bKey, err := ctx.GetStub().CreateCompositeKey(keyPrefixBorrowerHash, []string{borrowerHash, pledgeID})
	if err != nil {
		return fmt.Errorf("failed to create borrower composite key: %w", err)
	}
	if err := ctx.GetStub().PutState(bKey, []byte{0x00}); err != nil {
		return fmt.Errorf("failed to write borrower index: %w", err)
	}

	// --- Index: gold~fingerprint~{goldFingerprint}~{pledgeID} ---
	gKey, err := ctx.GetStub().CreateCompositeKey(keyPrefixGoldFingerprint, []string{goldFingerprint, pledgeID})
	if err != nil {
		return fmt.Errorf("failed to create gold fingerprint composite key: %w", err)
	}
	if err := ctx.GetStub().PutState(gKey, []byte{0x00}); err != nil {
		return fmt.Errorf("failed to write gold fingerprint index: %w", err)
	}

	return nil
}

// ---------------------------------------------------------------------------
// ClosePledge — Transitions a pledge ACTIVE → CLOSED.
// Only the originating lender org (by MSPID) may close a pledge.
// ---------------------------------------------------------------------------
func (c *VeriGoldContract) ClosePledge(
	ctx contractapi.TransactionContextInterface,
	pledgeID string,
) error {
	pledge, err := loadPledge(ctx, pledgeID)
	if err != nil {
		return err
	}

	if pledge.Status != statusActive {
		return fmt.Errorf("pledge %s is already %s", pledgeID, pledge.Status)
	}

	callerMSP, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get caller MSPID: %w", err)
	}
	if callerMSP != pledge.LenderID {
		return fmt.Errorf("caller MSPID %s is not authorized to close pledge owned by %s", callerMSP, pledge.LenderID)
	}

	pledge.Status = statusClosed

	pledgeBytes, err := json.Marshal(pledge)
	if err != nil {
		return fmt.Errorf("failed to marshal pledge: %w", err)
	}
	if err := ctx.GetStub().PutState(pledgeCompositeKey(ctx, pledgeID), pledgeBytes); err != nil {
		return fmt.Errorf("failed to write pledge state: %w", err)
	}

	return nil
}

// ---------------------------------------------------------------------------
// GetPledge — Retrieves a pledge record by pledgeID. Any enrolled lender may read.
// ---------------------------------------------------------------------------
func (c *VeriGoldContract) GetPledge(
	ctx contractapi.TransactionContextInterface,
	pledgeID string,
) (*Pledge, error) {
	return loadPledge(ctx, pledgeID)
}

// ---------------------------------------------------------------------------
// GetBorrowerSummary — Returns aggregate risk signals for a borrower hash.
// Returns zero-value summary (not an error) when borrower has no pledges.
// ---------------------------------------------------------------------------
func (c *VeriGoldContract) GetBorrowerSummary(
	ctx contractapi.TransactionContextInterface,
	borrowerHash string,
) (*BorrowerSummary, error) {
	iter, err := ctx.GetStub().GetStateByPartialCompositeKey(keyPrefixBorrowerHash, []string{borrowerHash})
	if err != nil {
		return nil, fmt.Errorf("failed to query borrower index: %w", err)
	}
	defer iter.Close()

	summary := &BorrowerSummary{}
	now := time.Now().Unix()

	for iter.HasNext() {
		kv, err := iter.Next()
		if err != nil {
			return nil, fmt.Errorf("iterator error: %w", err)
		}

		// Extract pledgeID from composite key components
		_, parts, err := ctx.GetStub().SplitCompositeKey(kv.Key)
		if err != nil || len(parts) < 2 {
			continue
		}
		pledgeID := parts[1]

		pledge, err := loadPledge(ctx, pledgeID)
		if err != nil {
			continue // soft error — skip corrupt records
		}

		// Track most recent pledge regardless of status
		if pledge.CreatedAt > summary.LastPledgeTimestamp {
			summary.LastPledgeTimestamp = pledge.CreatedAt
		}

		// Velocity: count all pledges created within the last 7 days
		if now-pledge.CreatedAt <= sevenDaysSeconds {
			summary.Velocity7d++
		}

		// Only ACTIVE pledges contribute to exposure signals
		if pledge.Status == statusActive {
			summary.ActivePledgeCount++
			summary.TotalAmountRangeSum += pledge.AmountRange
		}
	}

	return summary, nil
}

// ---------------------------------------------------------------------------
// GetGoldMatch — Checks whether a gold fingerprint is tied to any active pledge.
// CLOSED pledges must NOT match (closed gold should not block a new lender).
// ---------------------------------------------------------------------------
func (c *VeriGoldContract) GetGoldMatch(
	ctx contractapi.TransactionContextInterface,
	goldFingerprint string,
) (*GoldMatchResult, error) {
	iter, err := ctx.GetStub().GetStateByPartialCompositeKey(keyPrefixGoldFingerprint, []string{goldFingerprint})
	if err != nil {
		return nil, fmt.Errorf("failed to query gold fingerprint index: %w", err)
	}
	defer iter.Close()

	for iter.HasNext() {
		kv, err := iter.Next()
		if err != nil {
			return nil, fmt.Errorf("iterator error: %w", err)
		}

		_, parts, err := ctx.GetStub().SplitCompositeKey(kv.Key)
		if err != nil || len(parts) < 2 {
			continue
		}
		pledgeID := parts[1]

		pledge, err := loadPledge(ctx, pledgeID)
		if err != nil {
			continue
		}

		// Only active pledges constitute a match
		if pledge.Status == statusActive {
			return &GoldMatchResult{MatchFound: true, MatchedPledgeID: pledgeID}, nil
		}
	}

	return &GoldMatchResult{MatchFound: false, MatchedPledgeID: ""}, nil
}

// ---------------------------------------------------------------------------
// GetActivePledges — Returns up to 100 active pledge IDs (MVP cap).
// ---------------------------------------------------------------------------
func (c *VeriGoldContract) GetActivePledges(
	ctx contractapi.TransactionContextInterface,
) ([]*Pledge, error) {
	iter, err := ctx.GetStub().GetStateByPartialCompositeKey(keyPrefixPledge, []string{})
	if err != nil {
		return nil, fmt.Errorf("failed to query pledge index: %w", err)
	}
	defer iter.Close()

	var results []*Pledge

	for iter.HasNext() && len(results) < activePledgesCap {
		kv, err := iter.Next()
		if err != nil {
			return nil, fmt.Errorf("iterator error: %w", err)
		}

		var pledge Pledge
		if err := json.Unmarshal(kv.Value, &pledge); err != nil {
			continue
		}
		if pledge.Status == statusActive {
			results = append(results, &pledge)
		}
	}

	if results == nil {
		results = []*Pledge{}
	}
	return results, nil
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// pledgeCompositeKey returns the primary ledger key for a pledge.
func pledgeCompositeKey(ctx contractapi.TransactionContextInterface, pledgeID string) string {
	key, _ := ctx.GetStub().CreateCompositeKey(keyPrefixPledge, []string{pledgeID})
	return key
}

// loadPledge fetches and deserializes a pledge from the ledger.
func loadPledge(ctx contractapi.TransactionContextInterface, pledgeID string) (*Pledge, error) {
	data, err := ctx.GetStub().GetState(pledgeCompositeKey(ctx, pledgeID))
	if err != nil {
		return nil, fmt.Errorf("failed to read pledge %s: %w", pledgeID, err)
	}
	if data == nil {
		return nil, fmt.Errorf("pledge %s not found", pledgeID)
	}
	var p Pledge
	if err := json.Unmarshal(data, &p); err != nil {
		return nil, fmt.Errorf("failed to unmarshal pledge %s: %w", pledgeID, err)
	}
	return &p, nil
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
func main() {
	contract := new(VeriGoldContract)
	cc, err := contractapi.NewChaincode(contract)
	if err != nil {
		log.Panicf("Error creating VeriGold chaincode: %v", err)
	}
	if err := cc.Start(); err != nil {
		log.Panicf("Error starting VeriGold chaincode: %v", err)
	}
}
