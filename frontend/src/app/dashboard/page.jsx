'use client';

/**
 * VeriGold — Dashboard Main Page (Phase 7 §7.5.1)
 *
 * Lender dashboard showing:
 *   - Stats row: Queries Today, My Active Pledges, Open High-Risk Alerts
 *   - Borrower search (masked Aadhaar → hash → risk report)
 *   - Recent queries table (last 10)
 *   - Recent fraud alerts sidebar (last 5)
 */

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import {
  Badge,
  Button,
  CopyButton,
  Spinner,
  ErrorState,
  EmptyState,
  StatCard,
  SectionHeader,
} from '@/components/ui';
import { computeBorrowerHash } from '@/lib/auth';
import api from '@/lib/api';
import { formatDate, truncateHash } from '@/lib/formatters';

const ALERT_ICONS = {
  VELOCITY: '⚡',
  GOLD_MATCH: '🥇',
  HIGH_EXPOSURE: '🚨',
};

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledGoldFp = searchParams.get('gold_fp');

  const [stats,       setStats]       = useState(null);
  const [queries,     setQueries]     = useState([]);
  const [alerts,      setAlerts]      = useState([]);
  const [statsLoading,setStatsLoading]= useState(true);
  const [statsError,  setStatsError]  = useState(null);

  const [aadhaar,     setAadhaar]     = useState('');
  const [searching,   setSearching]   = useState(false);
  const [searchError, setSearchError] = useState(null);
  const fetchedRef = useRef(false);

  // ── Load dashboard data ──────────────────────────────────────────────────
  async function loadDashboard() {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const [statsRes, queriesRes, alertsRes] = await Promise.allSettled([
        api.get('/api/dashboard/stats'),
        api.get('/api/borrowers/search-history?limit=10'),
        api.get('/api/alerts?limit=5&risk_level=HIGH'),
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
      } else {
        setStatsError(statsRes.reason?.message || 'Failed to load summary statistics.');
      }

      if (queriesRes.status === 'fulfilled') {
        setQueries(queriesRes.value.data?.queries ?? []);
      }
      if (alertsRes.status === 'fulfilled') {
        setAlerts(alertsRes.value.data?.alerts ?? []);
      }
    } catch (e) {
      setStatsError(e.message);
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      loadDashboard();
    }
  }, []);

  // ── Borrower search ───────────────────────────────────────────────────────
  async function handleSearch(e) {
    e.preventDefault();
    setSearchError(null);
    setSearching(true);
    try {
      const hash = await computeBorrowerHash(aadhaar, api);
      // Navigate to risk report with hash and optional gold fingerprint as query param
      const url = prefilledGoldFp
        ? `/dashboard/risk-report?hash=${encodeURIComponent(hash)}&gold_fp=${encodeURIComponent(prefilledGoldFp)}`
        : `/dashboard/risk-report?hash=${encodeURIComponent(hash)}`;
      router.push(url);
    } catch (e) {
      setSearchError(e.message);
      setSearching(false);
    }
  }

  // Mask Aadhaar display: show last 4 digits only
  function maskAadhaar(val) {
    const digits = val.replace(/\D/g, '').slice(0, 12);
    return digits;
  }

  return (
    <ProtectedLayout title="Dashboard">
      {/* Stats */}
      <section aria-label="Summary statistics">
        {statsLoading ? (
          <Spinner label="Loading dashboard stats…" />
        ) : statsError ? (
          <ErrorState message={statsError} onRetry={loadDashboard} />
        ) : (
          <div className="dash-stats">
            <StatCard
              label="Queries Today"
              value={stats?.queries_today ?? 0}
              delta="Borrower evaluations today"
              variant="gold"
            />
            <StatCard
              label="My Active Pledges"
              value={stats?.my_active_pledges ?? 0}
              delta="Live loans on ledger"
              variant="success"
            />
            <StatCard
              label="High-Risk Alerts"
              value={stats?.open_high_risk_alerts ?? 0}
              delta="Unreviewed risk flags"
              variant={(stats?.open_high_risk_alerts ?? 0) > 0 ? 'danger' : 'neutral'}
            />
          </div>
        )}
      </section>

      <div className="dash-dashboard-grid">
        {/* Left column */}
        <div>
          {/* Borrower Search */}
          <section className="dash-section" aria-labelledby="search-heading">
            <SectionHeader
              title="Borrower Risk Search"
              subtitle="Enter a borrower's 12-digit Aadhaar number to evaluate multi-lender exposure and duplicate pledge history."
              id="search-heading"
            />

            {prefilledGoldFp && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(245, 216, 154, 0.22)', border: '1px solid rgba(198, 137, 28, 0.35)', borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gold-mid)' }}>
                    <span aria-hidden="true">🥇 </span>Appraised Collateral Attached
                  </span>
                  <code style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--dash-text-muted)', marginTop: '0.2rem' }}>
                    {prefilledGoldFp.slice(0, 32)}…
                  </code>
                </div>
                <button
                  type="button"
                  className="dash-btn dash-btn--xs dash-btn--ghost"
                  onClick={() => router.push('/dashboard')}
                  aria-label="Clear attached appraised collateral"
                >
                  <span aria-hidden="true">✕ </span>Clear
                </button>
              </div>
            )}

            <div className="dash-card">
              <form onSubmit={handleSearch} id="borrower-search-form" noValidate>
                <div className="dash-form-group">
                  <label htmlFor="aadhaar-input" className="dash-label">
                    Aadhaar Number
                    <span style={{ marginLeft: '0.5rem', fontWeight: 400, color: 'var(--dash-text-faint)', fontSize: '0.75rem' }}>
                      (12 digits — hashed locally in browser, never saved or transmitted)
                    </span>
                  </label>
                  <div className="dash-search-row">
                    <input
                      id="aadhaar-input"
                      type="text"
                      inputMode="numeric"
                      className="dash-input"
                      placeholder="Enter 12-digit Aadhaar (e.g. 2345 6789 0123)"
                      value={aadhaar}
                      onChange={(e) => setAadhaar(maskAadhaar(e.target.value))}
                      maxLength={12}
                      autoComplete="off"
                      required
                      aria-describedby={searchError ? 'search-error' : undefined}
                    />
                    <Button
                      type="submit"
                      id="hash-and-search-btn"
                      loading={searching}
                      disabled={aadhaar.length !== 12}
                      aria-label="Verify borrower risk across consortium registry"
                    >
                      Verify Borrower Risk
                    </Button>
                  </div>
                </div>
                {searchError && (
                  <div id="search-error" className="dash-error" role="alert">
                    <span className="dash-error__icon" aria-hidden="true">⚠</span>
                    <span className="dash-error__msg">{searchError}</span>
                  </div>
                )}
              </form>
            </div>
          </section>

          {/* Recent Queries */}
          <section className="dash-section" aria-labelledby="queries-heading">
            <SectionHeader
              title="Recent Queries"
              id="queries-heading"
            />

            {statsLoading ? <Spinner /> : queries.length === 0 ? (
              <div className="dash-card">
                <EmptyState
                  icon="🔍"
                  variant="search"
                  title="No queries yet"
                  subtitle="Borrower risk assessments and consortium verification queries will appear here."
                />
              </div>
            ) : (
              <div className="dash-table-wrap">
                <table className="dash-table" aria-label="Recent borrower queries">
                  <thead>
                    <tr>
                      <th scope="col">Borrower Hash</th>
                      <th scope="col">Risk Level</th>
                      <th scope="col">Recommendation</th>
                      <th scope="col">Queried At</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queries.map((q, i) => (
                      <tr key={q.id ?? i}>
                        <td>
                          <Link
                            href={`/dashboard/risk-report?hash=${encodeURIComponent(q.borrower_hash)}`}
                            className="dash-table__hash"
                            title={q.borrower_hash}
                            style={{ display: 'inline-block', color: 'inherit' }}
                          >
                            {truncateHash(q.borrower_hash, 16, 6)}
                          </Link>
                        </td>
                        <td>
                          <Badge variant={q.risk_level?.toLowerCase()} showIcon>
                            {q.risk_level ?? '—'}
                          </Badge>
                        </td>
                        <td>
                          <Badge variant={q.recommendation?.toLowerCase()} showIcon>
                            {q.recommendation ?? '—'}
                          </Badge>
                        </td>
                        <td>{formatDate(q.queried_at)}</td>
                        <td>
                          <Link
                            href={`/dashboard/risk-report?hash=${encodeURIComponent(q.borrower_hash)}`}
                            className="dash-btn dash-btn--xs dash-btn--ghost"
                            aria-label={`View risk report for borrower hash ${truncateHash(q.borrower_hash, 8, 4)}`}
                          >
                            View <span aria-hidden="true">→</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Right column — Recent Alerts */}
        <section className="dash-section" aria-labelledby="alerts-heading">
          <div className="dash-section__header">
            <h2 className="dash-section__title" id="alerts-heading">Recent Alerts</h2>
            <Link
              href="/dashboard/alerts"
              className="dash-btn dash-btn--ghost dash-btn--sm"
              id="view-all-alerts-btn"
              aria-label="View all risk alerts"
            >
              View all <span aria-hidden="true">→</span>
            </Link>
          </div>

          {statsLoading ? <Spinner /> : alerts.length === 0 ? (
            <div className="dash-card">
              <EmptyState
                icon="✅"
                variant="success"
                size="sm"
                title="No high-risk alerts"
                subtitle="All clear — no open collateral fraud or velocity alerts detected."
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {alerts.map((alert, i) => {
                const headingId = `dash-alert-heading-${alert.id ?? i}`;
                return (
                  <article key={alert.id ?? i} className={`alert-card alert-card--${alert.alert_type?.toLowerCase()}`} aria-labelledby={headingId}>
                    <div className="alert-card__top">
                      <div className="alert-card__meta">
                        <span className="alert-card__icon-wrap" aria-hidden="true">
                          {ALERT_ICONS[alert.alert_type] ?? '⚠'}
                        </span>
                        <h3 id={headingId} style={{ margin: 0, fontSize: 'inherit', fontWeight: 'inherit', display: 'inline-flex' }}>
                          <Badge variant={alert.alert_type?.toLowerCase()}>{alert.alert_type ?? 'ALERT'}</Badge>
                        </h3>
                        <Badge variant={alert.risk_level?.toLowerCase()}>{alert.risk_level}</Badge>
                      </div>
                      <span className="alert-card__time">
                        {formatDate(alert.created_at, { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <p className="alert-card__explanation">{alert.explanation ?? 'No details available.'}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                        <span className="dash-label" style={{ fontSize: '0.7rem', margin: 0 }}>Borrower ID</span>
                        <code className="dash-table__hash" title={alert.borrower_hash} style={{ maxWidth: '8.5rem' }}>
                          {truncateHash(alert.borrower_hash, 8, 4)}
                        </code>
                        <CopyButton
                          text={alert.borrower_hash}
                          ariaLabel={`Copy borrower identity hash ${truncateHash(alert.borrower_hash, 8, 0)}`}
                        />
                      </div>

                      <Link
                        href={`/dashboard/risk-report?hash=${encodeURIComponent(alert.borrower_hash)}`}
                        className="dash-btn dash-btn--xs dash-btn--ghost"
                        style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        aria-label={`Investigate risk dossier for borrower ${truncateHash(alert.borrower_hash, 8, 0)}`}
                      >
                        Investigate <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </ProtectedLayout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<ProtectedLayout title="Dashboard"><Spinner label="Loading dashboard…" /></ProtectedLayout>}>
      <DashboardContent />
    </Suspense>
  );
}

