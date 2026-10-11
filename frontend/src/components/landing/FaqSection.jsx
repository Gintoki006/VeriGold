"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

export default function FaqSection() {
  const [activeIndex, setActiveIndex] = useState(null);

  const faqs = [
    {
      q: "How does VeriGold protect borrower privacy?",
      a: "Borrower identities are never stored in plaintext. The Aadhaar number is HMAC-SHA256 hashed with a consortium pepper before transmission. The hash is mathematically one-way and irreversible. Additionally, zero-knowledge proofs allow exposure verification without revealing actual loan amounts.",
    },
    {
      q: "What is the gold fingerprint system?",
      a: "Each gold item is characterized by its weight (quantized to 0.5g), purity (nearest karat), item type, dimensions, and an optional perceptual image hash. These attributes are canonicalized and SHA-256 hashed to create a unique fingerprint that flags duplicate collateral across lenders.",
    },
    {
      q: "Can the AI lower a risk score?",
      a: "No. The deterministic rule engine owns the numeric risk score. The Gemini LLM can only escalate from REDUCE_AMOUNT to REJECT — it can never lower a score, override a rule decision, or independently approve risk. This ensures consistent, auditable, and predictable risk assessments.",
    },
    {
      q: "Which blockchain does VeriGold use?",
      a: "VeriGold runs on Hyperledger Fabric — a permissioned, enterprise-grade blockchain. Unlike public chains, only enrolled and verified lender organizations can participate. There are no public tokens, no gas fees, and no public exposure of transaction data. Lender identities are cryptographically managed via Fabric CA.",
    },
    {
      q: "What happens if the blockchain network is unreachable?",
      a: "VeriGold returns HTTP 503 — it never fabricates, caches, or guesses a risk result. If the Fabric network is unreachable, the system explicitly alerts the lender that verification is temporarily unavailable. Cryptographic integrity over availability, always.",
    },
  ];

  const toggle = (idx) => {
    setActiveIndex(activeIndex === idx ? null : idx);
  };

  return (
    <section className="swiss-faq-section" id="faq">
      <div className="swiss-container">
        <div className="swiss-section-header">
          <div className="swiss-eyebrow">
            <span className="swiss-eyebrow-dash" aria-hidden="true" />
            <span className="swiss-eyebrow-text">FAQ</span>
          </div>

          <h2 className="swiss-section-title">
            Frequently Asked Questions.
            <br />
            <span className="swiss-title-muted">Clear answers on cryptography and consensus.</span>
          </h2>
        </div>

        <div className="swiss-faq-accordion">
          {faqs.map((faq, idx) => {
            const isOpen = activeIndex === idx;
            const num = String(idx + 1).padStart(2, "0");

            return (
              <div key={idx} className="swiss-faq-item">
                <button
                  type="button"
                  className="swiss-faq-question-btn"
                  id={`faq-btn-${idx}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${idx}`}
                  onClick={() => toggle(idx)}
                >
                  <div className="flex items-center gap-4">
                    <span className="swiss-faq-num">{num}</span>
                    <span className="swiss-faq-q-text">{faq.q}</span>
                  </div>
                  <span className="swiss-faq-icon-wrap" aria-hidden="true">
                    {isOpen ? (
                      <Minus className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
                    ) : (
                      <Plus className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                    )}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-answer-${idx}`}
                      role="region"
                      aria-labelledby={`faq-btn-${idx}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="swiss-faq-answer">
                        <p>{faq.a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
