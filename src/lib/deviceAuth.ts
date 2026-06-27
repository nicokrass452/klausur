/**
 * Device authentication for offline read-only access
 *
 * This provides browser-bound offline read-only access, NOT hardware-bound device identity.
 *
 * Security Model:
 * - Grant signature verified with embedded public key
 * - Device thumbprint binding (prevent grant reuse on different keys)
 * - Server-generated challenge-response flow
 * - Atomic challenge consumption
 * - Encrypted cache at rest (protection against casual inspection)
 *
 * Limitations:
 * - Not hardware-bound (IndexedDB is not secure storage)
 * - Vulnerable to copied browser storage
 * - No offline revocation (revocation checked only when online)
 * - Vulnerable to XSS attacks
 */

import { supabase } from './supabase';
import { useAppStore } from '../store/useAppStore';
import {
  base64UrlEncodeBytes,
  base64UrlEncodeJson,
  base64UrlToBytes,
  base64UrlDecodeJson,
  bytesToHex,
  hashToken
} from './crypto';
import {
  encryptCache,
  decryptCache,
  type EncryptedCache
} from './cacheEncryption';
import { openDB } from 'idb';
import { OFFLINE_GRANT_AUDIENCE, OFFLINE_READONLY_ENABLED } from './offlineFeatureFlag';

// Algorithm constants
const ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' };
const SIGN_ALGORITHM = { name: 'ECDSA', hash: 'SHA-256' };

// Types
interface OfflineGrantPayload {
  sub: string;              // user_id
  sid: string;              // device_session_id
  scope: 'offline_read';
  aud: string;
  iat: number;
  exp: number;
  cache_max_age_days: number;
  dev_thumbprint: string;
}

interface StoredGrant {
  id: string;
  grant: string;
  device_session_id: string;
  stored_at: string;
}

interface EncryptedCacheEntry {
  id: string;
  encrypted: EncryptedCache;
}

interface OfflineAuthResult {
  user: { id: string; source: 'offline_grant' };
  authMode: 'offline-readonly';
  grantHash: string;
  deviceSessionId: string;
}

function assertOfflineFeatureEnabled(): void {
  if (!OFFLINE_READONLY_ENABLED) {
    throw new Error('Offline read-only access is disabled');
  }
}

function requireSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
}

function asBufferSource(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

// IndexedDB setup
const DB_NAME = 'klausurplaner-device';
const DB_VERSION = 1;

async function getDeviceDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('keys')) {
        db.createObjectStore('keys', { keyPath: 'key_id' });
      }
      if (!db.objectStoreNames.contains('grants')) {
        db.createObjectStore('grants', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'id' });
      }
    }
  });
}

/**
 * Generate or load device keypair
 */
export async function getDeviceKey(): Promise<CryptoKeyPair> {
  assertOfflineFeatureEnabled();
  const db = await getDeviceDB();
  const existing = await db.get('keys', 'device');

  if (existing) {
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      existing.jwk.private,
      ALGORITHM,
      true,
      ['sign']
    );
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      existing.jwk.public,
      ALGORITHM,
      true,
      ['verify']
    );
    return { privateKey, publicKey };
  }

  const keypair = await crypto.subtle.generateKey(ALGORITHM, true, ['sign', 'verify']);

  const privateJwk = await crypto.subtle.exportKey('jwk', keypair.privateKey);
  const publicJwk = await crypto.subtle.exportKey('jwk', keypair.publicKey);

  await db.put('keys', {
    key_id: 'device',
    jwk: { private: privateJwk, public: publicJwk },
    created_at: new Date().toISOString()
  });

  return keypair;
}

/**
 * Get device hash (SHA-256 of device public key)
 */
export async function getDeviceHash(): Promise<string> {
  assertOfflineFeatureEnabled();
  const { publicKey } = await getDeviceKey();
  const spki = await crypto.subtle.exportKey('spki', publicKey);
  const hash = await crypto.subtle.digest('SHA-256', spki);
  return bytesToHex(new Uint8Array(hash));
}

/**
 * Request a registration challenge from server
 */
