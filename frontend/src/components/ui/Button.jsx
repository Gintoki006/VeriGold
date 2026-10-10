'use client';

/**
 * VeriGold — Button Component (Phase 7 §7.1.2)
 *
 * Variants: primary | secondary | danger | ghost
 * Sizes:    default | sm | lg
 * States:   loading (shows spinner), disabled
 */

export default function Button({
  variant  = 'primary',
  size     = '',
  loading  = false,
  disabled = false,
  children,
  className = '',
  ...props
}) {
  const sizeClass = size === 'sm' ? 'dash-btn--sm' : size === 'lg' ? 'dash-btn--lg' : '';

  return (
    <button
      className={`dash-btn dash-btn--${variant} ${sizeClass} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span className="spinner" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
