package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"math/big"
	"testing"
	"time"

	"github.com/golang/protobuf/proto"
	"github.com/hyperledger/fabric-chaincode-go/shimtest"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/hyperledger/fabric-protos-go/msp"
	"github.com/hyperledger/fabric-protos-go/peer"
)

// ---------------------------------------------------------------------------
// Test harness helpers
// ---------------------------------------------------------------------------

var testCertPEM = func() []byte {
	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		panic(err)
	}
	template := x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject: pkix.Name{
			Organization: []string{"VeriGoldTest"},
		},
		NotBefore: time.Now().Add(-1 * time.Hour),
		NotAfter:  time.Now().Add(1 * time.Hour),
	}
	certDER, err := x509.CreateCertificate(rand.Reader, &template, &template, &priv.PublicKey, priv)
	if err != nil {
		panic(err)
	}
	return pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: certDER})
}()

func mspCreator(mspID string) []byte {
	sid := &msp.SerializedIdentity{
		Mspid:   mspID,
		IdBytes: testCertPEM,
	}
	b, _ := proto.Marshal(sid)
	return b
}

// newTestStub creates a shimtest.MockStub wired to VeriGoldContract.
func newTestStub(t *testing.T) *shimtest.MockStub {
	t.Helper()
	contract := new(VeriGoldContract)
	cc, err := contractapi.NewChaincode(contract)
	if err != nil {
		t.Fatalf("failed to create chaincode: %v", err)
	}
	stub := shimtest.NewMockStub("verigold", cc)
	stub.MockTransactionStart("init-tx")
	stub.MockTransactionEnd("init-tx")
	return stub
}

// invoke calls a chaincode function and returns the peer.Response.
func invoke(stub *shimtest.MockStub, fn string, args ...string) peer.Response {
	input := [][]byte{[]byte(fn)}
	for _, a := range args {
		input = append(input, []byte(a))
	}
	return stub.MockInvoke("tx-"+fn, input)
}

// invokeWithMSP sets the creator MSP before invoking.
func invokeWithMSP(stub *shimtest.MockStub, msp, fn string, args ...string) peer.Response {
	stub.Creator = mspCreator(msp)
	return invoke(stub, fn, args...)
}

// mustRegister is a convenience that registers a pledge and fatals on failure.
func mustRegister(t *testing.T, stub *shimtest.MockStub, msp, pledgeID, borrowerHash, goldFP string, amountRange int) {
	t.Helper()
	resp := invokeWithMSP(stub, msp, "RegisterPledge",
		pledgeID, borrowerHash, goldFP, fmt.Sprintf("%d", amountRange))
	if resp.Status != 200 {
		t.Fatalf("mustRegister(%s) failed: %s", pledgeID, resp.Message)
	}
}

// getPledge deserialises the Pledge returned by GetPledge.
func getPledge(t *testing.T, stub *shimtest.MockStub, pledgeID string) *Pledge {
	t.Helper()
	resp := invoke(stub, "GetPledge", pledgeID)
	if resp.Status != 200 {
		t.Fatalf("GetPledge(%s) failed: %s", pledgeID, resp.Message)
	}
	var p Pledge
	if err := json.Unmarshal(resp.Payload, &p); err != nil {
		t.Fatalf("unmarshal Pledge: %v", err)
	}
	return &p
}

// getBorrowerSummary deserialises BorrowerSummary from GetBorrowerSummary.
func getBorrowerSummary(t *testing.T, stub *shimtest.MockStub, borrowerHash string) *BorrowerSummary {
	t.Helper()
	resp := invoke(stub, "GetBorrowerSummary", borrowerHash)
	if resp.Status != 200 {
		t.Fatalf("GetBorrowerSummary(%s) failed: %s", borrowerHash, resp.Message)
	}
	var s BorrowerSummary
	if err := json.Unmarshal(resp.Payload, &s); err != nil {
		t.Fatalf("unmarshal BorrowerSummary: %v", err)
	}
	return &s
}

