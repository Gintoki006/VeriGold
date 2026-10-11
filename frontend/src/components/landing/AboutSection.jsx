"use client";

import Image from "next/image";

export default function AboutSection() {
  return (
    <section className="swiss-about-section" id="about">
      <div className="swiss-container">
        <div className="swiss-about-grid">
          {/* Visual Column */}
          <div className="swiss-about-visual">
            <div className="swiss-about-coin-frame">
              <Image
                src="/coin-modern.jpg"
                alt="VeriGold gold medallion verification collateral"
                width={360}
                height={360}
                sizes="(max-width: 768px) 260px, 360px"
                className="swiss-about-coin-img"
                priority
              />
            </div>
          </div>

          {/* Editorial Content Column */}
          <div className="swiss-about-content">
            <div className="swiss-eyebrow">
              <span className="swiss-eyebrow-dash" aria-hidden="true" />
              <span className="swiss-eyebrow-text">The Problem We Solve</span>
            </div>

            <h2 className="swiss-about-title">
              Lenders operate in silos.
              <br />
              <span className="swiss-title-muted">That&apos;s a systemic risk.</span>
            </h2>

            <div className="swiss-about-body">
              <p className="swiss-about-p">
                In India&apos;s ₹8 lakh crore gold loan market, a borrower can pledge the{" "}
                <strong className="text-neutral-900 dark:text-neutral-100 font-medium">
                  same gold ornament across multiple lenders simultaneously
                </strong>{" "}
                — and no institution is aware. There is no shared registry, no cross-lender
                visibility, and no equivalent of a credit bureau for gold.
              </p>

              <p className="swiss-about-p">
                VeriGold resolves this systemic gap. Lenders can{" "}
                <strong className="text-neutral-900 dark:text-neutral-100 font-medium">
                  verify borrower exposure
                </strong>{" "}
                across the network without accessing any other lender&apos;s data — not the loan
                amount, not the borrower identity, not the collateral details. Only a{" "}
                <strong className="text-neutral-900 dark:text-neutral-100 font-medium">
                  cryptographic confirmation of whether exposure exists
                </strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
