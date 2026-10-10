'use client';

import { memo, useId } from 'react';

function resolveErrorMessage(err) {
  if (!err) return 'An unexpected error occurred.';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (typeof err === 'object') {
    return err.message || err.detail || err.error || 'An unexpected error occurred.';
  }
  return String(err);
}

function ErrorState({ message, onRetry, id }) {
  const displayMsg = resolveErrorMessage(message);
  const reactId = useId();
  const retryBtnId = id ? `${id}-retry-btn` : `error-retry-btn-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <div className="dash-error" role="alert" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
      <span className="dash-error__icon" aria-hidden="true">⚠</span>
      <span className="dash-error__msg">{displayMsg}</span>
      {onRetry && (
        <button
          type="button"
          className="dash-error__retry"
          onClick={onRetry}
          id={retryBtnId}
          aria-label="Retry failed operation"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default memo(ErrorState);
