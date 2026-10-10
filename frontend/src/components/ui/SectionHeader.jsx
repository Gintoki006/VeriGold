'use client';

/**
 * VeriGold — SectionHeader Component
 *
 * Consistent header with title, subtitle, and optional action controls.
 */

export default function SectionHeader({
  title,
  subtitle,
  action,
  id,
  className = '',
  ...props
}) {
  return (
    <div className={`dash-section__header ${className}`.trim()} {...props}>
      <div>
        <h2 className="dash-section__title" id={id}>
          {title}
        </h2>
        {subtitle && <p className="dash-section__sub">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
