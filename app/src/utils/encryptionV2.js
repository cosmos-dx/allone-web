/**
 * Enhanced Encryption Utilities using AES-256-CBC with HMAC-SHA256
 * Provides authenticated encryption for secure password storage
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import Aes from 'react-native-aes-crypto';

// Constants
const ALGORITHM = 'aes-256-cbc';
const KEY_SIZE = 256; // bits
const SALT_SIZE = 32; // bytes
const IV_SIZE = 16; // bytes (128 bits for CBC)
const PBKDF2_ITERATIONS = 100000;
const HMAC_SIZE = 32; // bytes (SHA-256 output)

/**
 * Generate a cryptographically secure random salt
 */
async function generateSalt() {
  const randomBytes = await Crypto.getRandomBytesAsync(SALT_SIZE);
  return arrayBufferToBase64(randomBytes);
}

/**
 * Generate a cryptographically secure random IV
 */
async function generateIV() {
  const randomBytes = await Crypto.getRandomBytesAsync(IV_SIZE);
  return arrayBufferToBase64(randomBytes);
}

/**
 * Convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derive encryption key from user ID and master password using PBKDF2
 * @param {string} userId - User's unique identifier
 * @param {string} masterPassword - User's master password or passphrase
 * @param {string} salt - Base64 encoded salt (optional, will be generated if not provided)
 * @returns {Promise<{key: string, salt: string}>} - Derived key and salt in base64
 */
export async function deriveEncryptionKey(userId, masterPassword = '', salt = null) {
  try {
    // Generate or use provided salt
    const saltBase64 = salt || await generateSalt();
    
    // Combine userId and masterPassword for additional entropy
    const password = `${userId}:${masterPassword}`;
    
    // Use PBKDF2 to derive key
    const key = await Aes.pbkdf2(password, saltBase64, PBKDF2_ITERATIONS, KEY_SIZE);
    
    return {
      key,
      salt: saltBase64,
    };
  } catch (error) {
    console.error('Error deriving encryption key:', error);
    throw new Error('Failed to derive encryption key');
  }
}

/**
 * Calculate HMAC-SHA256 for authentication
 * @param {string} data - Data to authenticate
 * @param {string} key - Base64 encoded key
 * @returns {Promise<string>} - Base64 encoded HMAC
 */
async function calculateHMAC(data, key) {
  try {
    const hmacKey = await Aes.hmac256(data, key);
    return hmacKey;
  } catch (error) {
    // Fallback to SHA-256 hash if HMAC not available
    const combined = data + key;
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      combined,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
  }
}

/**
 * Encrypt data using AES-256-CBC with HMAC-SHA256 authentication
 * Format: IV:ciphertext:hmac
 * @param {string} plaintext - Data to encrypt
 * @param {string} key - Base64 encoded encryption key
 * @returns {Promise<string>} - Encrypted data with IV and HMAC
 */
