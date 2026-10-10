"use client";

import Link from "next/link";
import HeroCanvas from "./HeroCanvas";

export default function Hero({ animate }) {
  const animClass = animate ? "animate" : "";

  return (
    <section className="hero" id="hero">
      <div className="hero__bg">
        <HeroCanvas />
      </div>

      <div className="container hero__inner">
        <div className="hero__content">
          <div className={`hero__badge ${animClass}`} id="heroBadge">
            <span className="hero__badge-dot" />
            Privacy-First Gold Loan Registry
          </div>

          <h1 className={`hero__title ${animClass}`} id="heroTitle">
            <span className="hero__title-line">Verify Before</span>
            <span className="hero__title-line">You Lend.</span>
          </h1>

          <p className={`hero__subtitle ${animClass}`} id="heroSubtitle">
            India&apos;s cross-lender gold loan registry. Detect duplicate
            pledges and assess borrower exposure across every lender — without
            exposing a single byte of private data.
          </p>

          <div className={`hero__actions ${animClass}`} id="heroActions">
            <Link href="/auth" className="btn btn--primary">
              Start Verifying
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M7 17L17 7" />
                <path d="M7 7h10v10" />
              </svg>
            </Link>
            <a href="#how-it-works" className="btn btn--outline">
              <span className="btn-text">Learn How It Works</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M7 17L17 7" />
                <path d="M7 7h10v10" />
              </svg>
            </a>
          </div>

          <div className={`hero__benefits ${animClass}`} id="heroBenefits">
            <div className="hero__benefit">
              <div className="hero__benefit-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>
              <span className="hero__benefit-text">Privacy-First HMAC</span>
            </div>

            <div className="hero__benefit">
              <div className="hero__benefit-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <span className="hero__benefit-text">Hyperledger Fabric</span>
            </div>

            <div className="hero__benefit">
              <div className="hero__benefit-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                </svg>
              </div>
              <span className="hero__benefit-text">AI Risk Scoring</span>
            </div>

            <div className="hero__benefit">
              <div className="hero__benefit-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="hero__benefit-text">Zero-Knowledge Proof</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
