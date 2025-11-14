// Client-side encryption utilities using Web Crypto API

const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

// Derive encryption key from user ID and a master secret
export async function deriveEncryptionKey(userId, masterSecret = '') {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(userId + masterSecret),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const salt = encoder.encode('allone-salt-' + userId);

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

// Encrypt data
export async function encryptData(plaintext, key) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv: iv,
    },
    key,
    data
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

// Decrypt data
export async function decryptData(encryptedBase64, key) {
  try {
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: ENCRYPTION_ALGORITHM,
        iv: iv,
      },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

// Store key in IndexedDB
export async function storeKey(userId, key) {
  const exported = await window.crypto.subtle.exportKey('jwk', key);
  localStorage.setItem(`encryption_key_${userId}`, JSON.stringify(exported));
}

// Retrieve key from IndexedDB
export async function retrieveKey(userId) {
  const exported = localStorage.getItem(`encryption_key_${userId}`);
  if (!exported) return null;

  const keyData = JSON.parse(exported);
  return window.crypto.subtle.importKey(
    'jwk',
    keyData,
    { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

// Clear key from storage
export function clearKey(userId) {
  localStorage.removeItem(`encryption_key_${userId}`);
}