'use client';

/**
 * VeriGold — Dashboard Navbar (Phase 7 §7.1.2)
 *
 * Top navigation bar for dashboard pages.
 * Shows current page title, lender identity pill, and logout shortcut.
 */

import useAuthStore from '@/store/auth';
import { Badge } from '@/components/ui';

export default function Navbar({ title = 'Dashboard', mobileMenuOpen = false, onToggleMobileMenu }) {
  const { lender } = useAuthStore();

  return (
    <header className="dash-navbar" role="banner">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {onToggleMobileMenu && (
          <button
            type="button"
            className="dash-mobile-nav-toggle"
            onClick={onToggleMobileMenu}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="dash-sidebar"
            id="dash-mobile-nav-toggle"
          >
            <span />
            <span />
            <span />
          </button>
        )}
        <h1 className="dash-navbar__title" id="dash-navbar-title">{title}</h1>
      </div>

      <div className="dash-navbar__right">
        {lender && (
          <div className="dash-lender-pill" aria-label="Connected lender">
            <span className="dash-lender-pill__dot" aria-hidden="true" />
            <span className="dash-lender-pill__name">{lender.org_name ?? lender.msp_id ?? 'Lender'}</span>
            {lender.is_admin && (
              <Badge
                variant="gold"
                style={{ marginLeft: '0.35rem', fontSize: '0.6875rem' }}
              >
                Admin
              </Badge>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
