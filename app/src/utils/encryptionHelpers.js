/**
 * Shared helpers for decrypting password/notes with v2 or legacy encryption.
 * Tries context key and SecureStore key fallbacks (same pattern as TOTPCard).
 */
import { decryptData as decryptDataLegacy } from './encryption';
import {
  decryptData as decryptDataV2,
  isNewEncryptionFormat,
  retrieveKeyV2,
  retrieveKey,
} from './encryptionV2';

/**
 * Decrypt a password or notes field. Tries v2 then legacy format, and context key then SecureStore keys.
 * @param {string} encryptedValue - Encrypted string (v2 format "IV:ciphertext:hmac" or legacy base64)
 * @param {string|null} encryptionKey - Key from AuthContext
 * @param {string|null} userId - currentUser.uid or currentUser.userId for SecureStore fallback
 * @returns {Promise<string>} Decrypted string
 * @throws If all decryption attempts fail
 */
export async function decryptPasswordOrNotes(encryptedValue, encryptionKey, userId) {
  if (!encryptedValue || typeof encryptedValue !== 'string') {
    return '';
  }

  const isV2Format = isNewEncryptionFormat(encryptedValue);

  const tryWithKey = async (key, useV2) => {
    if (!key) return null;
    if (useV2 && !isV2Format) return null;
    if (!useV2 && isV2Format) return null;
    if (useV2) return await decryptDataV2(encryptedValue, key);
    return await decryptDataLegacy(encryptedValue, key);
  };

  const useV2First = isV2Format;

  if (encryptionKey) {
    try {
      const result = await tryWithKey(encryptionKey, useV2First);
      if (result != null) return result;
    } catch (e) {
      // fall through
    }
    try {
      const result = await tryWithKey(encryptionKey, !useV2First);
      if (result != null) return result;
    } catch (e2) {
      // fall through
    }
  }

  if (userId) {
    const keyV2 = await retrieveKeyV2(userId);
    if (keyV2) {
      try {
        const result = await tryWithKey(keyV2, useV2First);
        if (result != null) return result;
      } catch (e) {
        // fall through
      }
      try {
        const result = await tryWithKey(keyV2, !useV2First);
        if (result != null) return result;
      } catch (e2) {
        // fall through
      }
    }

    const keyOld = await retrieveKey(userId);
    if (keyOld) {
      try {
        const result = await tryWithKey(keyOld, useV2First);
        if (result != null) return result;
      } catch (e) {
        // fall through
      }
      try {
        const result = await tryWithKey(keyOld, !useV2First);
        if (result != null) return result;
      } catch (e2) {
        // fall through
      }
    }
  }

  throw new Error('Failed to decrypt data');
}