// getGoldMatch deserialises GoldMatchResult from GetGoldMatch.
func getGoldMatch(t *testing.T, stub *shimtest.MockStub, goldFP string) *GoldMatchResult {
	t.Helper()
	resp := invoke(stub, "GetGoldMatch", goldFP)
	if resp.Status != 200 {
		t.Fatalf("GetGoldMatch(%s) failed: %s", goldFP, resp.Message)
	}
	var r GoldMatchResult
	if err := json.Unmarshal(resp.Payload, &r); err != nil {
		t.Fatalf("unmarshal GoldMatchResult: %v", err)
	}
	return &r
}

// ---------------------------------------------------------------------------
// 2.3.1 — RegisterPledge tests
// ---------------------------------------------------------------------------

func TestRegisterPledge_CreatesWithCorrectFields(t *testing.T) {
	stub := newTestStub(t)
	mustRegister(t, stub, "Org1MSP", "pledge-001", "borrower-hash-1", "gold-fp-1", 2)

	p := getPledge(t, stub, "pledge-001")
	if p.PledgeID != "pledge-001" {
		t.Errorf("PledgeID mismatch: got %s", p.PledgeID)
	}
	if p.Status != statusActive {
		t.Errorf("expected status ACTIVE, got %s", p.Status)
	}
	if p.AmountRange != 2 {
		t.Errorf("AmountRange mismatch: got %d", p.AmountRange)
	}
	if p.BorrowerHash != "borrower-hash-1" {
		t.Errorf("BorrowerHash mismatch: got %s", p.BorrowerHash)
	}
}

func TestRegisterPledge_FailsOnDuplicate(t *testing.T) {
	stub := newTestStub(t)
	mustRegister(t, stub, "Org1MSP", "pledge-dup", "borrower-a", "gold-a", 1)

	resp := invokeWithMSP(stub, "Org1MSP", "RegisterPledge", "pledge-dup", "borrower-a", "gold-a", "1")
	if resp.Status == 200 {
		t.Error("expected error on duplicate pledgeID, got 200")
	}
}

func TestRegisterPledge_RejectsAmountRange5(t *testing.T) {
	stub := newTestStub(t)
	resp := invokeWithMSP(stub, "Org1MSP", "RegisterPledge", "pledge-bad", "bh", "gf", "5")
	if resp.Status == 200 {
		t.Error("expected error for amountRange=5")
	}
}

func TestRegisterPledge_RejectsNegativeAmountRange(t *testing.T) {
	stub := newTestStub(t)
	resp := invokeWithMSP(stub, "Org1MSP", "RegisterPledge", "pledge-neg", "bh", "gf", "-1")
	if resp.Status == 200 {
		t.Error("expected error for amountRange=-1")
	}
}

func TestRegisterPledge_RejectsEmptyFields(t *testing.T) {
	stub := newTestStub(t)
	resp := invokeWithMSP(stub, "Org1MSP", "RegisterPledge", "", "bh", "gf", "1")
	if resp.Status == 200 {
		t.Error("expected error for empty pledgeID")
	}
}

// ---------------------------------------------------------------------------
// ClosePledge tests
// ---------------------------------------------------------------------------

func TestClosePledge_TransitionsActiveToClose(t *testing.T) {
	stub := newTestStub(t)
	mustRegister(t, stub, "Org1MSP", "pledge-close-1", "borrower-b", "gold-b", 3)

	resp := invokeWithMSP(stub, "Org1MSP", "ClosePledge", "pledge-close-1")
	if resp.Status != 200 {
		t.Fatalf("ClosePledge failed: %s", resp.Message)
	}
	p := getPledge(t, stub, "pledge-close-1")
	if p.Status != statusClosed {
		t.Errorf("expected CLOSED, got %s", p.Status)
	}
}

func TestClosePledge_FailsOnAlreadyClosed(t *testing.T) {
	stub := newTestStub(t)
	mustRegister(t, stub, "Org1MSP", "pledge-closed-2", "borrower-c", "gold-c", 1)
	invokeWithMSP(stub, "Org1MSP", "ClosePledge", "pledge-closed-2")

	resp := invokeWithMSP(stub, "Org1MSP", "ClosePledge", "pledge-closed-2")
	if resp.Status == 200 {
		t.Error("expected error when closing already-closed pledge")
	}
}

