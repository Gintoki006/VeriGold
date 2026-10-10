// VeriGold — ZK Exposure Threshold Circuit (Phase 6)
//
// Statement (locked per docs/decisions.md Decision 9):
//   "The borrower's total exposure is below the lender's threshold"
//
// Private inputs  (never revealed to the verifier):
//   total_exposure : u32  — borrower's aggregate amount_range_code sum across active pledges
//
// Public inputs  (visible to the verifier):
//   threshold : u32  — lender's stated maximum acceptable exposure
//
// Scope is locked to exactly ONE statement. No generalization. (PRD §6.1)

fn main(total_exposure: u32, threshold: pub u32) {
    assert(total_exposure < threshold);
}
