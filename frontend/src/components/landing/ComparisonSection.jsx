"use client";

export default function ComparisonSection() {
  const rows = [
    {
      feature: "Gold Loan Coverage",
      verigold: "Full Registry",
      vStatus: "check",
      bureau: "No gold data",
      bStatus: "cross",
      manual: "Partial branch only",
      mStatus: "partial",
    },
    {
      feature: "Cross-Lender Visibility",
      verigold: "Real-Time (<10s)",
      vStatus: "check",
      bureau: "30-60 day lag",
      bStatus: "partial",
      manual: "Zero visibility",
      mStatus: "cross",
    },
    {
      feature: "Borrower Privacy",
      verigold: "HMAC + ZK (0 plaintext)",
      vStatus: "check",
      bureau: "Centralized PII",
      bStatus: "cross",
      manual: "Paper copies",
      mStatus: "cross",
    },
    {
      feature: "Gold Duplication Check",
      verigold: "Fingerprint Matching",
      vStatus: "check",
      bureau: "Not tracked",
      bStatus: "cross",
      manual: "Subjective visual only",
      mStatus: "cross",
    },
    {
      feature: "AI Risk Engine",
      verigold: "Hybrid Rule + LLM",
      vStatus: "check",
      bureau: "Generic Credit Score",
      bStatus: "partial",
      manual: "None",
      mStatus: "cross",
    },
    {
      feature: "Decision Latency",
      verigold: "Under 10 Seconds",
      vStatus: "check",
      bureau: "24-48 Hours",
      bStatus: "partial",
      manual: "3-5 Days",
      mStatus: "cross",
    },
  ];

  return (
    <section className="swiss-comparison-section" id="comparison">
      <div className="swiss-container">
        <div className="swiss-section-header">
          <div className="swiss-eyebrow">
            <span className="swiss-eyebrow-dash" aria-hidden="true" />
            <span className="swiss-eyebrow-text">Comparative Analysis</span>
          </div>

          <h2 className="swiss-section-title">
            Why VeriGold Wins.
            <br />
            <span className="swiss-title-muted">Complete visibility. Zero compromise.</span>
          </h2>
        </div>

        <div className="swiss-table-wrap">
          <table className="swiss-table">
            <thead>
              <tr>
                <th scope="col" className="swiss-th-feature">EVALUATION METRIC</th>
                <th scope="col" className="swiss-th-verigold">
                  <div className="flex items-center gap-2">
                    <span className="swiss-th-badge">RECOMMENDED</span>
                    <span>VERIGOLD</span>
                  </div>
                </th>
                <th scope="col" className="swiss-th-other">CIBIL / CREDIT BUREAU</th>
                <th scope="col" className="swiss-th-other">MANUAL APPRAISALS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.feature} className="swiss-tr">
                  <th scope="row" className="swiss-td-feature">
                    {r.feature}
                  </th>
                  <td className="swiss-td-verigold">
                    <div className="swiss-cell-val">
                      <span className="swiss-symbol check">✓</span>
                      <span>{r.verigold}</span>
                    </div>
                  </td>
                  <td className="swiss-td-other">
                    <div className="swiss-cell-val">
                      <span className={`swiss-symbol ${r.bStatus}`}>
                        {r.bStatus === "cross" ? "✕" : "~"}
                      </span>
                      <span>{r.bureau}</span>
                    </div>
                  </td>
                  <td className="swiss-td-other">
                    <div className="swiss-cell-val">
                      <span className={`swiss-symbol ${r.mStatus}`}>
                        {r.mStatus === "cross" ? "✕" : "~"}
                      </span>
                      <span>{r.manual}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
