'use client';

/** VeriGold — Card Component */
export default function Card({ children, className = '', glass = false, ...props }) {
  return (
    <div className={`dash-card ${glass ? 'dash-card--glass' : ''} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
