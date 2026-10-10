export default function ComparisonSection() {
  const rows = [
    {
      feature: "Gold Loan Coverage",
      verigold: "✓ Full Registry",
      vA11y: "Complete multi-lender consortium registry coverage",
      bureau: "✗ No gold data",
      bA11y: "Omitted: gold loan pledges not captured in bureau files",
      manual: "~ Partial",
      mA11y: "Limited to individual branch records",
      vType: "check",
      bType: "cross",
      mType: "partial",
    },
    {
      feature: "Cross-Lender Visibility",
      verigold: "✓ Real-Time",
      vA11y: "Instant real-time visibility across all consortium lenders",
      bureau: "~ Delayed",
      bA11y: "Delayed: 30 to 60 day monthly reporting lag",
      manual: "✗ None",
      mA11y: "Zero visibility into external lenders",
      vType: "check",
      bType: "partial",
      mType: "cross",
    },
    {
      feature: "Borrower Privacy",
      verigold: "✓ HMAC + ZK",
      vA11y: "Cryptographic protection with HMAC identity masking and zero-knowledge proofs",
      bureau: "✗ Plaintext PII",
      bA11y: "Vulnerable: centralized plaintext personal information exposed",
      manual: "✗ Paper copies",
      mA11y: "Vulnerable: unencrypted physical paperwork and photocopies",
      vType: "check",
      bType: "cross",
      mType: "cross",
    },
    {
      feature: "Gold Duplication Check",
      verigold: "✓ Fingerprint Match",
      vA11y: "Automated cryptographic gold fingerprint matching",
      bureau: "✗ Not tracked",
      bA11y: "Not tracked: physical collateral characteristics unrecorded",
      manual: "✗ Impossible",
      mA11y: "Impossible: unable to inspect ornaments pledged at other institutions",
      vType: "check",
      bType: "cross",
      mType: "cross",
    },
    {
      feature: "AI Risk Analysis",
      verigold: "✓ Hybrid Rule + LLM",
      vA11y: "Automated rule engine combined with AI advisory narratives",
      bureau: "~ Basic Score",
      bA11y: "Limited: static generic credit score without collateral intelligence",
      manual: "✗ None",
      mA11y: "None: subjective appraisal prone to human discretion",
      vType: "check",
      bType: "partial",
      mType: "cross",
    },
    {
      feature: "Response Time",
      verigold: "✓ Under 10s",
      vA11y: "Under 10 seconds end-to-end evaluation",
      bureau: "~ 24-48 hours",
      bA11y: "24 to 48 hours batch response time",
      manual: "✗ Days",
      mA11y: "Multiple days for manual paperwork and branch checks",
      vType: "check",
      bType: "partial",
      mType: "cross",
    },
  ];

  const getStyleClass = (type) => {
    if (type === "check") return "comparison__check";
    if (type === "cross") return "comparison__cross";
    return "comparison__partial";
  };

  const renderStatus = (text, type, a11yText) => {
    const symbol = text.slice(0, 1);
    const label = text.slice(2);
    return (
      <span className={getStyleClass(type)}>
        <span aria-hidden="true">{symbol} </span>
        <span className="sr-only">{a11yText}</span>
        <span aria-hidden="true">{label}</span>
      </span>
    );
  };

  return (
    <section className="comparison section" id="comparison">
      <div className="container">
        <div className="section__header reveal">
          <h2 className="section__title">Why VeriGold Wins</h2>
          <p className="section__subtitle">
            Compared to traditional methods, VeriGold delivers complete
            cross-lender visibility with zero privacy compromise.
          </p>
        </div>

        <div
          className="comparison__wrap reveal"
          tabIndex={0}
          role="region"
          aria-label="Feature comparison table"
        >
          <table className="comparison__table" aria-label="Feature comparison between VeriGold, traditional bureaus, and manual checks">
            <caption className="sr-only">
              Comparison of VeriGold versus credit bureaus and manual checks across loan coverage, visibility, privacy, fraud detection, AI analysis, and response latency.
            </caption>
            <thead>
              <tr>
                <th scope="col">Feature</th>
                <th scope="col" className="comparison__highlight">VeriGold</th>
                <th scope="col">CIBIL / Bureau</th>
                <th scope="col">Manual Checks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.feature}>
                  <th scope="row" style={{ fontWeight: 600, textAlign: 'left' }}>{r.feature}</th>
                  <td className="comparison__highlight">
                    {renderStatus(r.verigold, r.vType, r.vA11y)}
                  </td>
                  <td>
                    {renderStatus(r.bureau, r.bType, r.bA11y)}
                  </td>
                  <td>
                    {renderStatus(r.manual, r.mType, r.mA11y)}
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
