'use client';

/**
 * VeriGold — CopyButton Component
 *
 * Accessible, resilient copy-to-clipboard button with visual feedback:
 * - Uses hardened copyToClipboard utility (with execCommand fallback)
 * - Auto-resets "Copied" feedback state after 2 seconds
 * - Full WCAG 2.1 AA touch-target compliance
 */

import { useState } from 'react';
import { copyToClipboard } from '@/lib/formatters';

export default function CopyButton({
  text,
  ariaLabel = 'Copy to clipboard',
  showText = false,
  className = '',
  onCopy,
  ...props
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e) {
    e.stopPropagation();
    if (!text) return;

    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      if (onCopy) onCopy(text);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      type="button"
      className={`dash-table__copy ${copied ? 'dash-table__copy--copied' : ''} ${className}`.trim()}
      onClick={handleCopy}
      aria-label={copied ? 'Copied to clipboard' : ariaLabel}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
      {...props}
    >
      <span aria-hidden="true" style={{ fontSize: copied ? '0.75rem' : '0.8rem', lineHeight: 1 }}>
        {copied ? '✓' : '⎘'}
      </span>
      {showText && (
        <span style={{ marginLeft: '0.35rem', fontSize: '0.75rem' }}>
          {copied ? 'Copied' : 'Copy'}
        </span>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </button>
  );
}
