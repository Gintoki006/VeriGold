'use client';

/**
 * VeriGold — Risk Report Page (Phase 7 §7.6.1)
 *
 * Displays the full risk report for a borrower hash.
 * Most prominent element: large risk level badge.
 * Includes: score gauge, status pills, rule explanations, LLM narrative,
 *            recommendation banner, register pledge, tx hash display.
 */

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import { Badge, Button, Spinner, ErrorState, CopyButton } from '@/components/ui';
import api from '@/lib/api';
import { AMOUNT_RANGES } from '@/constants';
import { truncateHash } from '@/lib/formatters';

const RISK_FACTOR_ICONS = {
  active_pledges: '📋',
  exposure:       '💰',
  velocity:       '⚡',
  gold_match:     '🥇',
  'risk signal':  '⚡',
  default:        '📊',
};

function getRiskLevel(level = '') {
  return level.toLowerCase();
}

function RiskReportContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const borrowerHash = searchParams.get('hash');

  const [report,       setReport]       = useState(null);
  const [loading,      setLoading]      = useState(Boolean(borrowerHash));
  const [error,        setError]        = useState(null);
  const [registering,  setRegistering]  = useState(false);
  const [txHash,       setTxHash]       = useState(null);
  const [regError,     setRegError]     = useState(null);

  const initialGoldFp = searchParams.get('gold_fp') || '';
  const [goldMode, setGoldMode] = useState(initialGoldFp ? 'fingerprint' : 'appraise');
  const [goldForm, setGoldForm] = useState({
    item_type: 'Bangle',
    weight_grams: '22.5',
    purity_percent: '91.6',
    characteristics: 'BIS916 hallmark',
  });
  const [customGoldFp, setCustomGoldFp] = useState(initialGoldFp);
  const [loanAmountInr, setLoanAmountInr] = useState('150000');
  const [amountRange, setAmountRange] = useState('2');
  const [boundGoldFp, setBoundGoldFp] = useState(null);
  const [registeredPledgeId, setRegisteredPledgeId] = useState(null);

  async function fetchReport(force = false) {
    if (!borrowerHash) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = { borrower_hash: borrowerHash };
      if (initialGoldFp) {
        payload.gold_fingerprint = initialGoldFp;
      }
      const res = await api.post('/api/borrowers/search', payload);
      setReport(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isCurrent = true;
    if (!borrowerHash) return;

    const payload = { borrower_hash: borrowerHash };
    if (initialGoldFp) {
      payload.gold_fingerprint = initialGoldFp;
    }

    api.post('/api/borrowers/search', payload)
      .then((res) => {
        if (isCurrent) {
          setReport(res.data);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (isCurrent) {
          setError(e.message);
          setLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [borrowerHash, initialGoldFp]);

  // Auto-map INR to Amount Range (PRD §11.2)
  function handleInrChange(val) {
    setLoanAmountInr(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      if (num < 50000) setAmountRange('0');
      else if (num < 100000) setAmountRange('1');
      else if (num < 200000) setAmountRange('2');
      else if (num < 500000) setAmountRange('3');
      else setAmountRange('4');
    }
  }

  async function handleRegisterPledge() {
    setRegistering(true);
    setRegError(null);
    try {
      let finalGoldFp = customGoldFp?.trim();

      // If appraisal mode, compute fingerprint from physical attributes
      if (goldMode === 'appraise') {
        const weight = parseFloat(goldForm.weight_grams);
        if (isNaN(weight) || weight <= 0) {
          throw new Error('Please enter a valid positive gold weight in grams.');
        }
        const purity = parseFloat(goldForm.purity_percent);
        if (isNaN(purity) || purity <= 0 || purity > 100) {
          throw new Error('Purity percentage must be between 0.1% and 100%.');
        }
        const fpRes = await api.post('/api/gold/fingerprint', {
          weight_grams: weight,
          purity_percent: purity,
          item_type: goldForm.item_type || 'Bangle',
          item_count: 1,
          characteristics: goldForm.characteristics?.trim() || null,
        });
        finalGoldFp = fpRes.data.fingerprint_hash || fpRes.data.fingerprint;
      }

      if (!finalGoldFp) {
        throw new Error('Gold fingerprint could not be generated. Please enter valid gold details.');
      }

      const res = await api.post('/api/pledges/register', {
        borrower_hash: borrowerHash,
        gold_fingerprint: finalGoldFp,
        amount_range: parseInt(amountRange, 10),
      });

      setTxHash(res.data.tx_hash);
      setBoundGoldFp(finalGoldFp);
      setRegisteredPledgeId(res.data.pledge_id || res.data.id);
    } catch (e) {
      setRegError(e.message);
    } finally {
      setRegistering(false);
    }
  }

  if (!borrowerHash) {
    return (
      <ProtectedLayout title="Risk Report">
        <ErrorState message="No borrower hash provided. Go back to the dashboard and run a search." />
      </ProtectedLayout>
    );
  }

  const rl    = report?.risk_level ?? report?.risk_assessment?.risk_level;
  const score = report?.score ?? report?.risk_assessment?.score ?? 0;
  const rec   = report?.recommendation ?? report?.risk_assessment?.recommendation;

  const canRegister = rec === 'APPROVE' || rec === 'REDUCE_AMOUNT';

  const rawExplanations = report?.risk_assessment?.explanations ?? report?.explanation ?? [];
  const explanations = rawExplanations.map((exp, i) => {
    if (typeof exp === 'object' && exp !== null) {
      return { factor: exp.factor ?? `Signal ${i + 1}`, iconKey: exp.factor?.toLowerCase(), description: exp.description ?? exp.desc ?? JSON.stringify(exp) };
    }
    const str = String(exp);
    let factor = 'Risk Signal';
    let iconKey = 'default';
    if (/active pledge/i.test(str)) { factor = 'Active Pledges'; iconKey = 'active_pledges'; }
    else if (/velocity/i.test(str)) { factor = 'Pledge Velocity'; iconKey = 'velocity'; }
    else if (/exposure/i.test(str)) { factor = 'Aggregate Exposure'; iconKey = 'exposure'; }
    else if (/gold/i.test(str)) { factor = 'Gold Collateral Match'; iconKey = 'gold_match'; }
    return { factor, iconKey, description: str };
  });

  const llmNarrative = report?.risk_assessment?.llm_narrative || report?.llm_reasoning || '';

  const activePledges = report?.active_pledge_count ?? report?.summary?.active_pledge_count ?? 0;
  const exposureSum = report?.total_amount_range_sum ?? report?.summary?.total_exposure_range;
  const isVelocity = Boolean(report?.velocity_flagged || report?.summary?.velocity_flag || (report?.velocity_7d > 0));
  const isGoldMatch = Boolean(report?.gold_match || report?.summary?.gold_match);

  return (
    <ProtectedLayout title="Risk Report">
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <button
          className="dash-btn dash-btn--ghost dash-btn--sm"
          onClick={() => router.back()}
          id="risk-report-back-btn"
          aria-label="Go back to dashboard"
        >
          <span aria-hidden="true">← </span>Back
        </button>
        <button
          type="button"
          className="dash-btn dash-btn--outline dash-btn--sm"
          onClick={() => window.print()}
          id="risk-report-print-btn"
          aria-label="Print or Export Risk Dossier as PDF"
        >
          <span aria-hidden="true">🖨️ </span>Print Dossier / PDF
        </button>
      </div>

      {loading && !report ? (
        <Spinner label="Fetching risk report…" />
      ) : error && !report ? (
        <ErrorState message={error} onRetry={() => fetchReport(true)} />
      ) : report && (
        <>
          {error && (
            <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--dash-danger-bg)', border: '1px solid rgba(198,40,40,0.25)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--dash-danger-text)' }}>
              <span style={{ fontSize: '0.875rem' }}><span aria-hidden="true">⚠️ </span>Live refresh error: {error}</span>
              <button type="button" className="dash-btn dash-btn--xs dash-btn--secondary" onClick={() => fetchReport(true)}>Retry</button>
            </div>
          )}
          {/* ── Header: Risk Level Badge (most prominent) ── */}
          <div className={`dash-card risk-score-card risk-score-card--${getRiskLevel(rl)}`} style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--dash-text-faint)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>Risk Level</p>
                <span className={`badge risk-badge--large badge--${getRiskLevel(rl)}`} id="risk-level-badge">
                  {rl ?? '—'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--dash-text-faint)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.375rem' }}>Risk Score</p>
                <span style={{ fontSize: '2rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color: 'var(--dash-text)' }}>
                  {score}<span style={{ fontSize: '1rem', color: 'var(--dash-text-faint)' }}>/100</span>
                </span>
              </div>
            </div>

            {/* Score gauge */}
            <div>
              <div className="risk-gauge-wrap" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label={`Risk score: ${score} out of 100`}>
                <div
                  className={`risk-gauge-bar risk-gauge-bar--${getRiskLevel(rl)}`}
                  style={{ transform: `scaleX(${Math.max(0, Math.min(100, Number(score) || 0)) / 100})` }}
                />
              </div>
            </div>

            {/* Borrower hash */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--dash-text-faint)' }}>
                Borrower hash:
              </span>
              <code style={{ fontFamily: 'monospace', color: 'var(--dash-text-muted)', fontSize: '0.75rem' }} title={borrowerHash}>
                {truncateHash(borrowerHash, 16, 8)}
              </code>
              <CopyButton text={borrowerHash} ariaLabel="Copy full borrower hash" />
            </div>
          </div>

          {/* ── Status Metrics ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))', gap: '0.875rem', marginBottom: '1.5rem' }}>
            <div className="risk-pill risk-pill--pledges">
              <p className="risk-pill__label">Active Pledges</p>
              <p className="risk-pill__value">{activePledges}</p>
            </div>
            <div className="risk-pill risk-pill--exposure">
              <p className="risk-pill__label">Exposure Range</p>
              <p className="risk-pill__value">
                {exposureSum != null ? (AMOUNT_RANGES[Math.min(exposureSum, 4)] ?? `Range ${exposureSum}`) : '—'}
              </p>
            </div>
            <div className={`risk-pill ${isVelocity ? 'risk-pill--velocity-flagged' : ''}`}>
              <p className="risk-pill__label">Velocity Flag</p>
              <p className="risk-pill__value">{isVelocity ? (<><span aria-hidden="true">⚡ </span>Anomaly Detected</>) : 'Normal'}</p>
            </div>
            <div className={`risk-pill ${isGoldMatch ? 'risk-pill--match-flagged' : ''}`}>
              <p className="risk-pill__label">Gold Collateral Match</p>
              <p className="risk-pill__value">{isGoldMatch ? (<><span aria-hidden="true">🥇 </span>Duplicate Matched</>) : 'Clean / Unique'}</p>
            </div>
          </div>

          {/* ── Rule-based Explanations ── */}
          {explanations.length > 0 && (
            <section className="dash-section" aria-labelledby="factors-heading">
              <h2 className="dash-section__title" id="factors-heading" style={{ marginBottom: '0.75rem' }}>
                Risk Factors
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {explanations.map((exp, i) => (
                  <div key={i} className="risk-factor-card">
                    <span className="risk-factor-card__icon-box" aria-hidden="true">
                      {RISK_FACTOR_ICONS[exp.iconKey] ?? RISK_FACTOR_ICONS[exp.factor?.toLowerCase()] ?? '📊'}
                    </span>
                    <div>
                      <p className="risk-factor-card__title">{exp.factor}</p>
                      <p className="risk-factor-card__desc">{exp.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── LLM Narrative ── */}
          {llmNarrative && (
            <section className="dash-section" aria-labelledby="llm-heading">
              <h2 className="dash-section__title" id="llm-heading" style={{ marginBottom: '0.75rem' }}>
                AI Analysis
              </h2>
              <div className="risk-llm-panel">
                <div className="risk-llm-panel__header">
                  <span className="risk-llm-panel__badge"><span aria-hidden="true">✦ </span>AI Advisory Narrative</span>
                </div>
                <p className="risk-llm-panel__text">{llmNarrative}</p>
              </div>
            </section>
          )}

          {/* ── Recommendation Banner ── */}
          {rec && (
            <div
              className={`risk-recommendation risk-recommendation--${rec.toLowerCase().replace('_amount','')}`}
              role="status"
              aria-live="polite"
            >
              <div>
                <p className="risk-recommendation__label">Recommendation</p>
                <p className="risk-recommendation__value" id="risk-recommendation-value">
                  {rec === 'APPROVE'       && (<><span aria-hidden="true">✓ </span>Approve</>)}
                  {rec === 'REDUCE_AMOUNT' && (<><span aria-hidden="true">~ </span>Reduce Amount</>)}
                  {rec === 'REJECT'        && (<><span aria-hidden="true">✗ </span>Reject</>)}
                </p>
              </div>
            </div>
          )}

          {/* ── Register Pledge & Bind Collateral ── */}
          {canRegister && !txHash && (
            <div className="dash-card no-print" style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h2 className="dash-section__title" style={{ marginBottom: '0.25rem' }}>Register Loan Pledge &amp; Lock Collateral</h2>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--dash-text-muted)' }}>
                    Records this loan on the consortium registry and binds the appraised gold collateral to prevent duplicate re-pledging.
                  </p>
                </div>
              </div>

              {regError && <ErrorState message={regError} />}

              {/* Collateral Binding Mode Selector */}
              <form onSubmit={(e) => { e.preventDefault(); handleRegisterPledge(); }} id="register-pledge-form">
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`dash-btn dash-btn--sm ${goldMode === 'appraise' ? 'dash-btn--primary' : 'dash-btn--ghost'}`}
                    onClick={() => setGoldMode('appraise')}
                    aria-pressed={goldMode === 'appraise'}
                  >
                    <span aria-hidden="true">🥇 </span>Appraise Gold Collateral
                  </button>
                  <button
                    type="button"
                    className={`dash-btn dash-btn--sm ${goldMode === 'fingerprint' ? 'dash-btn--primary' : 'dash-btn--ghost'}`}
                    onClick={() => setGoldMode('fingerprint')}
                    aria-pressed={goldMode === 'fingerprint'}
                  >
                    <span aria-hidden="true">🔗 </span>Paste Existing Fingerprint
                  </button>
                </div>

                {/* Mode A: Enter Gold Details */}
                {goldMode === 'appraise' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))', gap: '1rem', padding: '1.25rem', background: 'var(--dash-surface-2)', borderRadius: '0.875rem', marginBottom: '1.25rem', border: '1px solid var(--dash-border)' }}>
                    <div className="dash-form-group">
                      <label htmlFor="pledge-item-type" className="dash-label">Item Type</label>
                      <select
                        id="pledge-item-type"
                        className="dash-input dash-select"
                        value={goldForm.item_type}
                        onChange={(e) => setGoldForm(f => ({ ...f, item_type: e.target.value }))}
                      >
                        {['Bangle', 'Ring', 'Necklace', 'Bracelet', 'Earring', 'Chain', 'Coin', 'Bar', 'Other'].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div className="dash-form-group">
                      <label htmlFor="pledge-weight-input" className="dash-label">Weight (grams)</label>
                      <input
                        id="pledge-weight-input"
                        type="number"
                        step="0.1"
                        className="dash-input"
                        placeholder="e.g. 22.5"
                        value={goldForm.weight_grams}
                        onChange={(e) => setGoldForm(f => ({ ...f, weight_grams: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="dash-form-group">
                      <label htmlFor="pledge-purity-input" className="dash-label">Purity (%)</label>
                      <input
                        id="pledge-purity-input"
                        type="number"
                        step="0.1"
                        className="dash-input"
                        placeholder="e.g. 91.6"
                        value={goldForm.purity_percent}
                        onChange={(e) => setGoldForm(f => ({ ...f, purity_percent: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="dash-form-group">
                      <label htmlFor="pledge-characteristics-input" className="dash-label">Hallmark / Characteristics</label>
                      <input
                        id="pledge-characteristics-input"
                        type="text"
                        className="dash-input"
                        placeholder="e.g. BIS916 hallmark"
                        value={goldForm.characteristics}
                        onChange={(e) => setGoldForm(f => ({ ...f, characteristics: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {/* Mode B: Paste Fingerprint */}
                {goldMode === 'fingerprint' && (
                  <div className="dash-form-group" style={{ marginBottom: '1.25rem' }}>
                    <label htmlFor="gold-fp-input" className="dash-label">Gold Fingerprint Hash (SHA-256)</label>
                    <input
                      id="gold-fp-input"
                      type="text"
                      className="dash-input"
                      placeholder="64-character hexadecimal gold fingerprint hash"
                      value={customGoldFp}
                      onChange={(e) => setCustomGoldFp(e.target.value)}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--dash-text-faint)', marginTop: '0.25rem', display: 'block' }}>
                      Obtained from the Gold Appraisal tab after testing for cross-lender matches.
                    </span>
                  </div>
                )}

                {/* Loan Terms */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(13rem, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="dash-form-group">
                    <label htmlFor="loan-amount-inr" className="dash-label">Sanctioned Loan Amount (₹)</label>
                    <input
                      id="loan-amount-inr"
                      type="number"
                      step="5000"
                      className="dash-input"
                      placeholder="e.g. 150000"
                      value={loanAmountInr}
                      onChange={(e) => handleInrChange(e.target.value)}
                    />
                  </div>

                  <div className="dash-form-group">
                    <label htmlFor="amount-range-select" className="dash-label">
                      On-Chain Exposure Bucket <span style={{ fontWeight: 400, color: 'var(--dash-text-faint)' }}>(Privacy-preserved)</span>
                    </label>
                    <select
                      id="amount-range-select"
                      className="dash-input dash-select"
                      value={amountRange}
                      onChange={(e) => setAmountRange(e.target.value)}
                    >
                      {Object.entries(AMOUNT_RANGES).map(([k, v]) => (
                        <option key={k} value={k}>{v} (Range {k})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button
                  type="submit"
                  id="register-pledge-btn"
                  loading={registering}
                  aria-label="Register loan pledge and lock gold collateral on consortium registry"
                >
                  <span aria-hidden="true">🔒 </span>Register Pledge &amp; Lock Collateral on Registry
                </Button>
              </form>
            </div>
          )}

          {/* ── TX Hash & Collateral Confirmation (after registration) ── */}
          {txHash && (
            <div className="dash-card" style={{ marginTop: '1.5rem', borderColor: 'rgba(46,139,87,0.5)', background: 'var(--dash-success-bg)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }} aria-hidden="true">✅</span>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--dash-success-text)', marginBottom: '0.5rem' }}>
                    Loan Pledge Successfully Registered on Consortium Registry
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--dash-text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
                    This loan and its gold collateral are now immutably registered across all consortium lenders, preventing duplicate pledging.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div>
                      <span className="dash-label" style={{ fontSize: '0.7rem' }}>PLEDGE ID</span>
                      <strong style={{ display: 'block', fontSize: '1rem', fontFamily: 'monospace' }}>{registeredPledgeId}</strong>
                    </div>
                    <div>
                      <span className="dash-label" style={{ fontSize: '0.7rem' }}>EXPOSURE BUCKET</span>
                      <strong style={{ display: 'block', fontSize: '0.95rem' }}>{AMOUNT_RANGES[amountRange]}</strong>
                    </div>
                  </div>

                  <div style={{ marginBottom: '0.75rem' }}>
                    <span className="dash-label" style={{ fontSize: '0.7rem' }}>LOCKED GOLD FINGERPRINT</span>
                    <code style={{ display: 'block', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--dash-text)', background: 'var(--dash-surface-2)', border: '1px solid var(--dash-border)', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', wordBreak: 'break-all' }}>
                      {boundGoldFp}
                    </code>
                  </div>

                  <div>
                    <span className="dash-label" style={{ fontSize: '0.7rem' }}>FABRIC TRANSACTION HASH</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <code className="dash-table__hash" id="pledge-tx-hash" title={txHash} style={{ maxWidth: 'none', flex: 1 }}>
                        {txHash}
                      </code>
                      <CopyButton text={txHash} id="copy-tx-hash-btn" ariaLabel="Copy transaction hash" />
                    </div>
                  </div>

                  <div style={{ marginTop: '1.25rem' }} className="no-print">
                    <button
                      type="button"
                      className="dash-btn dash-btn--sm dash-btn--secondary"
                      onClick={() => router.push('/dashboard/pledges')}
                    >
                      View in My Pledges <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>

      )}
    </ProtectedLayout>
  );
}

export default function RiskReportPage() {
  return (
    <Suspense fallback={<ProtectedLayout title="Risk Report"><Spinner /></ProtectedLayout>}>
      <RiskReportContent />
    </Suspense>
  );
}
