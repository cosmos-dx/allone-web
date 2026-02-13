/**
 * Autofill Sync Service
 * Syncs passwords from main app to autofill storage on both Android and iOS
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { encryptData, decryptData, retrieveKey } from '../utils/encryptionV2';

// Android native module for autofill sync
import { NativeModules } from 'react-native';
const { AutofillSyncModule } = NativeModules;

/**
 * Sync passwords to autofill storage
 * @param {Array} passwords - Array of password objects
 * @param {string} userId - User ID for encryption key
 */
export async function syncPasswordsToAutofill(passwords, userId) {
  try {
    console.log(`Syncing ${passwords.length} passwords to autofill storage`);
    
    // Get encryption key
    const encryptionKey = await retrieveKey(userId);
    if (!encryptionKey) {
      throw new Error('No encryption key found');
    }
    
    // Prepare passwords for autofill (decrypt for storage)
    const autofillPasswords = await Promise.all(
      passwords.map(async (password) => {
        try {
          // Decrypt password for autofill use
          const decryptedPassword = await decryptData(password.encryptedPassword, encryptionKey);
          
          return {
            passwordId: password.passwordId,
            displayName: password.displayName,
            username: password.username || '',
            password: decryptedPassword,
            website: password.website || '',
            notes: password.notes || '',
          };
        } catch (error) {
          console.error(`Failed to decrypt password ${password.passwordId}:`, error);
          return null;
        }
      })
    );
    
    // Filter out failed decryptions
    const validPasswords = autofillPasswords.filter(p => p !== null);
    
    if (Platform.OS === 'android') {
      await syncToAndroidAutofill(validPasswords, encryptionKey);
    } else if (Platform.OS === 'ios') {
      await syncToIOSAutofill(validPasswords, encryptionKey);
    }
    
    console.log(`Successfully synced ${validPasswords.length} passwords to autofill`);
  } catch (error) {
    console.error('Failed to sync passwords to autofill:', error);
    throw error;
  }
}

/**
 * Sync passwords to Android autofill service
 */
async function syncToAndroidAutofill(passwords, encryptionKey) {
  try {
    // Re-encrypt passwords for autofill storage
    const encryptedPasswords = await Promise.all(
      passwords.map(async (password) => {
        const encryptedPassword = await encryptData(password.password, encryptionKey);
        return {
          ...password,
          password: encryptedPassword,
        };
      })
    );
    
    // Store in encrypted shared preferences via native module
    if (AutofillSyncModule) {
      await AutofillSyncModule.syncPasswords(
        JSON.stringify(encryptedPasswords),
        encryptionKey
      );
    } else {
      console.warn('AutofillSyncModule not available, passwords not synced to autofill');
    }
  } catch (error) {
    console.error('Failed to sync to Android autofill:', error);
    throw error;
  }
}

/**
 * Sync passwords to iOS autofill extension via App Groups
 */
async function syncToIOSAutofill(passwords, encryptionKey) {
  try {
    // Re-encrypt passwords for autofill storage
    const encryptedPasswords = await Promise.all(
      passwords.map(async (password) => {
        const encryptedPassword = await encryptData(password.password, encryptionKey);
        return {
          recordIdentifier: password.passwordId,
          displayName: password.displayName,
          username: password.username,
          decryptedPassword: encryptedPassword, // Store encrypted, name for compatibility
          website: password.website,
        };
      })
    );
    
    // Store in shared app group storage via native module
    if (AutofillSyncModule) {
      await AutofillSyncModule.syncPasswords(
        JSON.stringify(encryptedPasswords),
        encryptionKey
      );
    } else {
      console.warn('AutofillSyncModule not available, passwords not synced to autofill');
    }
  } catch (error) {
    console.error('Failed to sync to iOS autofill:', error);
    throw error;
  }
}

/**
 * Clear autofill storage
 */
export async function clearAutofillStorage() {
  try {
    if (AutofillSyncModule) {
      await AutofillSyncModule.clearPasswords();
    }
    console.log('Autofill storage cleared');
  } catch (error) {
    console.error('Failed to clear autofill storage:', error);
  }
}

/**
 * Check if autofill is enabled
 */
export async function isAutofillEnabled() {
  try {
    if (AutofillSyncModule) {
      return await AutofillSyncModule.isAutofillEnabled();
    }
    return false;
  } catch (error) {
    console.error('Failed to check autofill status:', error);
    return false;
  }
}

/**
 * Request autofill setup (opens system settings)
 */
export async function requestAutofillSetup() {
  try {
    if (AutofillSyncModule) {
      await AutofillSyncModule.requestAutofillSetup();
    }
  } catch (error) {
    console.error('Failed to request autofill setup:', error);
  }
}

export default {
  syncPasswordsToAutofill,
  clearAutofillStorage,
  isAutofillEnabled,
  requestAutofillSetup,
};
