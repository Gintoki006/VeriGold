'use client';

import { memo } from 'react';

function Spinner({ label = 'Loading…' }) {
  return (
    <div className="dash-spinner" role="status" aria-label={label}>
      <div className="dash-spinner__ring" />
    </div>
  );
}

export default memo(Spinner);