export async function createChallenge(deviceHash: string): Promise<{
  challenge_id: string;
  nonce: string;
}> {
  assertOfflineFeatureEnabled();
  const response = await requireSupabaseClient().functions.invoke('get-device-challenge', {
    body: { device_hash: deviceHash }
  });

  if (response.error) {
    throw new Error(response.error.message || 'Failed to create challenge');
  }

  return response.data;
}

/**
 * Register device with Supabase
 */
export async function registerDevice(): Promise<{
  success: boolean;
  offline_grant?: string;
  device_session_id?: string;
  reason?: string;
}> {
  assertOfflineFeatureEnabled();
  const deviceHash = await getDeviceHash();
  const { publicKey, privateKey } = await getDeviceKey();
  const publicJwk = await crypto.subtle.exportKey('jwk', publicKey);

  // Step 1: Get server-generated challenge
  const challenge = await createChallenge(deviceHash);

  // Step 2: Sign the nonce with device key
  const signature = await crypto.subtle.sign(
    SIGN_ALGORITHM,
    privateKey,
    new TextEncoder().encode(challenge.nonce)
  );

  // Step 3: Register with signed challenge
  const response = await requireSupabaseClient().functions.invoke('register-device', {
    body: {
      device_hash: deviceHash,
      public_key_jwk: publicJwk,
      challenge_id: challenge.challenge_id,
      device_signature: base64UrlEncodeBytes(new Uint8Array(signature))
    }
  });

  if (response.error) {
    return {
      success: false,
      reason: response.error.message || 'Registration failed'
    };
  }

  // Step 4: Store grant
  await storeOfflineGrant(response.data.offline_grant, response.data.device_session_id);

  // Step 5: Encrypt and store current cache snapshot
  const state = useAppStore.getState();
  const snapshot = toOfflineSnapshot(state);
  const encryptedCache = await encryptCache(snapshot, response.data.offline_grant);

  await storeEncryptedCache(encryptedCache);

  return {
    success: true,
    offline_grant: response.data.offline_grant,
    device_session_id: response.data.device_session_id
  };
}

/**
 * Store offline grant in IndexedDB
 */
export async function storeOfflineGrant(
  grant: string,
  deviceSessionId: string
): Promise<void> {
  assertOfflineFeatureEnabled();
  const db = await getDeviceDB();
  await db.put('grants', {
    id: 'offline',
    grant,
    device_session_id: deviceSessionId,
    stored_at: new Date().toISOString()
  });
}

/**
 * Get stored offline grant
 */
export async function getOfflineGrant(): Promise<StoredGrant | null> {
  if (!OFFLINE_READONLY_ENABLED) return null;
  const db = await getDeviceDB();
  return db.get('grants', 'offline');
}

/**
 * Clear offline grant
 */
export async function clearOfflineGrant(): Promise<void> {
  if (!OFFLINE_READONLY_ENABLED) return;
  const db = await getDeviceDB();
  await db.delete('grants', 'offline');
}

/**
 * Verify offline grant signature and claims
 */
