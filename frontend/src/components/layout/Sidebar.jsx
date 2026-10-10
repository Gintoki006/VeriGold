'use client';

/**
 * VeriGold — Sidebar Component (Phase 7 §7.1.2)
 *
 * Dashboard sidebar with navigation links.
 * Highlights the active route.
 */

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useAuthStore from '@/store/auth';
import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    exact: true,
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M2 11l8-8 8 8v7a1 1 0 01-1 1h-4v-5H7v5H3a1 1 0 01-1-1v-7z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/pledges',
    label: 'My Pledges',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z" clipRule="evenodd" />
        <path d="M6 9h8v1H6V9zm0 2h5v1H6v-1z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/alerts',
    label: 'Alerts',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 002-2H8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/gold-appraisal',
    label: 'Gold Appraisal',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 1l2.928 5.94L19 7.94l-4.5 4.384 1.063 6.194L10 15.5l-5.563 3.018L5.5 12.324 1 7.94l6.072-1L10 1z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: '/dashboard/zk-proof',
    label: 'ZK Proof Demo',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
  },
];

export default function Sidebar({ open = false, onClose }) {
  const pathname  = usePathname();
  const { lender, logout } = useAuthStore();
  const router    = useRouter();
  const sidebarRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    document.body.classList.add('no-scroll');

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (onClose) onClose();
        const toggleBtn = document.getElementById('dash-mobile-nav-toggle');
        if (toggleBtn) toggleBtn.focus();
        return;
      }

      if (e.key === 'Tab' && sidebarRef.current) {
        const focusables = sidebarRef.current.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Initial focus on close button or brand link
    const timer = setTimeout(() => {
      const initialFocus =
        sidebarRef.current?.querySelector('.dash-sidebar__close-btn') ||
        sidebarRef.current?.querySelector('.dash-sidebar__brand-link');
      if (initialFocus) initialFocus.focus();
    }, 50);

    return () => {
      clearTimeout(timer);
      document.body.classList.remove('no-scroll');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  function isActive(item) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  async function handleLogout() {
    if (onClose) onClose();
    logout();
    router.push('/auth');
  }

  function handleLinkClick() {
    if (onClose) onClose();
    const toggleBtn = document.getElementById('dash-mobile-nav-toggle');
    if (toggleBtn && open) toggleBtn.focus();
  }

  return (
    <aside
      ref={sidebarRef}
      id="dash-sidebar"
      className={`dash-sidebar ${open ? 'open' : ''}`}
      aria-label="Dashboard navigation"
      aria-modal={open ? 'true' : undefined}
      role={open ? 'dialog' : undefined}
    >
      {/* Brand */}
      <div className="dash-sidebar__brand">
        <Link href="/dashboard" className="dash-sidebar__brand-link" onClick={handleLinkClick}>
          <div className="dash-sidebar__brand-icon" aria-hidden="true">VG</div>
          <span className="dash-sidebar__brand-name">VeriGold</span>
        </Link>
        {onClose && (
          <button
            type="button"
            className="dash-sidebar__close-btn"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <span aria-hidden="true">✕</span>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="dash-sidebar__nav" aria-label="Main">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`dash-sidebar__link ${isActive(item) ? 'active' : ''}`}
            aria-current={isActive(item) ? 'page' : undefined}
            onClick={handleLinkClick}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}

        {lender?.is_admin && (
          <Link
            href="/admin"
            className={`dash-sidebar__link ${pathname === '/admin' ? 'active' : ''}`}
            aria-current={pathname === '/admin' ? 'page' : undefined}
            onClick={handleLinkClick}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            Admin
          </Link>
        )}
      </nav>

      {/* Footer / Logout */}
      <div className="dash-sidebar__footer">
        <button
          id="sidebar-logout-btn"
          className="dash-sidebar__link"
          style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: 'none', border: 'none', font: 'inherit' }}
          onClick={handleLogout}
          aria-label="Log out of VeriGold"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
            <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
          </svg>
          Log Out
        </button>
      </div>
    </aside>
  );
}
