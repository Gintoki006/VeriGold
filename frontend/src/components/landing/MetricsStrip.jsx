"use client";

export default function MetricsStrip() {
  const metrics = [
    {
      value: "₹8L Cr",
      label: "market protected",
      category: "RBI COMPLIANT",
    },
    {
      value: "<10s",
      label: "risk decision latency",
      category: "CONSORTIUM",
    },
    {
      value: "0 Bytes",
      label: "plaintext PII stored",
      category: "HMAC-SHA256",
    },
    {
      value: "100%",
      label: "tamper-evident proofs",
      category: "HYPERLEDGER",
    },
    {
      value: "98%",
      label: "multi-pledge fraud reduction",
      category: "RISK ENGINE",
    },
    {
      value: "0.5g",
      label: "gold quantization precision",
      category: "FINGERPRINT",
    },
    {
      value: "100%",
      label: "borrower privacy guarantee",
      category: "ZERO-KNOWLEDGE",
    },
    {
      value: "4+",
      label: "consortium peer nodes",
      category: "NETWORK MESH",
    },
  ];

  return (
    <section className="swiss-metrics-strip-section" id="metrics" aria-label="Performance metrics">
      <div className="swiss-metrics-strip-track">
        <div className="swiss-metrics-marquee">
          {metrics.map((m, idx) => (
            <div key={`m1-${idx}`} className="swiss-metric-item">
              <div className="swiss-metric-main">
                <span className="swiss-metric-value">{m.value}</span>
                <span className="swiss-metric-label">{m.label}</span>
              </div>
              <span className="swiss-metric-category">{m.category}</span>
            </div>
          ))}
          {metrics.slice(0, 4).map((m, idx) => (
            <div key={`m2-${idx}`} className="swiss-metric-item" aria-hidden="true">
              <div className="swiss-metric-main">
                <span className="swiss-metric-value">{m.value}</span>
                <span className="swiss-metric-label">{m.label}</span>
              </div>
              <span className="swiss-metric-category">{m.category}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
