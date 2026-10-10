'use client';

/**
 * VeriGold — HashDisplay Component
 *
 * Monospace representation of cryptographic hashes, Fabric transaction IDs,
 * and borrower identities with safe truncation and one-click copy functionality.
 */

import CopyButton from './CopyButton';
import { truncateHash } from '@/lib/formatters';

export default function HashDisplay({
  value,
  label,
  truncate = false,
  startChars = 8,
  endChars = 8,
  copyable = true,
  id,
  className = '',
  ...props
}) {
  if (!value) {
    return <span className="dash-text-faint">—</span>;
  }

  const displayedText = truncate ? truncateHash(value, startChars, endChars) : value;

  return (
    <div className={`dash-hash-display ${className}`.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', maxWidth: '100%' }} {...props}>
      {label && <span className="dash-label" style={{ fontSize: '0.75rem', marginRight: '0.25rem' }}>{label}</span>}
      <code
        id={id}
        className="dash-table__hash"
        title={value}
        style={{ maxWidth: truncate ? 'none' : '16rem' }}
      >
        {displayedText}
      </code>
      {copyable && (
        <CopyButton
          text={value}
          ariaLabel={`Copy ${label || 'hash'} ${value.slice(0, 8)}`}
        />
      )}
    </div>
  );
}
