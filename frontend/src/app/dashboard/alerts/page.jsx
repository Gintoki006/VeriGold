'use client';

/**
 * VeriGold — Alerts Page (Phase 7 §7.9.1)
 *
 * Alert cards with filter tabs: ALL | VELOCITY | GOLD_MATCH | HIGH_EXPOSURE
 * "Mark Reviewed" action per alert.
 */

import { useState, useEffect } from 'react';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import { Badge, Button, Spinner, ErrorState, EmptyState, CopyButton } from '@/components/ui';
import api from '@/lib/api';
import { formatDate, truncateHash } from '@/lib/formatters';

const FILTER_TABS = [
  { key: 'ALL',          label: 'All Alerts',   icon: '📋' },
  { key: 'VELOCITY',     label: 'Velocity',     icon: '⚡' },
  { key: 'GOLD_MATCH',   label: 'Gold Match',   icon: '🥇' },
  { key: 'HIGH_EXPOSURE',label: 'High Exposure',icon: '⚠' },
];

const ALERT_ICONS = {
  VELOCITY:      '⚡',
  GOLD_MATCH:    '🥇',
  HIGH_EXPOSURE: '⚠',
};

export default function AlertsPage() {
  const [activeTab,   setActiveTab]   = useState('ALL');
  const [alerts,      setAlerts]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [reviewing,   setReviewing]   = useState({}); // { [alertId]: true }
  const [reviewed,    setReviewed]    = useState({}); // { [alertId]: true }
  const [reviewErrors,setReviewErrors]= useState({}); // { [alertId]: string }

  async function fetchAlerts(tab = 'ALL') {
    setLoading(true);
    setError(null);
    try {
      const params = tab !== 'ALL' ? { alert_type: tab } : {};
      const res = await api.get('/api/alerts', { params });
      setAlerts(res.data?.alerts ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAlerts(activeTab); }, [activeTab]);

  function handleTabChange(tab) {
    setActiveTab(tab);
  }

  function handleTabKeyDown(e, currentIndex) {
    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % FILTER_TABS.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + FILTER_TABS.length) % FILTER_TABS.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = FILTER_TABS.length - 1;
    } else {
      return;
    }
    const nextKey = FILTER_TABS[nextIndex].key;
    setActiveTab(nextKey);
    const nextEl = document.getElementById(`alerts-tab-${nextKey.toLowerCase()}`);
    if (nextEl) nextEl.focus();
  }

  async function handleMarkReviewed(alertId) {
    setReviewing((r) => ({ ...r, [alertId]: true }));
    setReviewErrors((prev) => ({ ...prev, [alertId]: null }));
    try {
      await api.post(`/api/alerts/${alertId}/review`);
      setReviewed((r) => ({ ...r, [alertId]: true }));
      // Remove after brief delay
      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      }, 800);
    } catch (e) {
      setReviewErrors((prev) => ({ ...prev, [alertId]: e.message || 'Failed to review alert.' }));
    } finally {
      setReviewing((r) => ({ ...r, [alertId]: false }));
    }
  }

  return (
    <ProtectedLayout title="Alerts">
      <p style={{ color: 'var(--dash-text-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
        Review cross-lender duplicate pledges, rapid velocity spikes, and high aggregate exposure flagged during loan appraisal.
      </p>

      {/* Filter Tabs */}
      <div
        className="filter-tabs"
        role="tablist"
        aria-label="Alert type filter"
      >
        {FILTER_TABS.map((tab, idx) => (
          <button
            key={tab.key}
            role="tab"
            id={`alerts-tab-${tab.key.toLowerCase()}`}
            className={`filter-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.key)}
            onKeyDown={(e) => handleTabKeyDown(e, idx)}
            tabIndex={activeTab === tab.key ? 0 : -1}
            aria-selected={activeTab === tab.key}
            aria-controls="alerts-list"
          >
            <span aria-hidden="true" style={{ marginRight: '0.35rem' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner label="Loading alerts…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchAlerts(activeTab)} />
      ) : alerts.length === 0 ? (
        <div className="dash-card">
          <EmptyState
            icon="✅"
            variant="success"
            title="All clear — no risk alerts"
            subtitle={activeTab === 'ALL' ? 'Your consortium account has zero active risk alerts. The ledger indicates no duplicate pledges or velocity spikes.' : `No ${activeTab.replace('_', ' ').toLowerCase()} alerts found under this filter category.`}
          />
        </div>
      ) : (
        <div id="alerts-list" role="tabpanel" aria-labelledby={`alerts-tab-${activeTab.toLowerCase()}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {alerts.map((alert) => (
            <article
              key={alert.id}
              className={`alert-card alert-card--${alert.alert_type?.toLowerCase()} ${reviewed[alert.id] ? 'alert-card--reviewed' : ''}`}
              style={reviewed[alert.id] ? { opacity: 0.5, transition: 'opacity 0.5s ease' } : {}}
              aria-labelledby={`alert-heading-${alert.id}`}
            >
              <div className="alert-card__top">
                <div className="alert-card__meta">
                  <span className="alert-card__icon-wrap" aria-hidden="true">
                    {ALERT_ICONS[alert.alert_type] ?? '⚠'}
                  </span>
                  <h3 id={`alert-heading-${alert.id}`} style={{ margin: 0, fontSize: 'inherit', fontWeight: 'inherit', display: 'inline-flex' }}>
                    <Badge variant={alert.alert_type?.toLowerCase()}>
                      {alert.alert_type?.replace('_', ' ') ?? 'Alert'}
                    </Badge>
                  </h3>
                  <Badge variant={alert.risk_level?.toLowerCase()}>
                    {alert.risk_level ?? ''}
                  </Badge>
                </div>
                <span className="alert-card__time">
                  {formatDate(alert.created_at)}
                </span>
              </div>

              <p className="alert-card__explanation">
                {alert.explanation ?? 'No additional details.'}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                  <span className="dash-label" style={{ fontSize: '0.75rem', margin: 0 }}>Borrower ID</span>
                  <code className="dash-table__hash" title={alert.borrower_hash} style={{ maxWidth: '14rem' }}>
                    {truncateHash(alert.borrower_hash, 16, 6)}
                  </code>
                  <CopyButton
                    text={alert.borrower_hash}
                    ariaLabel={`Copy borrower identity hash ${truncateHash(alert.borrower_hash, 8, 0)}`}
                  />
                </div>

                {!reviewed[alert.id] && (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={reviewing[alert.id]}
                    onClick={() => handleMarkReviewed(alert.id)}
                    id={`mark-reviewed-btn-${alert.id}`}
                    aria-label={`Acknowledge alert ${alert.id} and mark as reviewed`}
                  >
                    <span aria-hidden="true">✓ </span>Acknowledge Alert
                  </Button>
                )}
                {reviewed[alert.id] && (
                  <span style={{ fontSize: '0.8125rem', color: 'var(--dash-success-text)' }}>
                    <span aria-hidden="true">✓ </span>Alert acknowledged
                  </span>
                )}
                {reviewErrors[alert.id] && (
                  <span style={{ fontSize: '0.8125rem', color: 'var(--dash-danger-text)' }} role="alert">
                    <span aria-hidden="true">⚠ </span>{reviewErrors[alert.id]}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </ProtectedLayout>
  );
}
