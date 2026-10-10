export default function BenefitsSection() {
  return (
    <section className="benefits section" id="benefits">
      <div className="container">
        <div className="section__header reveal">
          <h2 className="section__title">
            Built on Trust, Not on Shared Secrets
          </h2>
          <p className="section__subtitle">
            Four layers of protection ensure no lender&apos;s private data is
            ever exposed, while every lender gets the risk signal they need.
          </p>
        </div>

        <div className="benefits__layout">
          <div className="benefits__column reveal">
            <div className="benefits__item">
              <div className="benefits__item-icon">
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
              <h3 className="benefits__item-name">HMAC-SHA256 Identity</h3>
              <p className="benefits__item-desc">
                Borrower Aadhaar is hashed with a server-side pepper. The
                plaintext never leaves the API call. Even we can&apos;t reverse it.
              </p>
            </div>

            <div className="benefits__item">
              <div className="benefits__item-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                </svg>
              </div>
              <h3 className="benefits__item-name">Hyperledger Fabric Ledger</h3>
              <p className="benefits__item-desc">
                Every pledge is recorded on a permissioned blockchain. No single
                lender controls the data. Tamper-proof, auditable, decentralized.
              </p>
            </div>
          </div>

          <div className="benefits__media reveal" aria-hidden="true">
            <div className="benefits__vault-emblem">
              <div className="benefits__vault-ring benefits__vault-ring--outer" />
              <div className="benefits__vault-ring benefits__vault-ring--mid" />
              <div className="benefits__vault-core">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <circle cx="12" cy="11" r="3" />
                  <path d="M12 14v3" />
                </svg>
                <span className="benefits__vault-label">4-Tier Security Moat</span>
              </div>
            </div>
          </div>

          <div className="benefits__column reveal">
            <div className="benefits__item">
              <div className="benefits__item-icon">
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
              <h3 className="benefits__item-name">Hybrid AI Risk Engine</h3>
              <p className="benefits__item-desc">
                Rule-based scoring is authoritative. Gemini LLM adds
                natural-language insight — but can only escalate risk, never
                reduce it.
              </p>
            </div>

            <div className="benefits__item">
              <div className="benefits__item-icon">
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
              <h3 className="benefits__item-name">Zero-Knowledge Proof</h3>
              <p className="benefits__item-desc">
                Prove that total exposure is below a threshold — without
                revealing the actual exposure amount. Mathematical certainty,
                zero data leakage.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
