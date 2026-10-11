'use client';

/**
 * VeriGold — Authentication Page (Phase 7 §7.4.1)
 *
 * Multi-Institution Ed25519 challenge-response login flow:
 *   - Choose your institutional bank (Org 1, Org 2, Org 3, Org 4)
 *   - One-Click Fast Login OR Step-by-step Ed25519 cryptographic signing
 *   - JWT issued with corresponding fabric_msp_id and organization_name
 */

import { useState, useEffect, useSyncExternalStore, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { generateKeyPair, loadKeyPair, signChallenge } from '@/lib/auth';
import useAuthStore from '@/store/auth';
import api from '@/lib/api';
import { Spinner, ThemeToggle } from '@/components/ui';

const INSTITUTIONS = [
  { msp_id: 'Org1MSP', name: 'Shri Lakshmi Finance Ltd', role: 'Org 1 • Primary / Admin', icon: '🏛️' },
  { msp_id: 'Org2MSP', name: 'Sunrise Gold Loans', role: 'Org 2 • Member Bank', icon: '🏦' },
  { msp_id: 'Org3MSP', name: 'Muthoot Quick Gold', role: 'Org 3 • Member Bank', icon: '🪙' },
  { msp_id: 'Org4MSP', name: 'Manappuram Finance Ltd', role: 'Org 4 • Member Bank', icon: '🏢' },
];

const STEPS = [
  { num: 1, label: 'Generate Session Key',      desc: 'Creates a secure cryptographic credential for this session.' },
  { num: 2, label: 'Request Verification',       desc: 'Consortium network issues a single-use authentication prompt.' },
  { num: 3, label: 'Cryptographic Signature',    desc: 'Verifies institution credentials against the Fabric registry.' },
  { num: 4, label: 'Access Authorized',          desc: 'Session approved — redirecting to your institution dashboard.' },
];

function stepStatus(currentStep, stepNum) {
  if (stepNum < currentStep) return 'done';
  if (stepNum === currentStep) return 'active';
  return '';
}


const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function AuthPageContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirect     = searchParams.get('redirect') || '/dashboard';
  const { login, logout, isAuthenticated } = useAuthStore();

  const isMounted = useMounted();
  const [selectedBank, setSelectedBank] = useState('Org1MSP');
  const [explicitKey,  setKeyInfo]      = useState(undefined);
  const [explicitStep, setStep]         = useState(undefined);
  const [error,        setError]        = useState(null);
  const [isLoading,    setIsLoading]    = useState(false);
  const [challengeId,  setChallengeId]  = useState(null);

  const initialKey = isMounted ? loadKeyPair() : null;
  const keyInfo    = explicitKey !== undefined ? explicitKey : initialKey;
  const step       = explicitStep !== undefined ? explicitStep : (keyInfo ? 2 : 1);

  // Redirect immediately only if already logged in with a VERIFIED session
  useEffect(() => {
    if (isAuthenticated) {
      api.get('/api/auth/me')
        .then(() => {
          router.replace(redirect);
        })
        .catch(() => {
          // Dead or expired token — clear auth state so user can log in without loops
          logout();
        });
    }
  }, [isAuthenticated, logout, redirect, router]);

  // ── One-Click Quick Login ─────────────────────────────────────────────────
  async function handleOneClickLogin(bankMspId) {
    setIsLoading(true);
    setError(null);
    try {
      let currentKey = loadKeyPair();
      if (!currentKey) {
        currentKey = generateKeyPair();
        setKeyInfo(currentKey);
      }
      const chalRes = await api.post('/api/auth/challenge', {
        public_key: currentKey.publicKey,
      });
      const { challenge_id, nonce } = chalRes.data;
      const signature = signChallenge(nonce);
      const verifyRes = await api.post('/api/auth/verify', {
        challenge_id,
        signature,
        public_key: currentKey.publicKey,
        msp_id: bankMspId,
      });
      const { access_token, lender } = verifyRes.data;
      login(access_token, lender);
      setStep(4);
      setTimeout(() => router.replace(redirect), 500);
    } catch (e) {
      setError(e.message || 'One-click login failed.');
      setIsLoading(false);
    }
  }

  // ── Step 1: Generate key pair ─────────────────────────────────────────────
  function handleGenerateKey() {
    setIsLoading(true);
    setError(null);
    try {
      const info = generateKeyPair();
      setKeyInfo(info);
      setStep(2);
    } catch (e) {
      setError('Key generation failed: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Step 2: Request challenge ─────────────────────────────────────────────
  async function handleRequestChallenge() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/auth/challenge', {
        public_key: keyInfo.publicKey,
      });
      const { challenge_id, nonce } = res.data;
      setChallengeId(challenge_id);
      setStep(3);
      // Auto-sign immediately
      await handleSign(challenge_id, nonce);
    } catch (e) {
      const msg = e.message || 'Failed to request challenge.';
      if (msg.includes('inactive')) setError('Your lender account is not yet activated. Contact the VeriGold administrator.');
      else setError(msg);
      setIsLoading(false);
    }
  }

  // ── Step 3: Auto-sign + submit ────────────────────────────────────────────
  async function handleSign(cid, nonce) {
    try {
      const signature = signChallenge(nonce);
      const res = await api.post('/api/auth/verify', {
        challenge_id: cid,
        signature,
        public_key: keyInfo?.publicKey,
        msp_id: selectedBank,
      });
      const { access_token, lender } = res.data;
      login(access_token, lender);
      setStep(4);
      setTimeout(() => router.replace(redirect), 600);
    } catch (e) {
      const msg = e.message || 'Authentication failed.';
      if (msg.includes('expired')) setError('Challenge expired. Please try again.');
      else if (msg.includes('invalid')) setError('Signature mismatch. Key may be corrupted — clear session and retry.');
      else setError(msg);
      setStep(2);
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    sessionStorage.clear();
    setKeyInfo(null);
    setStep(1);
    setError(null);
    setChallengeId(null);
  }

  function handleBankKeyDown(e, currentIndex) {
    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % INSTITUTIONS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + INSTITUTIONS.length) % INSTITUTIONS.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = INSTITUTIONS.length - 1;
    } else {
      return;
    }
    const nextBank = INSTITUTIONS[nextIndex].msp_id;
    setSelectedBank(nextBank);
    const nextEl = document.getElementById(`select-bank-${nextBank.toLowerCase()}`);
    if (nextEl) nextEl.focus();
  }

  const selectedInst = INSTITUTIONS.find(i => i.msp_id === selectedBank) || INSTITUTIONS[0];

  return (
    <main className="auth-page" id="auth-main" style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: '1.25rem', right: '1.5rem', zIndex: 50 }}>
        <ThemeToggle id="auth-theme-toggle" />
      </div>
      <div className="auth-card" style={{ maxWidth: '32rem' }}>
        {/* Brand */}
        <div className="auth-card__brand">
          <div className="auth-card__icon" aria-hidden="true">VG</div>
          <h1 className="auth-card__title">VeriGold</h1>
          <p className="auth-card__sub">Institutional Lender Portal</p>
        </div>

        {/* Institution / Bank Selection */}
        <form onSubmit={(e) => { e.preventDefault(); handleOneClickLogin(selectedBank); }} id="auth-institution-form">
          <div style={{ marginBottom: '1.25rem' }}>
            <span
              id="bank-group-label"
              style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--dash-text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}
            >
              Select Institutional Bank:
            </span>
            <div
              className="auth-bank-grid"
              role="radiogroup"
              aria-labelledby="bank-group-label"
            >
              {INSTITUTIONS.map((inst, idx) => {
                const isSelected = selectedBank === inst.msp_id;
                return (
                  <button
                    key={inst.msp_id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    id={`select-bank-${inst.msp_id.toLowerCase()}`}
                    onClick={() => setSelectedBank(inst.msp_id)}
                    onKeyDown={(e) => handleBankKeyDown(e, idx)}
                    className={`auth-bank-option ${isSelected ? 'auth-bank-option--selected' : ''}`}
                  >
                    <span className="auth-bank-option__icon" aria-hidden="true">{inst.icon}</span>
                    <div>
                      <div className="auth-bank-option__title">
                        {inst.name}
                      </div>
                      <div className="auth-bank-option__role">
                        {inst.role}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* One-Click Fast Login */}
          <button
            type="submit"
            id="auth-one-click-login-btn"
            className="dash-btn dash-btn--primary"
            style={{ width: '100%', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            disabled={isLoading}
          >
            {isLoading && <span className="spinner" aria-hidden="true" />}
            <span aria-hidden="true">⚡ </span>Sign In as {selectedInst.name}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--dash-border)' }} />
          <span style={{ fontSize: '0.6875rem', color: 'var(--dash-text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            or step-by-step cryptographic signing
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--dash-border)' }} />
        </div>

        {/* Error */}
        {error && (
          <div className="dash-error" role="alert" style={{ marginBottom: '1rem' }}>
            <span className="dash-error__icon" aria-hidden="true">⚠</span>
            <span className="dash-error__msg">{error}</span>
            <button type="button" className="dash-error__retry" onClick={handleReset} id="auth-reset-btn" aria-label="Reset authentication flow">Reset</button>
          </div>
        )}

        {/* Step list */}
        <ol className="auth-steps" aria-label="Authentication progress">
          {STEPS.map((s) => {
            const status = stepStatus(step, s.num);
            return (
              <li key={s.num} className={`auth-step ${status}`} aria-current={status === 'active' ? 'step' : undefined}>
                <div className="auth-step__num">
                  <span className="sr-only">Step {s.num}: </span>
                  <span aria-hidden="true">{status === 'done' ? '✓' : s.num}</span>
                </div>
                <div>
                  <div className="auth-step__label">{s.label}</div>
                  <div className="auth-step__desc">{s.desc}</div>

                  {/* Step 1 action */}
                  {s.num === 1 && status === 'active' && (
                    <button
                      id="auth-generate-key-btn"
                      className="dash-btn dash-btn--primary dash-btn--sm"
                      style={{ marginTop: '0.75rem' }}
                      onClick={handleGenerateKey}
                      disabled={isLoading}
                      aria-label="Generate Ed25519 identity key pair"
                    >
                      {isLoading && <span className="spinner" aria-hidden="true" />}
                      Generate Identity
                    </button>
                  )}

                  {/* Step 1 done — show fingerprint */}
                  {s.num === 1 && status === 'done' && keyInfo && (
                    <code style={{ fontSize: '0.75rem', color: 'var(--dash-text-faint)', display: 'block', marginTop: '0.25rem' }}>
                      {keyInfo.fingerprint}
                    </code>
                  )}

                  {/* Step 2 action */}
                  {s.num === 2 && status === 'active' && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {keyInfo && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--dash-text-faint)' }}>Identity:</span>
                          <code style={{ fontSize: '0.75rem', color: 'var(--dash-warning-text)' }}>{keyInfo.fingerprint}</code>
                        </div>
                      )}
                      <button
                        id="auth-request-challenge-btn"
                        className="dash-btn dash-btn--primary dash-btn--sm"
                        onClick={handleRequestChallenge}
                        disabled={isLoading}
                        aria-label="Request authentication challenge from server"
                      >
                        {isLoading && <span className="spinner" aria-hidden="true" />}
                        {isLoading ? 'Requesting…' : `Sign as ${selectedInst.name}`}
                      </button>
                      <button
                        className="dash-btn dash-btn--ghost dash-btn--sm"
                        onClick={handleReset}
                        id="auth-new-identity-btn"
                        style={{ fontSize: '0.75rem' }}
                      >
                        Use new identity
                      </button>
                    </div>
                  )}

                  {/* Step 3 — auto-signing, no action needed */}
                  {s.num === 3 && status === 'active' && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--dash-text-faint)', marginTop: '0.5rem' }}>
                      Signing challenge for {selectedInst.name}… please wait.
                    </p>
                  )}

                  {/* Step 4 — success */}
                  {s.num === 4 && status === 'active' && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--dash-success-text)', marginTop: '0.5rem' }}>
                      <span aria-hidden="true">✓ </span>Authenticated as {selectedInst.name}. Redirecting…
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <p style={{ fontSize: '0.75rem', color: 'var(--dash-text-faint)', textAlign: 'center', marginTop: '1.5rem' }}>
          Your private key is stored in this browser session only and is never transmitted.
        </p>
      </div>
    </main>
  );
}

/** Suspense wrapper required because AuthPageContent calls useSearchParams() */
export default function AuthPage() {
  return (
    <Suspense fallback={
      <main className="auth-page">
        <div className="auth-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '20rem' }}>
          <Spinner label="Loading authentication…" />
        </div>
      </main>
    }>
      <AuthPageContent />
    </Suspense>
  );
}
