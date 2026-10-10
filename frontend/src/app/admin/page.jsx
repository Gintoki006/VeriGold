'use client';

/**
 * VeriGold — Admin Dashboard (Phase 7 §7.11.1)
 *
 * Admin-only view showing:
 *   - Platform stats (total pledges, active pledges, total queries, high-risk alerts today)
 *   - Lenders table: org name, MSP ID, status badge, created at, activate/deactivate toggle
 *
 * Role guard: non-admin lenders are redirected to /dashboard.
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import {
  Badge,
  Spinner,
  ErrorState,
  EmptyState,
  StatCard,
  SectionHeader,
} from '@/components/ui';
import useAuthStore from '@/store/auth';
import api from '@/lib/api';
import { formatDate } from '@/lib/formatters';

const LENDER_ICONS = {
  Org1MSP: '🏛️',
  Org2MSP: '🏦',
  Org3MSP: '🪙',
  Org4MSP: '🏢',
};

export default function AdminPage() {
  const router = useRouter();
  const { lender } = useAuthStore();

  const [stats,      setStats]      = useState(null);
  const [lenders,    setLenders]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [toggleError,setToggleError]= useState(null);
  const [toggling,   setToggling]   = useState({}); // { [lenderId]: true }
  const fetchedRef = useRef(false);

  // Role guard
  useEffect(() => {
    if (lender && !lender.is_admin) {
      router.replace('/dashboard');
    }
  }, [lender, router]);

  async function fetchAdminData() {
    setLoading(true);
    setError(null);
    setToggleError(null);
    try {
      const [statsRes, lendersRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/lenders'),
      ]);
      setStats(statsRes.data);
      setLenders(lendersRes.data?.lenders ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (lender?.is_admin && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchAdminData();
    }
  }, [lender?.is_admin]);

  // Toggle lender active/inactive
  async function handleToggle(targetLender) {
    const newStatus = targetLender.is_active ? false : true;
    setToggling((t) => ({ ...t, [targetLender.id]: true }));
    setToggleError(null);
    try {
      await api.patch(`/api/admin/lenders/${targetLender.id}`, { is_active: newStatus });
      setLenders((prev) =>
        prev.map((l) => l.id === targetLender.id ? { ...l, is_active: newStatus } : l)
      );
    } catch (e) {
      setToggleError(`Failed to update lender ${targetLender.org_name}: ${e.message}`);
    } finally {
      setToggling((t) => ({ ...t, [targetLender.id]: false }));
    }
  }

  // Show nothing while role check is in progress
  if (!lender) return null;
  if (!lender.is_admin) return null;

  return (
    <ProtectedLayout title="Admin Dashboard">
      {/* Platform Stats */}
      <section aria-labelledby="admin-stats-heading" style={{ marginBottom: '2rem' }}>
        <h2 id="admin-stats-heading" className="dash-section__title" style={{ marginBottom: '1rem' }}>
          Platform Statistics
        </h2>

        {loading ? <Spinner /> : stats && (
          <div className="dash-stats">
            <StatCard
              label="Total Pledges"
              value={stats.total_pledges ?? 0}
              delta="All time"
              variant="gold"
            />
            <StatCard
              label="Active Pledges"
              value={stats.active_pledges ?? 0}
              delta="Live on ledger"
              variant="success"
            />
            <StatCard
              label="Total Queries"
              value={stats.total_queries ?? 0}
              delta="Risk lookups"
              variant="neutral"
            />
            <StatCard
              label="High-Risk Alerts Today"
              value={stats.high_risk_alerts_today ?? 0}
              delta="Fraud signals"
              variant={(stats.high_risk_alerts_today ?? 0) > 0 ? 'danger' : 'neutral'}
            />
          </div>
        )}
      </section>

      {/* Lenders Table */}
      <section aria-labelledby="lenders-heading">
        <SectionHeader
          title="Registered Lenders"
          subtitle="Manage onboarded credit institutions and active access status."
          id="lenders-heading"
          style={{ marginBottom: '1rem' }}
        />

        {toggleError && (
          <div style={{ marginBottom: '1rem' }}>
            <ErrorState message={toggleError} onRetry={null} />
          </div>
        )}

        {loading ? <Spinner label="Loading lenders…" /> : error ? (
          <ErrorState message={error} onRetry={fetchAdminData} />
        ) : lenders.length === 0 ? (
          <div className="dash-card">
            <EmptyState
              icon="🏛️"
              variant="gold"
              title="No consortium lenders registered"
              subtitle="Member institutions are provisioned during network onboarding. Once onboarded, participating banks and NBFCs will appear here."
            />
          </div>
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table" aria-label="Registered lenders table">
              <thead>
                <tr>
                  <th scope="col">Organisation Name</th>
                  <th scope="col">Consortium ID (MSP)</th>
                  <th scope="col">Status</th>
                  <th scope="col">Registered</th>
                  <th scope="col">Access Control</th>
                </tr>
              </thead>
              <tbody>
                {lenders.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className="admin-lender-icon" aria-hidden="true">
                          {LENDER_ICONS[l.msp_id] || '🏛️'}
                        </span>
                        <span style={{ fontWeight: 600, color: 'var(--dash-text)' }}>
                          {l.org_name ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <code className="admin-msp-badge">
                        {l.msp_id ?? '—'}
                      </code>
                    </td>
                    <td>
                      <Badge variant={l.is_active ? 'active' : 'closed'} showIcon>
                        {l.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>{formatDate(l.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td>
                      <button
                        id={`lender-toggle-${l.id}`}
                        className={`admin-toggle ${l.is_active ? 'on' : ''} ${toggling[l.id] ? 'disabled' : ''}`}
                        onClick={() => !toggling[l.id] && handleToggle(l)}
                        aria-label={`${l.is_active ? 'Deactivate' : 'Activate'} lender ${l.org_name}`}
                        aria-checked={Boolean(l.is_active)}
                        role="switch"
                        disabled={toggling[l.id]}
                        style={{ opacity: toggling[l.id] ? 0.5 : 1 }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </ProtectedLayout>
  );
}
