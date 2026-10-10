'use client';

/**
 * VeriGold — Gold Appraisal Page (Phase 7 §7.7.1)
 *
 * Form to compute a gold item fingerprint and check for collateral re-pledge matches.
 * States: idle | computing | match_found | no_match | photo_processing | error
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import { Button, ErrorState, CopyButton } from '@/components/ui';
import api from '@/lib/api';

const ITEM_TYPES = ['Ring', 'Necklace', 'Bangle', 'Bracelet', 'Earring', 'Chain', 'Coin', 'Bar', 'Other'];

export default function GoldAppraisalPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    weight_grams:     '',
    purity_percent:   '',
    item_type:        'Ring',
    item_count:       '1',
    length_mm:        '',
    width_mm:         '',
    characteristics:  '',
  });
  const [photoFile,     setPhotoFile]     = useState(null);
  const [photoPreview,  setPhotoPreview]  = useState(null);
  const [fingerprint,   setFingerprint]   = useState(null);
  const [matchResult,   setMatchResult]   = useState(null);
  const [computing,     setComputing]     = useState(false);
  const [matching,      setMatching]      = useState(false);
  const [error,         setError]         = useState(null);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handlePhoto(e) {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (JPEG, PNG, or WebP).');
        e.target.value = '';
        setPhotoFile(null);
        setPhotoPreview(null);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Image file exceeds 10 MB limit. Please select a smaller photo.');
        e.target.value = '';
        setPhotoFile(null);
        setPhotoPreview(null);
        return;
      }
      setError(null);
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      setPhotoFile(null);
      setPhotoPreview(null);
    }
  }

  function handleClearPhoto() {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    const input = document.getElementById('photo-upload');
    if (input) input.value = '';
  }

  // Step 1: Compute fingerprint
  async function handleComputeFingerprint(e) {
    e.preventDefault();
    setComputing(true);
    setError(null);
    setFingerprint(null);
    setMatchResult(null);
    try {
      const weight = parseFloat(form.weight_grams);
      if (isNaN(weight) || weight <= 0) {
        throw new Error('Please enter a valid positive gold weight in grams (e.g. 15.5).');
      }
      if (weight > 10000) {
        throw new Error('Gold weight exceeds single-appraisal limit (10,000g). Please enter an amount up to 10kg.');
      }
      const purity = parseFloat(form.purity_percent);
      if (isNaN(purity) || purity <= 0 || purity > 100) {
        throw new Error('Purity must be a valid percentage between 0.1% and 100% (e.g. 91.6 for 22K).');
      }
      const itemCount = parseInt(form.item_count, 10);
      if (isNaN(itemCount) || itemCount < 1) {
        throw new Error('Item count must be at least 1.');
      }

      const payload = {
        weight_grams:   weight,
        purity_percent: purity,
        item_type:      form.item_type || 'Ring',
        item_count:     itemCount,
        dimensions:     {
          length_mm: form.length_mm ? parseFloat(form.length_mm) : null,
          width_mm:  form.width_mm  ? parseFloat(form.width_mm)  : null,
        },
        characteristics: form.characteristics?.trim() || null,
      };

      // If photo provided, send as multipart; else send JSON
      let res;
      if (photoFile) {
        const fd = new FormData();
        fd.append('data', JSON.stringify(payload));
        fd.append('photo', photoFile);
        res = await api.post('/api/gold/fingerprint', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await api.post('/api/gold/fingerprint', payload);
      }

      setFingerprint(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setComputing(false);
    }
  }

  // Step 2: Check for collateral re-pledge match
  async function handleMatchCheck() {
    if (!fingerprint) return;
    setMatching(true);
    setError(null);
    setMatchResult(null);
    try {
      const hash = fingerprint.fingerprint_hash || fingerprint.fingerprint;
      const res = await api.post('/api/gold/match-check', {
        fingerprint:      hash,
        fingerprint_hash: hash,
        phash:            fingerprint.phash ?? null,
      });
      setMatchResult(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setMatching(false);
    }
  }

  const matchFound = matchResult?.match_found === true;

  return (
    <ProtectedLayout title="Gold Appraisal">
      <div style={{ maxWidth: '48rem' }}>
        <p style={{ color: 'var(--dash-text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Enter the gold item details to generate a cryptographic fingerprint,
          then check whether the same collateral is already pledged elsewhere.
        </p>

        {error && <ErrorState message={error} onRetry={undefined} />}

        {/* ── Appraisal Form ── */}
        <form onSubmit={handleComputeFingerprint} id="gold-appraisal-form" noValidate>
          <div className="dash-card" style={{ marginBottom: '1.5rem' }}>
            <h2 className="dash-section__title" style={{ marginBottom: '1.25rem' }}>Item Details</h2>

            <div className="dash-form-grid-2">
              <div className="dash-form-group">
                <label htmlFor="weight-input" className="dash-label">Weight (grams)</label>
                <input
                  id="weight-input"
                  name="weight_grams"
                  type="number"
                  step="0.1"
                  min="0"
                  className="dash-input"
                  placeholder="e.g. 22.5"
                  value={form.weight_grams}
                  onChange={handleChange}
                  required
                  aria-required="true"
                />
              </div>

              <div className="dash-form-group">
                <label htmlFor="purity-input" className="dash-label">
                  Purity (%)
                  <span style={{ marginLeft: '0.5rem', fontWeight: 400, color: 'var(--dash-text-faint)', fontSize: '0.75rem' }}>
                    22K = 91.6% • 18K = 75.0% • 24K = 99.9%
                  </span>
                </label>
                <input
                  id="purity-input"
                  name="purity_percent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  className="dash-input"
                  placeholder="e.g. 91.6"
                  value={form.purity_percent}
                  onChange={handleChange}
                  required
                  aria-required="true"
                />
              </div>

              <div className="dash-form-group">
                <label htmlFor="item-type-select" className="dash-label">Item Type</label>
                <select
                  id="item-type-select"
                  name="item_type"
                  className="dash-input dash-select"
                  value={form.item_type}
                  onChange={handleChange}
                >
                  {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="dash-form-group">
                <label htmlFor="item-count-input" className="dash-label">Item Count</label>
                <input
                  id="item-count-input"
                  name="item_count"
                  type="number"
                  min="1"
                  className="dash-input"
                  value={form.item_count}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="dash-form-group">
                <label htmlFor="length-input" className="dash-label">Length (mm) <span style={{ fontWeight: 400, color: 'var(--dash-text-faint)' }}>optional</span></label>
                <input id="length-input" name="length_mm" type="number" step="0.1" className="dash-input" placeholder="—" value={form.length_mm} onChange={handleChange} />
              </div>

              <div className="dash-form-group">
                <label htmlFor="width-input" className="dash-label">Width (mm) <span style={{ fontWeight: 400, color: 'var(--dash-text-faint)' }}>optional</span></label>
                <input id="width-input" name="width_mm" type="number" step="0.1" className="dash-input" placeholder="—" value={form.width_mm} onChange={handleChange} />
              </div>
            </div>

            <div className="dash-form-group">
              <label htmlFor="characteristics-input" className="dash-label">
                Distinguishing Features &amp; Hallmarks <span style={{ fontWeight: 400, color: 'var(--dash-text-faint)' }}>optional</span>
              </label>
              <textarea
                id="characteristics-input"
                name="characteristics"
                className="dash-input dash-textarea"
                placeholder="BIS 916 hallmark, jeweler stamp, unique engravings…"
                value={form.characteristics}
                onChange={handleChange}
              />
            </div>

            <div className="dash-form-group">
              <label htmlFor="photo-upload" className="dash-label">
                Ornament Photo <span style={{ fontWeight: 400, color: 'var(--dash-text-faint)' }}>optional — enables visual similarity comparison across lenders</span>
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhoto}
                className="dash-input"
                style={{ cursor: 'pointer' }}
              />
              {photoPreview && (
                <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'var(--dash-surface-2)', border: '1px solid var(--dash-border)', borderRadius: '0.75rem' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview}
                    alt={`Selected ornament collateral preview: ${photoFile?.name ?? 'uploaded image'}`}
                    style={{ width: '4rem', height: '4rem', objectFit: 'cover', borderRadius: '0.5rem', border: '1px solid var(--dash-border)' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--dash-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {photoFile?.name}
                    </p>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--dash-text-muted)' }}>
                      {photoFile ? `${(photoFile.size / 1024).toFixed(1)} KB` : ''} • Ready for perceptual hash
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearPhoto}
                    className="dash-btn dash-btn--xs dash-btn--ghost"
                    aria-label="Remove uploaded ornament photo"
                  >
                    <span aria-hidden="true">✕ </span>Remove
                  </button>
                </div>
              )}
            </div>

            <Button
              type="submit"
              id="compute-fingerprint-btn"
              loading={computing}
              disabled={!form.weight_grams || !form.purity_percent}
              aria-label="Generate unique cryptographic fingerprint for this gold item"
            >
              Generate Gold Fingerprint
            </Button>
          </div>
        </form>

        {/* ── Fingerprint Result ── */}
        {fingerprint && (
          <div className="dash-card" style={{ marginBottom: '1.5rem', borderColor: 'var(--dash-border-hover)' }}>
            <h2 className="dash-section__title" style={{ marginBottom: '1rem' }}>Fingerprint Generated</h2>

            <div className="dash-form-group" style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span id="fingerprint-hash-label" className="dash-label">Gold Fingerprint Hash</span>
                <CopyButton
                  text={fingerprint.fingerprint_hash || fingerprint.fingerprint}
                  showText
                  ariaLabel="Copy fingerprint hash"
                />
              </div>
              <code
                id="fingerprint-hash-display"
                aria-labelledby="fingerprint-hash-label"
                style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--dash-text)', background: 'var(--dash-surface-2)', border: '1px solid var(--dash-border)', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', wordBreak: 'break-all', display: 'block', marginTop: '0.25rem' }}
              >
                {fingerprint.fingerprint_hash || fingerprint.fingerprint}
              </code>
            </div>

            {fingerprint.phash && (
              <div className="dash-form-group" style={{ marginBottom: '0.75rem' }}>
                <span id="phash-label" className="dash-label">Perceptual Image Hash (Visual Signature)</span>
                <code aria-labelledby="phash-label" style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--dash-text)', background: 'var(--dash-surface-2)', border: '1px solid var(--dash-border)', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', display: 'block', marginTop: '0.25rem' }}>
                  {fingerprint.phash}
                </code>
              </div>
            )}

            <Button
              id="check-match-btn"
              variant="secondary"
              loading={matching}
              onClick={handleMatchCheck}
              aria-label="Verify whether this gold is already pledged with another lender"
            >
              Verify Collateral Across Lenders
            </Button>
          </div>
        )}

        {/* ── Match Result ── */}
        {matchResult && (
          <div
            id="match-result-display"
            className="dash-card"
            style={{
              borderColor: matchFound ? 'rgba(198,40,40,0.4)' : 'rgba(26,125,70,0.35)',
              background: matchFound ? 'var(--dash-danger-bg)' : 'var(--dash-success-bg)',
            }}
            role="alert"
            aria-live="polite"
          >
            {matchFound ? (
              <>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--dash-danger-text)', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                  <span aria-hidden="true">⚠ </span>Duplicate Collateral Detected — High Risk
                </h3>
                <p style={{ color: 'var(--dash-danger-text)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  This gold item matches an active pledge recorded on the consortium registry.
                  To protect against duplicate pledge fraud, do not disburse loan funds without branch escalation.
                </p>
                {matchResult.matching_lender && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--dash-text-faint)' }}>
                    Currently pledged at consortium member: <code>{matchResult.matching_lender}</code>
                  </p>
                )}
              </>
            ) : (
              <>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--dash-success-text)', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                  <span aria-hidden="true">✓ </span>Collateral Verified — No Duplicate Found
                </h3>
                <p style={{ color: 'var(--dash-success-text)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  This item&apos;s fingerprint has no active matches in the consortium registry. This ornament is clear to be pledged.
                </p>
                <button
                  type="button"
                  className="dash-btn dash-btn--sm dash-btn--primary"
                  onClick={() => {
                    const hash = fingerprint?.fingerprint_hash || fingerprint?.fingerprint;
                    router.push(`/dashboard?gold_fp=${encodeURIComponent(hash)}`);
                  }}
                >
                  Verify Borrower &amp; Create Pledge →
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
