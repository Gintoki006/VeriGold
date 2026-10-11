"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 30);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    document.body.classList.add("no-scroll");
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("no-scroll");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  return (
    <header className="swiss-nav-wrapper" id="header">
      <div className={`swiss-nav-pill ${scrolled ? "scrolled" : ""}`}>
        {/* Left: Brand Logo & Trademark */}
        <Link href="/" className="swiss-nav-brand" id="headerLogo" aria-label="VeriGold Home">
          <span className="swiss-nav-brand-text">VeriGold</span>
          <span className="swiss-nav-brand-tm" aria-hidden="true">™</span>
        </Link>

        {/* Center: Navigation Links */}
        <nav className="swiss-nav-links" id="headerNav" aria-label="Primary navigation">
          <a href="#features" className="swiss-nav-link">
            Features
          </a>
          <a href="#how-it-works" className="swiss-nav-link">
            How it works
          </a>
          <a href="#capabilities" className="swiss-nav-link">
            Capabilities
          </a>
          <a href="#faq" className="swiss-nav-link">
            FAQ
          </a>
        </nav>

        {/* Right: Theme Toggle, Sign in, and Pill CTA */}
        <div className="swiss-nav-actions">
          <ThemeToggle showLabel={false} className="swiss-theme-toggle" />
          <Link href="/auth" className="swiss-nav-signin">
            Sign in
          </Link>
          <Link href="/auth" className="swiss-btn-pill-cta" id="headerCta">
            Start Verifying
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="swiss-nav-mobile-toggle"
          id="menuToggle"
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobileNav"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className={`swiss-hamburger-line ${mobileMenuOpen ? "open-top" : ""}`} />
          <span className={`swiss-hamburger-line ${mobileMenuOpen ? "open-bottom" : ""}`} />
        </button>
      </div>

      {/* Accessible Mobile Navigation Drawer */}
      <nav
        id="mobileNav"
        className={`swiss-mobile-drawer ${mobileMenuOpen ? "open" : ""}`}
        aria-label="Mobile navigation"
        hidden={!mobileMenuOpen}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="swiss-mobile-drawer-inner">
          <div className="swiss-mobile-drawer-header">
            <span className="swiss-nav-brand-text">VeriGold</span>
            <span className="swiss-nav-brand-tm">™</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="swiss-mobile-close-btn"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <div className="swiss-mobile-nav-links">
            <a
              href="#features"
              className="swiss-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="swiss-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              How it works
            </a>
            <a
              href="#capabilities"
              className="swiss-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Capabilities
            </a>
            <a
              href="#faq"
              className="swiss-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              FAQ
            </a>
          </div>

          <div className="swiss-mobile-drawer-footer">
            <div className="swiss-mobile-theme-row">
              <span className="text-sm">Appearance</span>
              <ThemeToggle showLabel={true} />
            </div>
            <Link
              href="/auth"
              className="swiss-btn-pill-cta w-full text-center justify-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Start Verifying
            </Link>
            <Link
              href="/auth"
              className="swiss-nav-signin text-center block mt-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign in to account
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="swiss-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </header>
  );
}
