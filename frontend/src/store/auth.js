/**
 * VeriGold — Auth Store (Phase 7 §7.2.2)
 *
 * Zustand store for lender authentication state.
 * Token stored in sessionStorage ONLY — never localStorage, never cookies.
 * Cleared automatically on tab/browser close.
 */

import { create } from 'zustand';

const TOKEN_KEY = 'vg_access_token';
const LENDER_KEY = 'vg_lender_profile';

/**
 * Read token from sessionStorage on startup (handles page refresh).
 * Sync the legacy global so the Axios interceptor still works.
 */
function readToken() {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

function persistToken(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
    window.__VG_AUTH_TOKEN__ = token;   // keep Axios interceptor in sync
    document.cookie = `vg_token=${token}; path=/; SameSite=Lax`;
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
    window.__VG_AUTH_TOKEN__ = null;
    document.cookie = 'vg_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  }
}

function readLender() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(LENDER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistLender(lender) {
  if (typeof window === 'undefined') return;
  if (lender) {
    sessionStorage.setItem(LENDER_KEY, JSON.stringify(lender));
  } else {
    sessionStorage.removeItem(LENDER_KEY);
  }
}

const initialToken = readToken();
const initialLender = readLender();

export const useAuthStore = create((set) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  isAuthenticated: !!initialToken,
  accessToken:     initialToken,
  lender:          initialLender,          // { msp_id, org_name, is_admin, ... }

  // ── Actions ────────────────────────────────────────────────────────────────
  /**
   * Called after successful JWT login.
   * @param {string} token - JWT access token
   * @param {object} lender - Lender profile from /api/auth/me
   */
  login(token, lender) {
    persistToken(token);
    persistLender(lender);
    set({ isAuthenticated: true, accessToken: token, lender });
  },

  /**
   * Clears all auth state. Called on logout or 401 response.
   */
  logout() {
    persistToken(null);
    persistLender(null);
    set({ isAuthenticated: false, accessToken: null, lender: null });
  },

  /**
   * Hydrate lender profile after initial load (e.g. page refresh with token).
   */
  setLender(lender) {
    persistLender(lender);
    set({ lender });
  },
}));

export default useAuthStore;
