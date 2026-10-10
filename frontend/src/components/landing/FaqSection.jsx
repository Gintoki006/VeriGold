"use client";

import { useState } from "react";

export default function FaqSection() {
  const [activeIndex, setActiveIndex] = useState(null);

  const faqs = [
    {
      q: "How does VeriGold protect borrower privacy?",
      a: "Borrower identities are never stored in plaintext. The Aadhaar number is HMAC-SHA256 hashed with a server-side secret key before any processing. The hash is one-way and irreversible. Additionally, zero-knowledge proofs allow exposure verification without revealing actual loan amounts.",
    },
    {
      q: "What is the gold fingerprint system?",
      a: "Each gold item is characterized by its weight (quantized to 0.5g), purity (nearest karat), item type, dimensions, and an optional perceptual image hash. These attributes are canonicalized and SHA-256 hashed to create a unique fingerprint that can detect if the same gold is being pledged at multiple lenders.",
    },
    {
      q: "Can the AI lower a risk score?",
      a: "No. The deterministic rule engine owns the numeric risk score. The Gemini LLM can only escalate from REDUCE_AMOUNT to REJECT — it can never lower a score, override a rule decision, or independently set risk levels. This ensures consistent, auditable, and predictable risk assessments.",
    },
    {
      q: "Which blockchain does VeriGold use?",
      a: "VeriGold runs on Hyperledger Fabric — a permissioned, enterprise-grade blockchain. Unlike public chains, only enrolled and verified lender organizations can participate. There are no tokens, no gas fees, and no public exposure of transaction data. Lender identities are managed via Fabric CA with MSP credentials.",
    },
    {
      q: "What happens if the blockchain is unavailable?",
      a: "VeriGold returns HTTP 503 — it never fabricates, caches, or guesses a risk result. If the Fabric network is unreachable, the system explicitly tells the lender that verification is temporarily unavailable. Integrity over availability, always.",
    },
  ];

  const toggle = (idx) => {
    setActiveIndex(activeIndex === idx ? null : idx);
  };

  return (
    <section className="faq section" id="faq">
      <div className="container">
        <div className="faq__layout">
          <div className="faq__content">
            <div className="reveal">
              <h2
                className="section__title"
                style={{ textAlign: "left" }}
              >
                Frequently Asked Questions
              </h2>
            </div>

            <div className="faq__accordion reveal">
              {faqs.map((faq, idx) => {
                const isOpen = activeIndex === idx;
                return (
                  <div
                    key={idx}
                    className={`faq__item ${isOpen ? "active" : ""}`}
                  >
                    <button
                      className="faq__question"
                      id={`faq-btn-${idx}`}
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${idx}`}
                      onClick={() => toggle(idx)}
                    >
                      <span>{faq.q}</span>
                      <span className="faq__question-icon" aria-hidden="true">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          aria-hidden="true"
                        >
                          <path d="M12 5v14" />
                          <path d="M5 12h14" />
                        </svg>
                      </span>
                    </button>
                    <div
                      className="faq__answer"
                      id={`faq-answer-${idx}`}
                      role="region"
                      aria-labelledby={`faq-btn-${idx}`}
                    >
                      <p className="faq__answer-inner">{faq.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="faq__visual reveal">
            <div className="faq__support-card">
              <div className="faq__support-icon" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <h3 className="faq__support-title">Enterprise Security &amp; Compliance</h3>
              <p className="faq__support-desc">
                Have consortium architecture or regulatory questions? Review our full technical specification.
              </p>
              <a
                href="https://github.com/Gintoki006/VeriGold#readme"
                target="_blank"
                rel="noopener noreferrer"
                className="dash-btn dash-btn--sm dash-btn--ghost faq__support-btn"
              >
                Read Security Model <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
