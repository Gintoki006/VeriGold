export default function HowItWorksSection() {
  const steps = [
    {
      index: "01",
      tag: "Client-Side Privacy",
      title: "Hash the Borrower Identity",
      desc: "Lender enters the borrower's Aadhaar. An irreversible HMAC-SHA256 hash is computed with a consortium pepper before transmission — zero plaintext PII leaves the premises.",
      code: "HMAC_SHA256(aadhaar, secret_pepper) → 64-char hex",
    },
    {
      index: "02",
      tag: "Consortium Consensus",
      title: "Query the Hyperledger Fabric Registry",
      desc: "The anonymous hash queries the permissioned blockchain across all participating banks. Cross-institutional active pledges, aggregate exposure tiers, velocity spikes, and gold fingerprints match in milliseconds.",
      code: "chaincode.EvaluateTransaction('QueryExposure', hash)",
    },
    {
      index: "03",
      tag: "Auditable Risk Outcome",
      title: "Receive Deterministic Risk Decision",
      desc: "The deterministic rule engine evaluates duplicate pledges and velocity rules. The AI insight layer provides structured reasoning, which can escalate risk but never override rule boundaries.",
      code: "RuleEngine.score() → LOW | MEDIUM | HIGH",
    },
  ];

  return (
    <section className="how-it-works section" id="how-it-works">
      <div className="container">
        <div className="section__header reveal">
          <h2 className="section__title">How VeriGold Works</h2>
          <p className="section__subtitle">
            Three steps. A risk decision is returned in under ten seconds —
            before any pledge is accepted.
          </p>
        </div>

        <div className="how-it-works__cards">
          {steps.map((step) => (
            <div key={step.index} className="how-it-works__card reveal">
              <div className="how-it-works__card-head">
                <span className="how-it-works__card-index">Stage {step.index}</span>
                <span className="how-it-works__card-tag">{step.tag}</span>
              </div>
              <div className="how-it-works__card-body">
                <h3 className="how-it-works__card-title">{step.title}</h3>
                <p className="how-it-works__card-desc">{step.desc}</p>
              </div>
              <code className="how-it-works__card-code" aria-label={`Technical execution for stage ${step.index}`}>
                {step.code}
              </code>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
