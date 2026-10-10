/**
 * VeriGold — Formatting & Localization Utilities
 *
 * Robust, production-hardened formatters with error boundaries and locale awareness:
 * - Indian Rupee currency (INR) formatting (Lakhs / Crores)
 * - Safe datetime formatting with Invalid Date guards
 * - Hash truncation for compact tables and mobile screens
 * - Physical gold metrics (weight & karat purity)
 */

/**
 * Format timestamp or ISO date string safely using Indian locale (en-IN).
 * Never throws on invalid dates, null, or undefined.
 *
 * @param {string | number | Date | null | undefined} dateInput
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string} Formatted date string or fallback dash
 */
export function formatDate(dateInput, options = {}) {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';

    const defaultOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      ...options,
    };

    return new Intl.DateTimeFormat('en-IN', defaultOptions).format(d);
  } catch {
    return '—';
  }
}

/**
 * Format Indian Rupee currency with proper grouping (e.g. ₹1,50,000).
 *
 * @param {number | string | null | undefined} amount
 * @param {boolean} [showDecimals=false]
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, showDecimals = false) {
  if (amount === null || amount === undefined || amount === '') return '₹0';
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/,/g, ''));
  if (isNaN(num)) return '₹0';

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: showDecimals ? 2 : 0,
      minimumFractionDigits: showDecimals ? 2 : 0,
    }).format(num);
  } catch {
    return `₹${num.toLocaleString()}`;
  }
}

/**
 * Safely truncate a 64-character hash with ellipsis.
 *
 * @param {string | null | undefined} hash
 * @param {number} [startChars=8]
 * @param {number} [endChars=8]
 * @returns {string}
 */
export function truncateHash(hash, startChars = 8, endChars = 8) {
  if (!hash || typeof hash !== 'string') return '—';
  const clean = hash.trim();
  if (clean.length <= startChars + endChars + 2) return clean;
  return `${clean.slice(0, startChars)}…${clean.slice(-endChars)}`;
}

/**
 * Format gold weight in grams.
 *
 * @param {number | string | null | undefined} weight
 * @returns {string} e.g. "22.50 g"
 */
export function formatGoldWeight(weight) {
  if (weight === null || weight === undefined || weight === '') return '—';
  const num = typeof weight === 'number' ? weight : parseFloat(weight);
  if (isNaN(num) || num <= 0) return '—';
  return `${num.toFixed(2)} g`;
}

/**
 * Map purity percentage to Karat notation if applicable.
 *
 * @param {number | string | null | undefined} purityPercent
 * @returns {string} e.g. "91.6% (22K)" or "99.9% (24K)"
 */
export function formatGoldPurity(purityPercent) {
  if (purityPercent === null || purityPercent === undefined || purityPercent === '') return '—';
  const num = typeof purityPercent === 'number' ? purityPercent : parseFloat(purityPercent);
  if (isNaN(num) || num <= 0) return '—';

  let karatLabel = '';
  if (num >= 99.5) karatLabel = '24K';
  else if (num >= 91.0) karatLabel = '22K';
  else if (num >= 75.0) karatLabel = '18K';
  else if (num >= 58.0) karatLabel = '14K';

  return karatLabel ? `${num.toFixed(1)}% (${karatLabel})` : `${num.toFixed(1)}%`;
}

/**
 * Robust clipboard copy with fallback for older browsers or non-HTTPS contexts.
 *
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back to document.execCommand below
  }

  try {
    if (typeof document === 'undefined') return false;
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    el.style.top = '-9999px';
    document.body.appendChild(el);
    el.select();
    const success = document.execCommand('copy');
    document.body.removeChild(el);
    return success;
  } catch {
    return false;
  }
}
