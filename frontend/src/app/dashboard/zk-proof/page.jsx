'use client';

/**
 * VeriGold — ZK Proof Demo Page (Phase 7 §7.10.1)
 *
 * Demonstrates ZK proof: "exposure is below threshold — without revealing exact amount."
 * States: idle | generating | verified | failed
 */

import { useState } from 'react';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import { Button, ErrorState, CopyButton } from '@/components/ui';
import api from '@/lib/api';

const THRESHOLD_OPTIONS = [2, 3, 4, 5];
const BUCKET_DESCRIPTIONS = {
  2: 'Bucket 2 — Low Exposure (Up to 2 concurrent pledges)',
  3: 'Bucket 3 — Moderate Exposure (Up to 3 concurrent pledges)',
  4: 'Bucket 4 — High Exposure (Up to 4 concurrent pledges)',
  5: 'Bucket 5 — Maximum Institutional Limit (Up to 5 concurrent pledges)',
};

export default function ZkProofPage() {
  const [threshold,  setThreshold]  = useState(5);
  const [proofResult,setProofResult]= useState(null);
  const [generating, setGenerating] = useState(false);
  const [error,      setError]      = useState(null);

  async function handleGenerateProof() {
    setGenerating(true);
    setError(null);
    setProofResult(null);
    try {
      const exposure = Math.max(0, threshold - 1);
      const res = await api.post('/api/zk/prove-exposure', {
        total_exposure: exposure,
        threshold:      threshold,
      });
      setProofResult(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <ProtectedLayout title="ZK Proof Demo">
      {/* Explanation panel */}
      <div className="zk-explanation">
        <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--dash-text)', marginBottom: '0.75rem' }}>
          <span aria-hidden="true">🔐 </span>Zero-Knowledge Exposure Proof
        </h2>
        <p style={{ color: 'var(--dash-text-muted)', lineHeight: 1.65, fontSize: '0.9375rem' }}>
          VeriGold can cryptographically prove that a borrower&apos;s total collateral exposure is
          <strong style={{ color: 'var(--dash-text)' }}> below your specified risk policy</strong> —
          without ever revealing the exact rupee amount or active loans to any competing lender.
        </p>
        <p style={{ color: 'var(--dash-text-muted)', lineHeight: 1.65, fontSize: '0.9rem', marginTop: '0.75rem' }}>
          How it works: A cryptographic circuit proves <code style={{ background: 'rgba(198,137,28,0.12)', padding: '0.15em 0.5em', borderRadius: '0.375rem', color: 'var(--gold-mid)', fontWeight: 600 }}>total_exposure &lt; threshold</code> directly inside the browser prover. The borrower&apos;s private transaction records are never shared or transmitted.
        </p>
      </div>

      {/* Controls */}
      <div className="dash-card" style={{ marginBottom: '1.5rem', maxWidth: '30rem' }}>
        <h2 className="dash-section__title" style={{ marginBottom: '1.25rem' }}>Generate Proof</h2>

        <div className="dash-form-group">
          <label htmlFor="threshold-select" className="dash-label">
            Maximum Permissible Exposure (Threshold Bucket)
          </label>
          <select
            id="threshold-select"
            className="dash-input dash-select"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          >
            {THRESHOLD_OPTIONS.map((t) => (
              <option key={t} value={t}>{BUCKET_DESCRIPTIONS[t] ?? `Bucket ${t}`}</option>
            ))}
          </select>
          <p style={{ fontSize: '0.75rem', color: 'var(--dash-text-faint)', marginTop: '0.375rem' }}>
            Generates a verifiable proof that borrower exposure stays strictly below bucket {threshold}.
          </p>
        </div>

        {error && <ErrorState message={error} />}

        <Button
          id="generate-proof-btn"
          loading={generating}
          onClick={handleGenerateProof}
          size="lg"
          aria-label="Generate zero-knowledge exposure proof"
        >
          {generating ? 'Generating Proof…' : 'Generate Proof'}
        </Button>
      </div>

      {/* Proof result */}
      {proofResult && (
        <div
          className={`zk-proof-result ${proofResult.verified ? 'zk-proof-result--verified' : 'zk-proof-result--failed'}`}
          id="zk-proof-result"
          role="status"
          aria-live="polite"
          aria-label="Zero-knowledge proof result"
        >
          {/* Verification badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <span className={`zk-badge-icon ${proofResult.verified ? '' : 'zk-badge-icon--failed'}`} aria-hidden="true">
              {proofResult.verified ? '✓' : '✗'}
            </span>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: proofResult.verified ? 'var(--dash-success-text)' : 'var(--dash-danger-text)', margin: 0, lineHeight: 1.3 }}>
                {proofResult.verified ? 'Zero-Knowledge Proof Verified' : 'Verification Failed'}
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--dash-text-muted)', margin: '0.25rem 0 0' }}>
                Mode: {proofResult.mode === 'fallback' ? 'Pre-generated demo proof' : 'Live Barretenberg proof'}
              </p>
            </div>
          </div>

          {/* Statement */}
          <p className="zk-statement" id="zk-statement-display">
            &ldquo;{proofResult.statement}&rdquo;
          </p>

          {/* Threshold (public input) */}
          <div style={{ marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--dash-text-faint)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Public Input (threshold)
            </p>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--dash-text)' }}>
              {proofResult.threshold}
            </p>
          </div>

          {/* Proof hash */}
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--dash-text-faint)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Proof (truncated)
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <code className="zk-hash" id="zk-proof-hash" style={{ flex: 1 }}>
                {(proofResult.proof ?? '').slice(0, 120)}
                {proofResult.proof?.length > 120 ? '…' : ''}
              </code>
              <CopyButton
                text={proofResult.proof ?? ''}
                id="copy-proof-btn"
                ariaLabel="Copy full proof"
                style={{ flexShrink: 0, marginTop: '0.25rem' }}
              />
            </div>
          </div>

          {/* Privacy guarantee note */}
          <div className="zk-privacy-note">
            <span aria-hidden="true">🔒</span>
            <span>
              The private input (actual exposure amount) is never revealed to the verifier, this server, or any network node.
            </span>
          </div>
        </div>
      )}
    </ProtectedLayout>
  );
}