export async function encryptData(plaintext, key) {
  try {
    // Generate random IV
    const iv = await generateIV();
    
    // Encrypt using AES-256-CBC
    const encrypted = await Aes.encrypt(plaintext, key, iv, 'aes-256-cbc');
    
    // Calculate HMAC over IV and ciphertext for authentication
    const dataToAuthenticate = `${iv}:${encrypted}`;
    const hmac = await calculateHMAC(dataToAuthenticate, key);
    
    // Combine IV, ciphertext, and HMAC: IV:ciphertext:hmac
    const combined = `${iv}:${encrypted}:${hmac}`;
    
    return combined;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-256-CBC with HMAC verification
 * @param {string} encryptedData - Encrypted data with IV and HMAC (IV:ciphertext:hmac)
 * @param {string} key - Base64 encoded encryption key
 * @returns {Promise<string>} - Decrypted plaintext
 */
export async function decryptData(encryptedData, key) {
  try {
    // Split IV, ciphertext, and HMAC
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      // Try old format without HMAC (for backward compatibility)
      if (parts.length === 2) {
        const [iv, ciphertext] = parts;
        const decrypted = await Aes.decrypt(ciphertext, key, iv, 'aes-256-cbc');
        return decrypted;
      }
      throw new Error('Invalid encrypted data format');
    }
    
    const [iv, ciphertext, hmac] = parts;
    
    // Verify HMAC before decryption
    const dataToAuthenticate = `${iv}:${ciphertext}`;
    const expectedHmac = await calculateHMAC(dataToAuthenticate, key);
    
    if (hmac !== expectedHmac) {
      throw new Error('HMAC verification failed - data may be tampered');
    }
    
    // Decrypt using AES-256-CBC
    const decrypted = await Aes.decrypt(ciphertext, key, iv, 'aes-256-cbc');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a random encryption key
 * @returns {Promise<string>} - Base64 encoded random key
 */
export async function generateEncryptionKey() {
  try {
    const randomBytes = await Crypto.getRandomBytesAsync(KEY_SIZE / 8);
    return arrayBufferToBase64(randomBytes);
  } catch (error) {
    console.error('Error generating encryption key:', error);
    throw new Error('Failed to generate encryption key');
  }
}

const ENCRYPTION_KEY_PREFIX = 'encryption_key_';
const ENCRYPTION_KEY_V2_PREFIX = 'encryption_key_v2_';

export async function storeKey(userId, key) {
  try {
    await SecureStore.setItemAsync(`${ENCRYPTION_KEY_PREFIX}${userId}`, key);
  } catch (error) {
    console.error('Error storing key:', error);
    throw new Error('Failed to store encryption key');
  }
}

export async function storeKeyV2(userId, key) {
  try {
    await SecureStore.setItemAsync(`${ENCRYPTION_KEY_V2_PREFIX}${userId}`, key);
  } catch (error) {
    console.error('Error storing key:', error);
    throw new Error('Failed to store encryption key');
  }
}

/**
 * Store salt securely in SecureStore
 * @param {string} userId - User's unique identifier
 * @param {string} salt - Base64 encoded salt
 */
export async function storeSalt(userId, salt) {
  try {
    await SecureStore.setItemAsync(`encryption_salt_${userId}`, salt);
  } catch (error) {
    console.error('Error storing salt:', error);
    throw new Error('Failed to store salt');
  }
}

/**
 * Retrieve encryption key from SecureStore
 * @param {string} userId - User's unique identifier
 * @returns {Promise<string|null>} - Base64 encoded encryption key or null
 */
export async function retrieveKey(userId) {
  try {
    return await SecureStore.getItemAsync(`${ENCRYPTION_KEY_PREFIX}${userId}`);
  } catch (error) {
    console.error('Error retrieving key:', error);
    return null;
  }
}

export async function retrieveKeyV2(userId) {
  try {
    return await SecureStore.getItemAsync(`${ENCRYPTION_KEY_V2_PREFIX}${userId}`);
  } catch (error) {
    console.error('Error retrieving key:', error);
    return null;
  }
}

/**
 * Retrieve salt from SecureStore
 * @param {string} userId - User's unique identifier
 * @returns {Promise<string|null>} - Base64 encoded salt or null
 */
export async function retrieveSalt(userId) {
  try {
    return await SecureStore.getItemAsync(`encryption_salt_${userId}`);
  } catch (error) {
    console.error('Error retrieving salt:', error);
    return null;
  }
}

/**
 * Clear encryption key from SecureStore
 * @param {string} userId - User's unique identifier
 */
export async function clearKey(userId) {
  try {
    await SecureStore.deleteItemAsync(`encryption_key_${userId}`);
    await SecureStore.deleteItemAsync(`encryption_salt_${userId}`);
  } catch (error) {
    console.error('Error clearing key:', error);
  }
}

/**
 * Hash data using SHA-256
 * @param {string} data - Data to hash
 * @returns {Promise<string>} - Base64 encoded hash
 */
export async function hashData(data) {
  try {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
  } catch (error) {
    console.error('Hashing error:', error);
    throw new Error('Failed to hash data');
  }
}

/**
 * Migrate from old XOR encryption to new AES encryption
 * @param {string} oldEncryptedData - Data encrypted with XOR
 * @param {string} oldKey - Old XOR key
 * @param {string} newKey - New AES key
 * @returns {Promise<string>} - Data encrypted with AES
 */
export async function migrateEncryption(oldEncryptedData, oldKey, newKey) {
  try {
    // Import old encryption utilities
    const { decryptData: oldDecrypt } = require('./encryption');
    
    // Decrypt with old method
    const plaintext = await oldDecrypt(oldEncryptedData, oldKey);
    
    // Encrypt with new method
    const newEncrypted = await encryptData(plaintext, newKey);
    
    return newEncrypted;
  } catch (error) {
    console.error('Migration error:', error);
    throw new Error('Failed to migrate encryption');
  }
}

/**
 * Check if data is encrypted with new format (contains ':' separator)
 * @param {string} data - Encrypted data
 * @returns {boolean} - True if new format, false if old format
 */
export function isNewEncryptionFormat(data) {
  if (!data || typeof data !== 'string') return false;
  const parts = data.split(':');
  // New format has 3 parts (IV:ciphertext:hmac) or old AES format has 2 parts (IV:ciphertext)
  return parts.length >= 2;
}

/**
 * Check if data has HMAC authentication
 * @param {string} data - Encrypted data
 * @returns {boolean} - True if has HMAC, false otherwise
 */
export function hasHMAC(data) {
  if (!data || typeof data !== 'string') return false;
  const parts = data.split(':');
  return parts.length === 3;
}

export default {
  deriveEncryptionKey,
  encryptData,
  decryptData,
  generateEncryptionKey,
  storeKey,
  storeKeyV2,
  storeSalt,
  retrieveKey,
  retrieveKeyV2,
  retrieveSalt,
  clearKey,
  hashData,
  migrateEncryption,
  isNewEncryptionFormat,
  hasHMAC,
};