func TestClosePledge_RejectsWrongMSP(t *testing.T) {
	stub := newTestStub(t)
	mustRegister(t, stub, "Org1MSP", "pledge-auth-1", "borrower-d", "gold-d", 2)

	resp := invokeWithMSP(stub, "Org2MSP", "ClosePledge", "pledge-auth-1")
	if resp.Status == 200 {
		t.Error("expected authorization error for wrong MSPID")
	}
}

func TestClosePledge_FailsOnNonExistent(t *testing.T) {
	stub := newTestStub(t)
	resp := invokeWithMSP(stub, "Org1MSP", "ClosePledge", "nonexistent-pledge")
	if resp.Status == 200 {
		t.Error("expected error for non-existent pledgeID")
	}
}

// ---------------------------------------------------------------------------
// GetBorrowerSummary tests
// ---------------------------------------------------------------------------

func TestGetBorrowerSummary_ZeroPledges(t *testing.T) {
	stub := newTestStub(t)
	s := getBorrowerSummary(t, stub, "unknown-borrower")
	if s.ActivePledgeCount != 0 || s.TotalAmountRangeSum != 0 || s.Velocity7d != 0 {
		t.Errorf("expected zero summary for unknown borrower, got %+v", s)
	}
}

func TestGetBorrowerSummary_OnePledge(t *testing.T) {
	stub := newTestStub(t)
	mustRegister(t, stub, "Org1MSP", "pledge-s1", "borrower-s", "gold-s1", 3)

	s := getBorrowerSummary(t, stub, "borrower-s")
	if s.ActivePledgeCount != 1 {
		t.Errorf("expected 1 active pledge, got %d", s.ActivePledgeCount)
	}
	if s.TotalAmountRangeSum != 3 {
		t.Errorf("expected TotalAmountRangeSum=3, got %d", s.TotalAmountRangeSum)
	}
}

func TestGetBorrowerSummary_TwoPledges(t *testing.T) {
	stub := newTestStub(t)
	mustRegister(t, stub, "Org1MSP", "pledge-s2a", "borrower-s2", "gold-s2a", 2)
	mustRegister(t, stub, "Org2MSP", "pledge-s2b", "borrower-s2", "gold-s2b", 1)

	s := getBorrowerSummary(t, stub, "borrower-s2")
	if s.ActivePledgeCount != 2 {
		t.Errorf("expected 2 active pledges, got %d", s.ActivePledgeCount)
	}
	if s.TotalAmountRangeSum != 3 {
		t.Errorf("expected TotalAmountRangeSum=3 (2+1), got %d", s.TotalAmountRangeSum)
	}
}

func TestGetBorrowerSummary_ExcludesClosedPledges(t *testing.T) {
	stub := newTestStub(t)
	mustRegister(t, stub, "Org1MSP", "pledge-ex1", "borrower-ex", "gold-ex1", 4)
	mustRegister(t, stub, "Org1MSP", "pledge-ex2", "borrower-ex", "gold-ex2", 2)
	invokeWithMSP(stub, "Org1MSP", "ClosePledge", "pledge-ex1")

	s := getBorrowerSummary(t, stub, "borrower-ex")
	if s.ActivePledgeCount != 1 {
		t.Errorf("expected 1 active pledge after close, got %d", s.ActivePledgeCount)
	}
	if s.TotalAmountRangeSum != 2 {
		t.Errorf("expected TotalAmountRangeSum=2 (closed pledge excluded), got %d", s.TotalAmountRangeSum)
	}
}

func TestGetBorrowerSummary_Velocity7d_FreshPledgesCount(t *testing.T) {
	stub := newTestStub(t)
	mustRegister(t, stub, "Org1MSP", "pledge-v1", "borrower-v", "gold-v1", 1)
	mustRegister(t, stub, "Org1MSP", "pledge-v2", "borrower-v", "gold-v2", 1)

	s := getBorrowerSummary(t, stub, "borrower-v")
	// Both pledges are brand new (MockStub timestamp ≈ now) — both in 7d window
	if s.Velocity7d != 2 {
		t.Errorf("expected Velocity7d=2 for brand-new pledges, got %d", s.Velocity7d)
	}
}

