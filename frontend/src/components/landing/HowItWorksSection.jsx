"use client";

import { motion } from "framer-motion";

export default function HowItWorksSection({ onOpenDemo }) {
  const steps = [
    {
      index: "01",
      tag: "Client-Side Privacy",
      title: "Hash the Borrower Identity",
      desc: "Lender enters the borrower's Aadhaar or PAN. An irreversible HMAC-SHA256 hash is computed with a consortium pepper before transmission — zero plaintext PII leaves the premises.",
      code: "HMAC_SHA256(aadhaar, secret_pepper) → 64-char hex",
    },
    {
      index: "02",
      tag: "Consortium Consensus",
      title: "Query the Hyperledger Fabric Registry",
      desc: "The anonymous hash queries the permissioned blockchain across all participating banks. Cross-institutional active pledges, aggregate exposure tiers, and velocity spikes match in milliseconds.",
      code: "chaincode.EvaluateTransaction('QueryExposure', hash)",
    },
    {
      index: "03",
      tag: "Auditable Risk Outcome",
      title: "Receive Deterministic Risk Decision",
      desc: "The deterministic rule engine evaluates duplicate pledges and multi-lender velocity. The AI insight layer provides structured reasoning, which can escalate risk but never override rule boundaries.",
      code: "RuleEngine.score() → LOW | MEDIUM | HIGH",
    },
  ];

  return (
    <section className="swiss-how-it-works-section" id="how-it-works">
      <div className="swiss-container">
        <div className="swiss-section-header">
          <div className="swiss-eyebrow">
            <span className="swiss-eyebrow-dash" aria-hidden="true" />
            <span className="swiss-eyebrow-text">Verification Architecture</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <h2 className="swiss-section-title">
              Three steps. Under 10 seconds.
              <br />
              <span className="swiss-title-muted">Before any pledge is approved.</span>
            </h2>

            {onOpenDemo && (
              <button
                type="button"
                onClick={onOpenDemo}
                className="swiss-btn-secondary self-start md:self-auto"
              >
                <span>Simulate live verification</span>
                <span className="swiss-live-dot" />
              </button>
            )}
          </div>
        </div>

        <div className="swiss-steps-grid">
          {steps.map((step, idx) => (
            <div key={step.index} className="swiss-step-card">
              <div className="swiss-step-top">
                <span className="swiss-step-index">{step.index}</span>
                <span className="swiss-step-tag">{step.tag}</span>
              </div>

              <div className="swiss-step-content">
                <h3 className="swiss-step-title">{step.title}</h3>
                <p className="swiss-step-desc">{step.desc}</p>
              </div>

              <div className="swiss-step-code-box">
                <div className="swiss-code-header">
                  <span className="swiss-code-dot" />
                  <span className="swiss-code-lang">EXECUTION SPEC</span>
                </div>
                <code className="swiss-step-code">{step.code}</code>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
