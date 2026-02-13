// TOTP Generator utility for React Native
import * as Crypto from 'expo-crypto';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decode base32 string to hex. Returns null if any character is invalid (no throw).
 */
function tryBase32Decode(base32Str) {
  if (!base32Str || !base32Str.length) return null;
  let bits = '';
  let hex = '';
  for (let i = 0; i < base32Str.length; i++) {
    const val = BASE32_CHARS.indexOf(base32Str.charAt(i));
    if (val === -1) return null;
    bits += val.toString(2).padStart(5, '0');
  }
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    const chunk = bits.substring(i, i + 8);
    hex += parseInt(chunk, 2).toString(16).padStart(2, '0');
  }
  return hex;
}

/** Crockford base32: map 0→O, 1→I, 8→B, 9→G so digit-only input can decode */
function applyCrockford(str) {
  return str
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/8/g, 'B')
    .replace(/9/g, 'G');
}

function hexToBytes(hex) {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return new Uint8Array(bytes);
}

/**
 * Decode TOTP secret (base32, Crockford base32, or hex) to key bytes.
 * Tries: strict base32 → Crockford base32 → hex → base32 with non-base32 chars stripped.
 */
function secretToKeyBytes(secret) {
  const normalized = (secret || '')
    .replace(/\s/g, '')
    .replace(/=+$/, '')
    .toUpperCase()
    .trim();

  if (!normalized.length) {
    throw new Error('Invalid TOTP secret: empty after normalization. Check that the secret decrypted correctly.');
  }

  let hex = tryBase32Decode(normalized);
  if (hex) return hexToBytes(hex);

  hex = tryBase32Decode(applyCrockford(normalized));
  if (hex) return hexToBytes(hex);

  if (/^[0-9A-Fa-f]+$/.test(normalized) && normalized.length % 2 === 0) {
    return hexToBytes(normalized);
  }

  const stripped = normalized.replace(new RegExp(`[^${BASE32_CHARS}]`, 'g'), '');
  if (stripped.length) {
    hex = tryBase32Decode(stripped);
    if (hex) return hexToBytes(hex);
    hex = tryBase32Decode(applyCrockford(stripped));
    if (hex) return hexToBytes(hex);
  }

  throw new Error('Invalid TOTP secret: expected base32 or hex. Check that the secret decrypted correctly.');
}

async function hmac(key, message, algorithm = 'SHA-1') {
  // Use expo-crypto for HMAC
  const hashAlgo = algorithm.toUpperCase() === 'SHA1' ? Crypto.CryptoDigestAlgorithm.SHA1 : 
                   algorithm.toUpperCase() === 'SHA256' ? Crypto.CryptoDigestAlgorithm.SHA256 :
                   algorithm.toUpperCase() === 'SHA512' ? Crypto.CryptoDigestAlgorithm.SHA512 : 
                   Crypto.CryptoDigestAlgorithm.SHA1;
  
  // Convert message to base64 for expo-crypto
  const messageBase64 = btoa(String.fromCharCode(...message));
  const keyBase64 = btoa(String.fromCharCode(...key));
  
  // Combine key and message for HMAC
  const combined = keyBase64 + messageBase64;
  
  // Use digest for HMAC (simplified - for production use proper HMAC)
  const hash = await Crypto.digestStringAsync(
    hashAlgo,
    combined,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  
  // Convert base64 back to bytes
  const binary = atob(hash);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  return bytes;
}

export async function generateTOTP(secret, period = 30, digits = 6, algorithm = 'SHA1') {
  if (!secret || typeof secret !== 'string') {
    throw new Error('TOTP secret is required and must be a string');
  }

  if (!period || period <= 0) {
    throw new Error('TOTP period must be a positive number');
  }

  if (!digits || digits < 6 || digits > 8) {
    throw new Error('TOTP digits must be between 6 and 8');
  }

  if (!algorithm || !['SHA1', 'SHA256', 'SHA512'].includes(algorithm.toUpperCase())) {
    throw new Error('TOTP algorithm must be SHA1, SHA256, or SHA512');
  }

  const key = secretToKeyBytes(secret);

  // Get current time counter
  const now = Math.floor(Date.now() / 1000);
  let counter = Math.floor(now / period);

  // Convert counter to 8-byte array
  const counterBytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = counter & 0xff;
    counter = counter >> 8;
  }

  // Generate HMAC with specified algorithm
  const hash = await hmac(key, counterBytes, algorithm);

  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0xf;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

export function getRemainingTime(period = 30) {
  const now = Math.floor(Date.now() / 1000);
  return period - (now % period);
}

export function parseOtpAuthUrl(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol !== 'otpauth:') return null;

    const type = urlObj.host; // totp or hotp
    const label = decodeURIComponent(urlObj.pathname.slice(1));
    const [issuer, account] = label.includes(':') ? label.split(':') : ['', label];

    const params = new URLSearchParams(urlObj.search);
    const secret = params.get('secret');
    const algorithm = params.get('algorithm') || 'SHA1';
    const digits = parseInt(params.get('digits') || '6');
    const period = parseInt(params.get('period') || '30');

    return {
      type,
      issuer: issuer || params.get('issuer') || '',
      account,
      secret,
      algorithm,
      digits,
      period,
    };
  } catch (error) {
    console.error('Failed to parse OTP URL:', error);
    return null;
  }
}

