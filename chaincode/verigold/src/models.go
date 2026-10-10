package main

// ---------------------------------------------------------------------------
// Amount range constants (PRD §11.2, decisions.md Decision 2)
// ---------------------------------------------------------------------------
const (
	AmountRange0 = 0 // ₹0–₹50K
	AmountRange1 = 1 // ₹50K–₹1L
	AmountRange2 = 2 // ₹1L–₹2L
	AmountRange3 = 3 // ₹2L–₹5L
	AmountRange4 = 4 // ₹5L+
)

// ---------------------------------------------------------------------------
// Pledge — on-chain record for a single gold loan pledge
// ---------------------------------------------------------------------------
type Pledge struct {
	PledgeID        string `json:"pledge_id"`
	BorrowerHash    string `json:"borrower_hash"`    // HMAC-SHA256 commitment — never plaintext
	GoldFingerprint string `json:"gold_fingerprint"` // Bucketed SHA-256 attribute fingerprint
	LenderID        string `json:"lender_id"`        // Fabric MSP ID of the owning lender org
	AmountRange     int    `json:"amount_range"`     // 0–4 bucket code (PRD §11.2)
	Status          string `json:"status"`           // "ACTIVE" | "CLOSED"
	CreatedAt       int64  `json:"created_at"`       // Unix timestamp (ledger tx timestamp)
}

// ---------------------------------------------------------------------------
// BorrowerSummary — aggregate risk signals for a single borrower hash
// ---------------------------------------------------------------------------
type BorrowerSummary struct {
	ActivePledgeCount   int   `json:"active_pledge_count"`
	TotalAmountRangeSum int   `json:"total_amount_range_sum"`
	Velocity7d          int   `json:"velocity_7d"`
	LastPledgeTimestamp int64 `json:"last_pledge_timestamp"`
}

// ---------------------------------------------------------------------------
// GoldMatchResult — result of a gold fingerprint cross-lender lookup
// ---------------------------------------------------------------------------
type GoldMatchResult struct {
	MatchFound      bool   `json:"match_found"`
	MatchedPledgeID string `json:"matched_pledge_id"`
}
