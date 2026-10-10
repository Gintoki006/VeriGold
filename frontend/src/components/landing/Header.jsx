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
          setScrolled(window.scrollY > 50);
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
    <header className={`header ${scrolled ? "scrolled" : ""}`} id="header">
      <div className="container header__inner">
        <Link href="/" className="header__logo" id="headerLogo">
          <span className="header__logo-icon" aria-hidden="true">VG</span>
          <span style={{ fontWeight: 800, fontSize: "1.25rem", color: "var(--gold-dark)", letterSpacing: "-0.02em" }}>VeriGold</span>
        </Link>

        <nav className="header__nav" id="headerNav" aria-label="Primary navigation">
          <a href="#about" className="header__nav-link">
            About
          </a>
          <a href="#benefits" className="header__nav-link">
            Benefits
          </a>
          <a href="#how-it-works" className="header__nav-link">
            How It Works
          </a>
          <a href="#faq" className="header__nav-link">
            FAQ
          </a>
          <ThemeToggle style={{ marginRight: '0.25rem' }} />
          <Link href="/auth" className="header__cta">
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
        </nav>

        <button
          className="header__menu-toggle"
          id="menuToggle"
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobileNav"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Mobile Drawer */}
      <nav
        id="mobileNav"
        className={`mobile-nav ${mobileMenuOpen ? "open" : ""}`}
        aria-label="Mobile navigation"
        hidden={!mobileMenuOpen}
        aria-hidden={!mobileMenuOpen}
      >
        <a
          href="#about"
          className="header__nav-link"
          onClick={() => setMobileMenuOpen(false)}
        >
          About
        </a>
        <a
          href="#benefits"
          className="header__nav-link"
          onClick={() => setMobileMenuOpen(false)}
        >
          Benefits
        </a>
        <a
          href="#how-it-works"
          className="header__nav-link"
          onClick={() => setMobileMenuOpen(false)}
        >
          How It Works
        </a>
        <a
          href="#faq"
          className="header__nav-link"
          onClick={() => setMobileMenuOpen(false)}
        >
          FAQ
        </a>
        <Link
          href="/auth"
          className="btn btn--primary"
          style={{ width: "100%", marginTop: "0.5rem" }}
          onClick={() => setMobileMenuOpen(false)}
        >
          Get Started
        </Link>
      </nav>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="mobile-nav-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </header>
  );
}
