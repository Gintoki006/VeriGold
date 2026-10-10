/**
 * VeriGold — Axios HTTP Client (Phase 0.6.3)
 *
 * Singleton Axios instance wired to the backend API.
 *
 * Request interceptor:
 *   - Attaches Authorization: Bearer <jwt> from the auth store on every request.
 *
 * Response interceptors:
 *   - 401: JWT expired or invalid → clear auth store, redirect to /auth
 *   - 429: Rate limit hit → surface actionable error message
 *   - 503: Fabric node unavailable → surface Decision 11 error message
 *   - All other errors: re-throw so React Query / caller handles them
 */

import axios from 'axios';
import useAuthStore from '@/store/auth';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Request interceptor — attach JWT
// ---------------------------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    // Read from the canonical sessionStorage key used by the Zustand auth store.
    // Falls back to the legacy global set by older code.
    if (typeof window !== 'undefined') {
      const token =
        sessionStorage.getItem('vg_access_token') ??
        window.__VG_AUTH_TOKEN__ ??
        null;
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRedirecting = false;

// ---------------------------------------------------------------------------
// Response interceptor — handle known error codes
// ---------------------------------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // JWT expired or revoked — clear client state across storage, cookies, and globals
      if (typeof window !== 'undefined') {
        try {
          useAuthStore.getState().logout();
        } catch {
          sessionStorage.removeItem('vg_access_token');
          window.__VG_AUTH_TOKEN__ = null;
          document.cookie = 'vg_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        }

        if (!window.location.pathname.startsWith('/auth') && !isRedirecting) {
          isRedirecting = true;
          const currentPath = window.location.pathname + window.location.search;
          const targetUrl = `/auth?redirect=${encodeURIComponent(currentPath)}`;

          // Dispatch auth event so active Next.js layouts can trigger soft navigation
          window.dispatchEvent(
            new CustomEvent('vg:auth:unauthorized', { detail: { redirect: targetUrl } })
          );

          // Graceful fallback replace only if soft routing was not handled
          setTimeout(() => {
            if (!window.location.pathname.startsWith('/auth')) {
              window.location.replace(targetUrl);
            }
            isRedirecting = false;
          }, 300);
        }
      }
      return Promise.reject(new Error('Session expired. Please log in again.'));
    }

    if (status === 429) {
      return Promise.reject(
        new Error(
          'Rate limit exceeded. You have made too many requests. Please wait before retrying.'
        )
      );
    }

    if (status === 503) {
      // Decision 11: Fabric unavailable — surface specific message, never fabricate
      return Promise.reject(
        new Error(
          'The Hyperledger Fabric network is temporarily unavailable. ' +
          'Your query has not been submitted. Please try again in a few minutes.'
        )
      );
    }

    // Re-throw all other errors with the backend detail message if available
    const detail = error.response?.data?.detail;
    if (detail) {
      if (Array.isArray(detail)) {
        const msg = detail
          .map((d) => d.msg || d.message || JSON.stringify(d))
          .join('; ');
        return Promise.reject(new Error(msg));
      }
      if (typeof detail === 'object') {
        return Promise.reject(new Error(detail.msg || JSON.stringify(detail)));
      }
      return Promise.reject(new Error(detail));
    }

    // Network offline or server unreachable
    if (
      error.code === 'ERR_NETWORK' ||
      error.message === 'Network Error' ||
      (typeof window !== 'undefined' && !window.navigator.onLine)
    ) {
      return Promise.reject(
        new Error(
          'Network connection error: Unable to reach the VeriGold server. Please verify your connection.'
        )
      );
    }

    // Timeout
    if (error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'))) {
      return Promise.reject(
        new Error('Request timed out. The server is taking too long to respond. Please check your connection or retry.')
      );
    }

    if (status === 403) {
      return Promise.reject(new Error('Access denied. You do not have permission for this resource.'));
    }

    if (status === 404) {
      return Promise.reject(new Error('The requested record or resource was not found.'));
    }

    if (status && status >= 500) {
      return Promise.reject(new Error('A server error occurred. Our engineers have been alerted. Please retry shortly.'));
    }

    return Promise.reject(new Error(error.message || 'An unexpected error occurred. Please try again.'));
  }
);

export default api;
