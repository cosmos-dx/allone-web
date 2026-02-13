/**
 * Migration Service
 * Handles automatic migration from old XOR encryption to new AES-CBC with HMAC
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { 
  decryptData as oldDecrypt,
  retrieveKey as oldRetrieveKey 
} from '../utils/encryption';
import {
  encryptData as newEncrypt,
  decryptData as newDecrypt,
  isNewEncryptionFormat,
  hasHMAC,
  retrieveKeyV2 as newRetrieveKey,
  storeKeyV2 as newStoreKey,
  deriveEncryptionKey,
} from '../utils/encryptionV2';

const MIGRATION_STATUS_KEY = 'encryption_migration_status';
const MIGRATION_VERSION_KEY = 'encryption_migration_version';
const CURRENT_MIGRATION_VERSION = '2.0'; // AES-CBC with HMAC

/**
 * Check if migration is needed
 */
export async function needsMigration(userId) {
  try {
    const status = await AsyncStorage.getItem(MIGRATION_STATUS_KEY);
    const version = await AsyncStorage.getItem(MIGRATION_VERSION_KEY);
    
    // If already migrated to current version, no migration needed
    if (status === 'completed' && version === CURRENT_MIGRATION_VERSION) {
      return false;
    }
    
    // Check if user has old encryption key
    const oldKey = await oldRetrieveKey(userId);
    if (!oldKey) {
      // No old key, might be new user or already migrated
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
}

/**
 * Migrate passwords from old encryption to new encryption
 */
export async function migratePasswords(passwords, userId) {
  try {
    console.log(`Starting migration for ${passwords.length} passwords`);
    
    // Get old encryption key
    const oldKey = await oldRetrieveKey(userId);
    if (!oldKey) {
      throw new Error('Old encryption key not found');
    }
    
    // Generate or get new encryption key
    let newKey = await newRetrieveKey(userId);
    if (!newKey) {
      const { key, salt } = await deriveEncryptionKey(userId, '');
      newKey = key;
      await newStoreKey(userId, key);
      await SecureStore.setItemAsync(`encryption_salt_${userId}`, salt);
    }
    
    // Migrate each password
    const migratedPasswords = await Promise.all(
      passwords.map(async (password) => {
        try {
          // Check if already in new format
          if (isNewEncryptionFormat(password.encryptedPassword)) {
            // Check if has HMAC
            if (hasHMAC(password.encryptedPassword)) {
              // Already fully migrated
              return password;
            } else {
              // Has AES but no HMAC, re-encrypt with HMAC
              const plaintext = await newDecrypt(password.encryptedPassword, newKey);
              const newEncrypted = await newEncrypt(plaintext, newKey);
              return {
                ...password,
                encryptedPassword: newEncrypted,
              };
            }
          }
          
          // Old XOR format, decrypt and re-encrypt
          const plaintext = await oldDecrypt(password.encryptedPassword, oldKey);
          const newEncrypted = await newEncrypt(plaintext, newKey);
          
          return {
            ...password,
            encryptedPassword: newEncrypted,
          };
        } catch (error) {
          console.error(`Failed to migrate password ${password.passwordId}:`, error);
          // Return original if migration fails
          return password;
        }
      })
    );
    
    console.log(`Successfully migrated ${migratedPasswords.length} passwords`);
    return migratedPasswords;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Migrate TOTP secrets from old encryption to new encryption
 */
export async function migrateTOTPSecrets(totps, userId) {
  try {
    console.log(`Starting TOTP migration for ${totps.length} secrets`);
    
    // Get old encryption key
    const oldKey = await oldRetrieveKey(userId);
    if (!oldKey) {
      throw new Error('Old encryption key not found');
    }
    
    // Get new encryption key
    let newKey = await newRetrieveKey(userId);
    if (!newKey) {
      const { key, salt } = await deriveEncryptionKey(userId, '');
      newKey = key;
      await newStoreKey(userId, key);
      await SecureStore.setItemAsync(`encryption_salt_${userId}`, salt);
    }
    
    // Migrate each TOTP secret
    const migratedTOTPs = await Promise.all(
      totps.map(async (totp) => {
        try {
          // Check if already in new format
          if (isNewEncryptionFormat(totp.encryptedSecret)) {
            if (hasHMAC(totp.encryptedSecret)) {
              return totp;
            } else {
              const plaintext = await newDecrypt(totp.encryptedSecret, newKey);
              const newEncrypted = await newEncrypt(plaintext, newKey);
              return {
                ...totp,
                encryptedSecret: newEncrypted,
              };
            }
          }
          
          // Old format, decrypt and re-encrypt
          const plaintext = await oldDecrypt(totp.encryptedSecret, oldKey);
          const newEncrypted = await newEncrypt(plaintext, newKey);
          
          return {
            ...totp,
            encryptedSecret: newEncrypted,
          };
        } catch (error) {
          console.error(`Failed to migrate TOTP ${totp.totpId}:`, error);
          return totp;
        }
      })
    );
    
    console.log(`Successfully migrated ${migratedTOTPs.length} TOTP secrets`);
    return migratedTOTPs;
  } catch (error) {
    console.error('TOTP migration failed:', error);
    throw error;
  }
}

/**
 * Mark migration as completed
 */
export async function markMigrationCompleted() {
  try {
    await AsyncStorage.setItem(MIGRATION_STATUS_KEY, 'completed');
    await AsyncStorage.setItem(MIGRATION_VERSION_KEY, CURRENT_MIGRATION_VERSION);
    console.log('Migration marked as completed');
  } catch (error) {
    console.error('Failed to mark migration as completed:', error);
  }
}

/**
 * Reset migration status (for testing)
 */
export async function resetMigrationStatus() {
  try {
    await AsyncStorage.removeItem(MIGRATION_STATUS_KEY);
    await AsyncStorage.removeItem(MIGRATION_VERSION_KEY);
    console.log('Migration status reset');
  } catch (error) {
    console.error('Failed to reset migration status:', error);
  }
}

/**
 * Get migration status
 */
export async function getMigrationStatus() {
  try {
    const status = await AsyncStorage.getItem(MIGRATION_STATUS_KEY);
    const version = await AsyncStorage.getItem(MIGRATION_VERSION_KEY);
    
    return {
      status: status || 'not_started',
      version: version || 'unknown',
      currentVersion: CURRENT_MIGRATION_VERSION,
    };
  } catch (error) {
    console.error('Failed to get migration status:', error);
    return {
      status: 'error',
      version: 'unknown',
      currentVersion: CURRENT_MIGRATION_VERSION,
    };
  }
}

export default {
  needsMigration,
  migratePasswords,
  migrateTOTPSecrets,
  markMigrationCompleted,
  resetMigrationStatus,
  getMigrationStatus,
};
