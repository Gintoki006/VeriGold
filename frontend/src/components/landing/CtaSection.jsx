import Link from "next/link";

export default function CtaSection() {
  return (
    <section className="cta section" id="cta">
      <div className="container">
        <div className="cta__inner reveal">
          <h2 className="cta__title">
            Zero Data Leakage.
            <br />
            Absolute Lending Certainty.
          </h2>

          <p className="cta__text">
            Join a network of lenders with cross-institutional visibility,
            built on cryptographic privacy and an immutable audit trail.
          </p>

          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <Link href="/auth" className="btn btn--primary">
              Get Started
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
        </div>
      </div>
    </section>
  );
}
