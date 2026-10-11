'use client';

/**
 * VeriGold — Protected Layout (Phase 7 §7.1.2)
 *
 * Wraps all /dashboard and /admin pages.
 * Checks auth state on mount; redirects to /auth if not authenticated.
 * On first render with a token, hydrates lender profile from /api/auth/me.
 */

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Navbar  from './Navbar';
import useAuthStore from '@/store/auth';
import api from '@/lib/api';

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export default function ProtectedLayout({ children, title }) {
  const { isAuthenticated, accessToken, lender, setLender, logout } = useAuthStore();
  const router = useRouter();
  const isMounted = useMounted();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMounted) return;

    if (!isAuthenticated || !accessToken) {
      router.replace(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    // Hydrate lender profile if not yet loaded (e.g. cold start with token)
    if (!lender) {
      api.get('/api/auth/me')
        .then((res) => {
          setLender(res.data);
        })
        .catch(() => {
          // Token invalid or expired — clear auth state and redirect to /auth
          logout();
          router.replace(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
        });
    }
  }, [isMounted, isAuthenticated, accessToken, lender, logout, router, setLender]);

  useEffect(() => {
    const handleUnauthorized = (e) => {
      const redirectUrl = e?.detail?.redirect || `/auth?redirect=${encodeURIComponent(window.location.pathname)}`;
      router.replace(redirectUrl);
    };
    window.addEventListener('vg:auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('vg:auth:unauthorized', handleUnauthorized);
  }, [router]);

  if (!isMounted || !isAuthenticated || !accessToken) {
    return (
      <div className="dash-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="dash-spinner">
          <div className="dash-spinner__ring" aria-label="Loading dashboard…" role="status" />
        </div>
      </div>
    );
  }

  return (
    <div className="dash-layout">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="dash-sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className="dash-main">
        <Navbar
          title={title}
          mobileMenuOpen={mobileMenuOpen}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main className="dash-page dash-page-enter" aria-labelledby="dash-navbar-title">
          {children}
        </main>
      </div>
    </div>
  );
}