func TestGetBorrowerSummary_Velocity7d_BoundaryConstant(t *testing.T) {
	expected := int64(7 * 24 * 3600)
	if sevenDaysSeconds != expected {
		t.Errorf("sevenDaysSeconds constant wrong: got %d, want %d", sevenDaysSeconds, expected)
	}
	if time.Now().Unix() <= 0 {
		t.Error("unexpected non-positive unix timestamp")
	}
}

// ---------------------------------------------------------------------------
// GetGoldMatch tests
// ---------------------------------------------------------------------------

func TestGetGoldMatch_MatchForActiveFingerprint(t *testing.T) {
	stub := newTestStub(t)
	mustRegister(t, stub, "Org1MSP", "pledge-gm1", "borrower-gm", "gold-fp-unique-1", 2)

	result := getGoldMatch(t, stub, "gold-fp-unique-1")
	if !result.MatchFound {
		t.Error("expected match found for active fingerprint")
	}
	if result.MatchedPledgeID != "pledge-gm1" {
		t.Errorf("expected MatchedPledgeID=pledge-gm1, got %s", result.MatchedPledgeID)
	}
}

func TestGetGoldMatch_NoMatchForUnknownFingerprint(t *testing.T) {
	stub := newTestStub(t)
	result := getGoldMatch(t, stub, "fingerprint-that-does-not-exist")
	if result.MatchFound {
		t.Error("expected no match for unknown fingerprint")
	}
}

func TestGetGoldMatch_NoMatchForClosedPledge(t *testing.T) {
	stub := newTestStub(t)
	mustRegister(t, stub, "Org1MSP", "pledge-closed-gm", "borrower-closed", "gold-fp-closed", 1)
	invokeWithMSP(stub, "Org1MSP", "ClosePledge", "pledge-closed-gm")

	result := getGoldMatch(t, stub, "gold-fp-closed")
	if result.MatchFound {
		t.Error("closed pledge should NOT constitute a gold match")
	}
}

// ---------------------------------------------------------------------------
// GetActivePledges tests
// ---------------------------------------------------------------------------

func TestGetActivePledges_ReturnsMixedStatus(t *testing.T) {
	stub := newTestStub(t)
	mustRegister(t, stub, "Org1MSP", "pledge-ap1", "borrower-ap1", "gold-ap1", 1)
	mustRegister(t, stub, "Org1MSP", "pledge-ap2", "borrower-ap2", "gold-ap2", 2)
	mustRegister(t, stub, "Org1MSP", "pledge-ap3", "borrower-ap3", "gold-ap3", 3)
	invokeWithMSP(stub, "Org1MSP", "ClosePledge", "pledge-ap2")

	resp := invoke(stub, "GetActivePledges")
	if resp.Status != 200 {
		t.Fatalf("GetActivePledges failed: %s", resp.Message)
	}
	var pledges []*Pledge
	if err := json.Unmarshal(resp.Payload, &pledges); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(pledges) != 2 {
		t.Errorf("expected 2 active pledges, got %d", len(pledges))
	}
	for _, p := range pledges {
		if p.Status != statusActive {
			t.Errorf("GetActivePledges returned non-active pledge: %s", p.PledgeID)
		}
	}
}

func TestGetActivePledges_EmptyLedger(t *testing.T) {
	stub := newTestStub(t)
	resp := invoke(stub, "GetActivePledges")
	if resp.Status != 200 {
		t.Fatalf("GetActivePledges on empty ledger failed: %s", resp.Message)
	}
	var pledges []*Pledge
	if err := json.Unmarshal(resp.Payload, &pledges); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(pledges) != 0 {
		t.Errorf("expected empty slice on empty ledger, got %d", len(pledges))
	}
}

