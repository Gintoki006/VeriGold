export default function StatsSection() {
  const stats = [
    {
      number: "₹8L Cr",
      label: "Indian Gold Loan Market",
      desc: "Total collateral exposed to cross-lender multi-pledge fraud",
    },
    {
      number: "<10s",
      label: "Risk Decision Latency",
      desc: "Deterministic verification returned prior to loan sanction",
    },
    {
      number: "0 Bytes",
      label: "Plaintext PII Stored",
      desc: "Irreversible HMAC-SHA256 identity hashing with zero data leakage",
    },
    {
      number: "100%",
      label: "Auditable Ledger Proofs",
      desc: "Tamper-evident Hyperledger Fabric cryptographic consensus",
    },
  ];

  return (
    <section className="stats section" id="stats" aria-label="Platform and market performance statistics">
      <div className="container">
        <h2 className="sr-only">Platform and Market Performance Metrics</h2>
        <div className="stats__grid">
          {stats.map((s, i) => (
            <div key={i} className="stats__card reveal">
              <div className="stats__number">{s.number}</div>
              <div className="stats__label">{s.label}</div>
              <p className="stats__desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