export async function verifyOfflineGrant(grant: string): Promise<OfflineGrantPayload | null> {
  if (!OFFLINE_READONLY_ENABLED) return null;
  if (!import.meta.env.VITE_OFFLINE_PUBLIC_KEY) return null;

  try {
    const [headerB64, payloadB64, sigB64] = grant.split('.');
    if (!headerB64 || !payloadB64 || !sigB64) return null;

    // Import public key (embedded at build time)
    const publicKey = await crypto.subtle.importKey(
      'spki',
      asBufferSource(base64UrlToBytes(import.meta.env.VITE_OFFLINE_PUBLIC_KEY)),
      ALGORITHM,
      true,
      ['verify']
    );

    // Verify header
    const header = base64UrlDecodeJson<{ alg: string }>(headerB64);
    if (header.alg !== 'ES256') return null;

    // Verify signature
    const data = `${headerB64}.${payloadB64}`;
    const signature = base64UrlToBytes(sigB64);

    if (signature.length !== 64) return null;

    const valid = await crypto.subtle.verify(
      SIGN_ALGORITHM,
      publicKey,
      asBufferSource(signature),
      new TextEncoder().encode(data)
    );

    if (!valid) return null;

    // Verify payload claims
    const payload = base64UrlDecodeJson<OfflineGrantPayload>(payloadB64);

    if (payload.scope !== 'offline_read') return null;
    if (payload.aud !== OFFLINE_GRANT_AUDIENCE) return null;
    if (Date.now() / 1000 > payload.exp) return null;
    if (!(await deviceMatchesGrant(payload))) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Check if device matches grant
 */
async function deviceMatchesGrant(payload: OfflineGrantPayload): Promise<boolean> {
  const { publicKey } = await getDeviceKey();
  const spki = await crypto.subtle.exportKey('spki', publicKey);
  const hash = await crypto.subtle.digest('SHA-256', spki);
  const thumbprint = bytesToHex(new Uint8Array(hash));

  return thumbprint === payload.dev_thumbprint;
}

/**
 * Get offline authentication for read-only mode
 * @returns OfflineAuthResult if grant is valid, null otherwise
 */
export async function getOfflineAuth(): Promise<OfflineAuthResult | null> {
  if (!OFFLINE_READONLY_ENABLED) return null;
  const stored = await getOfflineGrant();
  if (!stored?.grant) return null;

  const payload = await verifyOfflineGrant(stored.grant);
  if (!payload) {
    await clearOfflineGrant();
    return null;
  }

  return {
    user: { id: payload.sub, source: 'offline_grant' },
    authMode: 'offline-readonly',
    grantHash: await hashToken(stored.grant),
    deviceSessionId: payload.sid
  };
}

/**
 * Store encrypted cache
 */
export async function storeEncryptedCache(encrypted: EncryptedCache): Promise<void> {
  assertOfflineFeatureEnabled();
  const db = await getDeviceDB();
  await db.put('cache', {
    id: 'offline',
    encrypted
  });
}

/**
 * Get encrypted cache
 */
async function getEncryptedCache(): Promise<EncryptedCache | null> {
  if (!OFFLINE_READONLY_ENABLED) return null;
  const db = await getDeviceDB();
  const entry = await db.get('cache', 'offline');
  return entry?.encrypted || null;
}

/**
 * Get and decrypt cached snapshot
 */
export async function getOfflineSnapshot(grant: string): Promise<unknown | null> {
  if (!OFFLINE_READONLY_ENABLED) return null;
  const encrypted = await getEncryptedCache();
  if (!encrypted) return null;

  return decryptCache(encrypted, grant);
}

/**
 * Revalidate grant with server
 * @returns true if valid, false if explicitly invalid, null if network error (uncertain)
 */
export async function revalidateGrantOnline(
  deviceSessionId: string,
  grantHash: string
): Promise<boolean | null> {
  if (!OFFLINE_READONLY_ENABLED) return null;
  try {
    const response = await requireSupabaseClient().functions.invoke('revalidate-grant', {
      body: { device_session_id: deviceSessionId, grant_hash: grantHash }
    });

    if (response.error) {
      // Network/temporary error - keep local grant
      console.warn('Grant revalidation failed (temporary):', response.error);
      return null;
    }

    if (response.data?.valid === false) {
      // Server explicitly says invalid
      await clearOfflineGrant();
      return false;
    }

    return response.data?.valid === true ? true : null;
  } catch (error) {
    // Network error - keep grant
    console.warn('Grant revalidation network error:', error);
    return null;
  }
}

/**
 * Convert store state to offline snapshot (for encryption)
 */
function toOfflineSnapshot(state: unknown): unknown {
  // Extract only the data we want to cache, not auth state
  const s = state as {
    exams: unknown[];
    topics: unknown[];
    studyTasks: unknown[];
    materials: unknown[];
    learningGroups: unknown[];
    stats: unknown;
    settings: unknown;
  };

  return {
    exams: s.exams || [],
    topics: s.topics || [],
    studyTasks: s.studyTasks || [],
    materials: s.materials || [],
    learningGroups: s.learningGroups || [],
    stats: s.stats || {},
    settings: s.settings || {}
  };
}
