/**
 * Cache encryption for offline data
 * Uses AES-256-GCM with PBKDF2 key derivation
 *
 * This protects cached snapshots against casual inspection only. If browser
 * storage is copied together with the locally stored offline grant, the copied
 * storage can still be decrypted.
 */

import {
  base64UrlEncodeBytes,
  base64UrlToBytes
} from './crypto';

export interface EncryptedCache {
  salt: string;
  ciphertext: string;
  iv: string;
}

function asBufferSource(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/**
 * Derive encryption key from grant and salt
 */
async function deriveCacheKey(grant: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(grant),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: asBufferSource(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt cache data with grant-derived key
 */
export async function encryptCache(data: unknown, grant: string): Promise<EncryptedCache> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveCacheKey(grant, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(data));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: asBufferSource(iv) },
    key,
    encoded
  );

  return {
    salt: base64UrlEncodeBytes(salt),
    ciphertext: base64UrlEncodeBytes(new Uint8Array(encrypted)),
    iv: base64UrlEncodeBytes(iv)
  };
}

/**
 * Decrypt cache data with grant-derived key
 */
export async function decryptCache(encrypted: EncryptedCache, grant: string): Promise<unknown | null> {
  try {
    const salt = base64UrlToBytes(encrypted.salt);
    const key = await deriveCacheKey(grant, salt);
    const iv = base64UrlToBytes(encrypted.iv);
    const ciphertext = base64UrlToBytes(encrypted.ciphertext);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: asBufferSource(iv) },
      key,
      asBufferSource(ciphertext)
    );

    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch {
    return null;
  }
}
