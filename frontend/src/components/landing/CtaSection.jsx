"use client";

import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";

export default function CtaSection({ onOpenDemo }) {
  return (
    <section className="swiss-cta-section" id="cta">
      <div className="swiss-container">
        <div className="swiss-cta-box">
          <div className="swiss-eyebrow justify-center mb-6">
            <span className="swiss-eyebrow-dash" aria-hidden="true" />
            <span className="swiss-eyebrow-text">Consortium Enrollment</span>
            <span className="swiss-eyebrow-dash" aria-hidden="true" />
          </div>

          <h2 className="swiss-cta-title">
            <span className="block">Verify before</span>
            <span className="block swiss-title-muted">you sanction.</span>
          </h2>

          <p className="swiss-cta-subtitle">
            Zero data leakage. Millisecond consensus. Stop operating in isolated silos and start
            protecting your loan portfolio with India&apos;s privacy-first cross-lender gold loan registry.
          </p>

          <div className="swiss-cta-buttons">
            <Link href="/auth" className="swiss-btn-primary" id="ctaPrimaryBtn">
              <span>Start Verifying</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={onOpenDemo || (() => {
                const el = document.getElementById("how-it-works");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              })}
              className="swiss-btn-secondary"
              id="ctaSecondaryBtn"
            >
              <Play className="w-3.5 h-3.5 fill-current opacity-70" />
              <span>Watch Demo</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
