'use client';

/**
 * VeriGold — StatCard Component
 *
 * Metric summary card used across lender and admin dashboards.
 *
 * Variants:
 * - gold: Primary accent metric
 * - success: Positive or active inventory metric
 * - danger: Urgent high-risk or anomaly metric
 * - neutral: Secondary baseline metric
 */

import { memo } from 'react';

function StatCard({
  label,
  value,
  delta,
  variant = 'gold',
  loading = false,
  className = '',
  ...props
}) {
  const variantClass =
    variant === 'danger'
      ? 'dash-stat--danger'
      : variant === 'success'
      ? 'dash-stat--success'
      : variant === 'gold'
      ? 'dash-stat--gold'
      : variant === 'neutral'
      ? 'dash-stat--neutral'
      : '';

  return (
    <div className={`dash-stat ${variantClass} ${className}`.trim()} {...props}>
      <span className="dash-stat__label">{label}</span>
      <span className="dash-stat__value">
        {loading ? '…' : value ?? 0}
      </span>
      {delta && <span className="dash-stat__delta">{delta}</span>}
    </div>
  );
}

export default memo(StatCard);
