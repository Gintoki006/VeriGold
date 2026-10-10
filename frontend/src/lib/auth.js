/**
 * VeriGold — Auth Utility Library (Phase 7 §7.2.1)
 *
 * Provides:
 *  - generateKeyPair()      → Ed25519 key pair (tweetnacl)
 *  - signChallenge()        → base64 signature of nonce
 *  - computeBorrowerHash()  → calls backend /api/borrowers/compute-hash
 *
 * Private key is stored in sessionStorage ONLY (never localStorage/cookies).
 * The public key fingerprint is displayed to the lender as their identity reference.
 */

import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, decodeUTF8 } from 'tweetnacl-util';

const SK_KEY = 'vg_signing_key';
const PK_KEY = 'vg_public_key';

// ---------------------------------------------------------------------------
// Key Management
// ---------------------------------------------------------------------------

/**
 * Generate a fresh Ed25519 key pair and store the private key in sessionStorage.
 * @returns {{ publicKey: string, fingerprint: string }}
 *   publicKey   — base64-encoded Ed25519 public key (sent to backend)
 *   fingerprint — first 16 chars of base64(publicKey) used as display identity
 */
export function generateKeyPair() {
  const pair = nacl.sign.keyPair();
  const publicKeyB64  = encodeBase64(pair.publicKey);
  const privateKeyB64 = encodeBase64(pair.secretKey);

  sessionStorage.setItem(PK_KEY, publicKeyB64);
  sessionStorage.setItem(SK_KEY, privateKeyB64);

  return {
    publicKey:   publicKeyB64,
    fingerprint: publicKeyB64.slice(0, 16) + '…',
  };
}

/**
 * Load the existing key pair from sessionStorage (if present).
 * Returns null if no pair exists (e.g. first visit, or after tab close).
 * @returns {{ publicKey: string, fingerprint: string } | null}
 */
export function loadKeyPair() {
  const publicKeyB64  = sessionStorage.getItem(PK_KEY);
  const privateKeyB64 = sessionStorage.getItem(SK_KEY);
  if (!publicKeyB64 || !privateKeyB64) return null;
  return {
    publicKey:   publicKeyB64,
    fingerprint: publicKeyB64.slice(0, 16) + '…',
  };
}

// ---------------------------------------------------------------------------
// Challenge Signing
// ---------------------------------------------------------------------------

/**
 * Sign a challenge nonce with the stored Ed25519 private key.
 * Called immediately when the backend returns the challenge nonce.
 *
 * @param {string} nonceOrMessage - UTF-8 challenge message or nonce from backend
 * @returns {string} base64-encoded Ed25519 signature
 * @throws {Error} if no private key is in sessionStorage
 */
export function signChallenge(nonceOrMessage) {
  const privateKeyB64 = sessionStorage.getItem(SK_KEY);
  if (!privateKeyB64) {
    throw new Error('No signing key found. Generate a key pair first.');
  }
  const secretKey = decodeBase64(privateKeyB64);
  const messageStr = typeof nonceOrMessage === 'string' && nonceOrMessage.startsWith('Sign this to authenticate with VeriGold:')
    ? nonceOrMessage
    : `Sign this to authenticate with VeriGold: ${nonceOrMessage}`;
  const message = decodeUTF8(messageStr);
  const signature = nacl.sign.detached(message, secretKey);
  return encodeBase64(signature);
}

// ---------------------------------------------------------------------------
// Aadhaar → Borrower Hash
// ---------------------------------------------------------------------------

/**
 * Validate Aadhaar format client-side, then call the backend to compute the
 * HMAC-SHA256 borrower hash. Plaintext Aadhaar is NEVER stored client-side.
 *
 * @param {string} aadhaar - Raw 12-digit Aadhaar number (digits only)
 * @param {import('axios').AxiosInstance} apiClient - Axios instance with JWT
 * @returns {Promise<string>} borrower_hash string
 */
export async function computeBorrowerHash(aadhaar, apiClient) {
  if (!aadhaar || typeof aadhaar !== 'string') {
    throw new Error('Aadhaar must be provided as a 12-digit string.');
  }
  // Client-side validation — strips whitespace and hyphens
  const cleaned = aadhaar.replace(/[\s-]/g, '').trim();
  if (!/^\d{12}$/.test(cleaned)) {
    throw new Error('Aadhaar must be exactly 12 numeric digits.');
  }

  const response = await apiClient.post('/api/borrowers/compute-hash', {
    aadhaar: cleaned,
  });

  const hash = response.data?.borrower_hash;
  if (!hash) {
    throw new Error('Backend did not return a borrower_hash. Check /api/borrowers/compute-hash.');
  }
  return hash;
}
