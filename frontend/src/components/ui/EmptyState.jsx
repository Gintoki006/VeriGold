'use client';

/**
 * VeriGold — EmptyState Component (Editorial Fintech Luxury)
 *
 * Designed to match VeriGold institutional standards:
 * - Luminous frosted glass icon medallion with ambient radial glow halo
 * - Editorial Playfair Display serif title with DM Sans body copy
 * - Semantic variants: 'gold' (default), 'success', 'search', 'danger', 'neutral'
 * - Responsive sizing: 'sm', 'md', 'lg'
 * - Self-contained 'boxed' card mode or seamless embedded mode
 * - Full WCAG 2.1 AA accessibility (role="status", aria-live="polite")
 */

import { memo } from 'react';
import Button from './Button';

function resolveVariant(variant, icon) {
  if (variant) return variant;
  if (icon === '✅') return 'success';
  if (icon === '🔍') return 'search';
  if (icon === '⚠' || icon === '✗') return 'danger';
  if (icon === '🏦') return 'neutral';
  return 'gold';
}

function EmptyState({
  icon = '📭',
  title = 'No results found',
  subtitle,
  variant,
  size = 'md',
  boxed = false,
  action,
  actionLabel,
  onAction,
  actionVariant = 'primary',
  className = '',
  ...props
}) {
  const effectiveVariant = resolveVariant(variant, icon);
  const sizeClass = size === 'sm' ? 'dash-empty--sm' : size === 'lg' ? 'dash-empty--lg' : '';
  const variantClass = `dash-empty--${effectiveVariant}`;
  const boxedClass = boxed ? 'dash-empty--boxed' : '';

  return (
    <div
      className={`dash-empty ${variantClass} ${sizeClass} ${boxedClass} ${className}`.trim()}
      role="status"
      aria-live="polite"
      {...props}
    >
      {icon && (
        <div className="dash-empty__icon-wrapper" aria-hidden="true">
          <div className="dash-empty__icon-halo" />
          <div className="dash-empty__icon">{icon}</div>
        </div>
      )}

      {title && <h3 className="dash-empty__title">{title}</h3>}

      {subtitle && <p className="dash-empty__sub">{subtitle}</p>}

      {(action || actionLabel) && (
        <div className="dash-empty__action">
          {action ? (
            action
          ) : actionLabel && onAction ? (
            <Button
              variant={actionVariant}
              size={size === 'sm' ? 'sm' : 'default'}
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default memo(EmptyState);
