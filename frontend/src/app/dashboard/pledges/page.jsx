'use client';

/**
 * VeriGold — My Pledges Page (Phase 7 §7.8.1)
 *
 * Table of lender's pledges with pagination (10 per page).
 * Close Pledge → confirmation modal → POST /api/pledges/{id}/close → status updates in-place.
 * States: loading | empty | loaded | closing | closed confirmation | error
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import { Badge, Button, Spinner, ErrorState, EmptyState, CopyButton } from '@/components/ui';
import api from '@/lib/api';
import { AMOUNT_RANGES } from '@/constants';
import { formatDate, truncateHash } from '@/lib/formatters';

const PAGE_SIZE = 10;

export default function PledgesPage() {
  const router = useRouter();
  const [pledges,    setPledges]    = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  // Inline row confirmation state
  const [confirmingId, setConfirmingId] = useState(null);
  const [closingId,    setClosingId]    = useState(null);
  const [closeError,   setCloseError]   = useState(null);
  const [closedId,     setClosedId]     = useState(null);
  const fetchedRef = useRef(false);

  async function fetchPledges(p = 1) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/pledges/my', {
        params: { page: p, limit: PAGE_SIZE },
      });
      setPledges(res.data.pledges ?? []);
      setTotal(res.data.total ?? 0);
      setPage(p);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchPledges(1);
    }
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Close pledge flow ─────────────────────────────────────────────────────
  async function handleClosePledge(pledgeId) {
    setClosingId(pledgeId);
    setCloseError(null);
    try {
      await api.post(`/api/pledges/${pledgeId}/close`);
      setClosedId(pledgeId);
      setPledges((prev) =>
        prev.map((p) => p.id === pledgeId ? { ...p, status: 'CLOSED' } : p)
      );
      setConfirmingId(null);
      setTimeout(() => setClosedId(null), 4000);
    } catch (e) {
      setCloseError(e.message || 'Failed to close pledge.');
    } finally {
      setClosingId(null);
    }
  }

  return (
    <ProtectedLayout title="My Pledges">

      {/* Closed confirmation banner */}
      {closedId && (
        <div className="dash-success-banner" style={{ marginBottom: '1.25rem' }} role="status" aria-live="polite">
          <span aria-hidden="true">✅</span>
          <span>Pledge closed successfully. Collateral is released across the consortium registry.</span>
        </div>
      )}

      {/* Close error banner */}
      {closeError && (
        <div className="dash-error-banner" style={{ marginBottom: '1.25rem' }} role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>{closeError}</span>
        </div>
      )}

      {loading ? <Spinner label="Loading pledges…" /> : error ? (
        <ErrorState message={error} onRetry={() => fetchPledges(page)} />
      ) : pledges.length === 0 ? (
        <div className="dash-card">
          <EmptyState
            icon="📋"
            variant="gold"
            title="No pledges registered"
            subtitle="Pledges you register on Hyperledger Fabric after borrower risk assessment will appear here."
            actionLabel="Assess Borrower Risk →"
            onAction={() => router.push('/dashboard')}
          />
        </div>
      ) : (
        <>
          <div className="dash-table-wrap">
            <table className="dash-table" aria-label="My active and closed pledges">
              <thead>
                <tr>
                  <th scope="col">Pledge ID</th>
                  <th scope="col">Amount Range</th>
                  <th scope="col">Status</th>
                  <th scope="col">Created</th>
                  <th scope="col">Tx Hash</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {pledges.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <code className="dash-table__hash" title={p.id}>
                        {truncateHash(p.id, 8, 4)}
                      </code>
                    </td>
                    <td>
                      <span className="dash-amount-pill">
                        <span aria-hidden="true">🪙 </span>{AMOUNT_RANGES[p.amount_range] ?? p.amount_range ?? '—'}
                      </span>
                    </td>
                    <td>
                      <Badge variant={p.status === 'ACTIVE' ? 'active' : 'closed'} showIcon>
                        {p.status ?? '—'}
                      </Badge>
                    </td>
                    <td>{formatDate(p.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <span className="dash-table__hash" title={p.tx_hash}>
                          {truncateHash(p.tx_hash, 8, 4)}
                        </span>
                        {p.tx_hash && (
                          <CopyButton
                            text={p.tx_hash}
                            ariaLabel={`Copy transaction hash for pledge ${truncateHash(p.id, 8, 0)}`}
                          />
                        )}
                      </div>
                    </td>
                    <td>
                      {p.status === 'ACTIVE' ? (
                        confirmingId === p.id ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                            <Button
                              variant="danger"
                              size="sm"
                              loading={closingId === p.id}
                              onClick={() => handleClosePledge(p.id)}
                              id={`confirm-close-btn-${p.id?.slice(0, 8)}`}
                              aria-label={`Confirm closing pledge ${p.id?.slice(0, 8)}`}
                            >
                              Confirm?
                            </Button>
                            <button
                              type="button"
                              className="dash-btn dash-btn--xs dash-btn--ghost"
                              onClick={() => { setConfirmingId(null); setCloseError(null); }}
                              disabled={closingId === p.id}
                              aria-label="Cancel pledge closing"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => { setConfirmingId(p.id); setCloseError(null); }}
                            id={`close-pledge-btn-${p.id?.slice(0, 8)}`}
                            aria-label={`Close pledge ${p.id?.slice(0, 8)}`}
                          >
                            Close
                          </Button>
                        )
                      ) : (
                        <span style={{ color: 'var(--dash-text-faint)', fontSize: '0.8125rem' }}>Closed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="dash-pagination" aria-label="Pledges pagination">
              <button
                className="dash-page-btn"
                disabled={page <= 1}
                onClick={() => fetchPledges(page - 1)}
                aria-label="Previous page"
              >
                <span aria-hidden="true">‹</span>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`dash-page-btn ${p === page ? 'active' : ''}`}
                  onClick={() => fetchPledges(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? 'page' : undefined}
                >
                  {p}
                </button>
              ))}
              <button
                className="dash-page-btn"
                disabled={page >= totalPages}
                onClick={() => fetchPledges(page + 1)}
                aria-label="Next page"
              >
                <span aria-hidden="true">›</span>
              </button>
            </nav>
          )}
        </>
      )}
    </ProtectedLayout>
  );
}
