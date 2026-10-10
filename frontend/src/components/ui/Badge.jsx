'use client';

/**
 * VeriGold — Badge Component (Phase 7 §7.1.2)
 *
 * Variants: low | medium | high | active | closed | neutral |
 *           velocity | gold_match | high_exposure | approve | reduce | reject
 */

const VARIANT_MAP = {
  low:          'badge--low',
  medium:       'badge--medium',
  high:         'badge--high',
  active:       'badge--active',
  closed:       'badge--closed',
  neutral:      'badge--neutral',
  gold:         'badge--gold',
  velocity:     'badge--velocity',
  gold_match:   'badge--gold_match',
  high_exposure:'badge--high_exposure',
  approve:      'badge--low',
  reduce:       'badge--medium',
  reject:       'badge--high',
};

const ICONS = {
  low:    '✓',
  medium: '~',
  high:   '!',
  active: '●',
  closed: '○',
  approve:'✓',
  reduce: '~',
  reject: '✗',
};

import { memo } from 'react';

function Badge({ variant = 'neutral', children, showIcon = false, style }) {
  const cls = VARIANT_MAP[variant?.toLowerCase()] ?? 'badge--neutral';
  const icon = showIcon ? ICONS[variant?.toLowerCase()] : null;

  return (
    <span className={`badge ${cls}`} style={style}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}

export default memo(Badge);
