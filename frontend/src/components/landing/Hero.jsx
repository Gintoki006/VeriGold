"use client";

import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";

export default function Hero({ onOpenDemo }) {
  return (
    <section className="swiss-hero" id="hero">
      <div className="swiss-container swiss-hero-container">
        <div className="swiss-hero-content">
          {/* Eyebrow Label tailored to VeriGold */}
          <div className="swiss-eyebrow" id="heroEyebrow">
            <span className="swiss-eyebrow-dash" aria-hidden="true" />
            <span className="swiss-eyebrow-text">India&apos;s Cross-Lender Gold Loan Registry</span>
          </div>

          {/* Oversized Editorial Headline */}
          <h1 className="swiss-hero-title" id="heroTitle">
            <span className="swiss-hero-title-line">Verify before</span>
            <span className="swiss-hero-title-line">you lend.</span>
          </h1>

          {/* Hero Lower Row: VeriGold value proposition on left, CTAs on right */}
          <div className="swiss-hero-lower">
            <div className="swiss-hero-desc-wrap">
              <p className="swiss-hero-description" id="heroSubtitle">
                Detect duplicate pledges and verify borrower exposure across India&apos;s ₹8L Cr gold loan
                market in under 10 seconds — without exposing a single byte of private customer data.
              </p>
              <div className="swiss-hero-subnote">
                <span className="swiss-status-dot" />
                <span>HMAC-SHA256 Identity • Hyperledger Fabric Consensus • Gold Fingerprinting • ZK Proofs</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="swiss-hero-actions" id="heroActions">
              <Link href="/auth" className="swiss-btn-primary" id="heroPrimaryCta">
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
                id="heroSecondaryCta"
              >
                <Play className="w-3.5 h-3.5 fill-current opacity-70" />
                <span>Watch Demo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
