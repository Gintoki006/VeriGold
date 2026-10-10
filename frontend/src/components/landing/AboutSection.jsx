import Image from "next/image";

export default function AboutSection() {
  return (
    <section className="about section" id="about">
      <div className="container">
        <div className="about__grid">
          <div className="about__visual reveal">
            <div className="about__coin-glow" />
            <Image
              src="/coin.webp"
              alt="VeriGold gold medallion verification collateral"
              width={384}
              height={384}
              sizes="(max-width: 768px) 280px, 384px"
              className="about__coin"
              loading="lazy"
            />
          </div>

          <div className="about__content reveal">
            <span className="about__label">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              The Problem We Solve
            </span>

            <h2 className="about__title">
              Lenders operate in silos. That&apos;s a systemic risk.
            </h2>

            <p className="about__text">
              In India&apos;s ₹8 lakh crore gold loan market, a borrower can
              pledge the{" "}
              <strong>same gold ornament across multiple lenders simultaneously</strong>{" "}
              — and no institution is aware. There is no shared registry, no
              cross-lender visibility, no equivalent of a credit bureau for gold.
            </p>

            <p className="about__text">
              VeriGold resolves this gap. Lenders can{" "}
              <strong>verify borrower exposure</strong> across the network
              without accessing any other lender&apos;s data — not the loan
              amount, not the borrower identity, not the collateral details.
              Only a{" "}
              <strong>cryptographic confirmation of whether exposure exists</strong>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
