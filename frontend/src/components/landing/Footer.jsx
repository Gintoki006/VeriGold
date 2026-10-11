"use client";

import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="swiss-footer" id="footer">
      <div className="swiss-container">
        <div className="swiss-footer-grid">
          {/* Brand Info */}
          <div className="swiss-footer-brand-col">
            <Link href="/" className="swiss-nav-brand inline-flex items-baseline">
              <span className="swiss-nav-brand-text">VeriGold</span>
              <span className="swiss-nav-brand-tm">™</span>
            </Link>
            <p className="swiss-footer-desc">
              India&apos;s privacy-preserving cross-lender gold loan registry.
              Verify borrower exposure and detect multi-pledge fraud without exposing a single byte of plaintext private data.
            </p>
            <div className="swiss-footer-status-pill">
              <span className="swiss-status-dot active" />
              <span>Consortium Network Operational</span>
            </div>
          </div>

          {/* Links Column 1: Platform */}
          <div className="swiss-footer-col">
            <h4 className="swiss-footer-col-title">PLATFORM</h4>
            <ul className="swiss-footer-links">
              <li>
                <a href="#about" className="swiss-footer-link">
                  About
                </a>
              </li>
              <li>
                <a href="#features" className="swiss-footer-link">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="swiss-footer-link">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#capabilities" className="swiss-footer-link">
                  Capabilities
                </a>
              </li>
              <li>
                <a href="#comparison" className="swiss-footer-link">
                  Comparison
                </a>
              </li>
              <li>
                <a href="#faq" className="swiss-footer-link">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Links Column 2: Technology */}
          <div className="swiss-footer-col">
            <h4 className="swiss-footer-col-title">TECHNOLOGY</h4>
            <ul className="swiss-footer-links">
              <li>
                <a href="#capabilities" className="swiss-footer-link">
                  Hyperledger Fabric
                </a>
              </li>
              <li>
                <a href="#capabilities" className="swiss-footer-link">
                  HMAC-SHA256 Privacy
                </a>
              </li>
              <li>
                <a href="#capabilities" className="swiss-footer-link">
                  Zero-Knowledge Proofs
                </a>
              </li>
              <li>
                <a href="#capabilities" className="swiss-footer-link">
                  Hybrid AI Risk Engine
                </a>
              </li>
            </ul>
          </div>

          {/* Links Column 3: Institutional Access */}
          <div className="swiss-footer-col">
            <h4 className="swiss-footer-col-title">INSTITUTIONS</h4>
            <ul className="swiss-footer-links">
              <li>
                <Link href="/auth" className="swiss-footer-link">
                  Lender Portal Login
                </Link>
              </li>
              <li>
                <Link href="/auth" className="swiss-footer-link">
                  Request Consortium Access
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="swiss-footer-link">
                  Console Dashboard
                </Link>
              </li>
              <li>
                <Link href="/admin" className="swiss-footer-link">
                  Consortium Admin
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Standards */}
        <div className="swiss-footer-bottom">
          <div className="swiss-footer-copyright">
            © {currentYear} VeriGold Technologies Pvt. Ltd. All rights reserved.
          </div>
          <div className="swiss-footer-legal">
            <span>RBI Gold Loan Norms Compliant</span>
            <span className="swiss-dot-sep">•</span>
            <span>AES-256 / SHA-256 Encryption</span>
            <span className="swiss-dot-sep">•</span>
            <span>Zero-Knowledge Proof Architecture</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
