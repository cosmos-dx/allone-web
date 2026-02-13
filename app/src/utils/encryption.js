// Client-side encryption utilities using Expo Crypto API
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const IV_LENGTH = 12;

function stringToUint8Array(str) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code > 255) throw new Error('Only ASCII supported when TextEncoder is unavailable');
    bytes[i] = code;
  }
  return bytes;
}

function uint8ArrayToString(arr) {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(arr);
  }
  return String.fromCharCode.apply(null, arr);
}

// Convert Uint8Array to base64
function uint8ArrayToBase64(arr) {
  return btoa(String.fromCharCode(...arr));
}

function normalizeBase64ForDecode(input) {
  if (typeof input !== 'string') return input;
  let s = input.replace(/\s/g, '').trim();
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const remainder = s.length % 4;
  if (remainder === 2) s += '==';
  else if (remainder === 3) s += '=';
  return s;
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Generate random bytes
function getRandomValues(length) {
  const arr = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
}

// Derive encryption key from user ID and a master secret
export async function deriveEncryptionKey(userId, masterSecret = '') {
  try {
    // Generate a key using SHA256 hash
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      userId + masterSecret + 'allone-salt-' + userId,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    
    return hash;
  } catch (error) {
    console.error('Error deriving encryption key:', error);
    throw error;
  }
}

// Encrypt data (simplified for React Native)
export async function encryptData(plaintext, key) {
  try {
    const data = stringToUint8Array(plaintext);
    const keyBytes = stringToUint8Array(key);
    
    // Simple XOR encryption (for demo - use proper crypto in production)
    const encrypted = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      encrypted[i] = data[i] ^ keyBytes[i % keyBytes.length];
    }
    
    // Generate IV
    const iv = getRandomValues(IV_LENGTH);
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.length);
    combined.set(iv, 0);
    combined.set(encrypted, iv.length);
    
    return uint8ArrayToBase64(combined);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

export async function decryptData(encryptedBase64, key) {
  try {
    const normalized = normalizeBase64ForDecode(encryptedBase64);
    const combined = base64ToUint8Array(normalized);
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);
    
    const keyBytes = stringToUint8Array(key);
    
    // Simple XOR decryption
    const decrypted = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return uint8ArrayToString(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

// Store key securely
export async function storeKey(userId, key) {
  try {
    await SecureStore.setItemAsync(`encryption_key_${userId}`, key);
  } catch (error) {
    console.error('Error storing key:', error);
    throw error;
  }
}

// Retrieve key securely
export async function retrieveKey(userId) {
  try {
    return await SecureStore.getItemAsync(`encryption_key_${userId}`);
  } catch (error) {
    console.error('Error retrieving key:', error);
    return null;
  }
}

// Clear key from storage
export async function clearKey(userId) {
  try {
    await SecureStore.deleteItemAsync(`encryption_key_${userId}`);
  } catch (error) {
    console.error('Error clearing key:', error);
  }
}

