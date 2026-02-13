/**
 * Autofill Service for password suggestions
 * Works in the background to suggest passwords for websites/apps
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { passwordService } from './passwordService';
import { decryptData } from '../utils/encryption';
import autofillSyncService from './autofillSyncService';

class AutofillService {
  constructor() {
    this.passwords = [];
    this.isInitialized = false;
  }

  /**
   * Initialize autofill service - load passwords and sync to system autofill (iOS/Android) when available.
   * @param {Function} getAuthHeaders
   * @param {string} encryptionKey
   * @param {string} [userId] - Required for system autofill sync (e.g. currentUser.uid)
   */
  async initialize(getAuthHeaders, encryptionKey, userId) {
    try {
      const headers = await getAuthHeaders();
      if (!headers?.Authorization) {
        return;
      }
      this.passwords = await passwordService.getAll(null, true, headers);
      this.encryptionKey = encryptionKey;
      this.isInitialized = true;
      await AsyncStorage.setItem('autofill_passwords', JSON.stringify(this.passwords));

      if (userId && this.passwords.length > 0) {
        autofillSyncService.syncPasswordsToAutofill(this.passwords, userId).catch((err) => {
          console.warn('Autofill sync to system failed (may be unsupported on this device):', err?.message || err);
        });
      }
    } catch (error) {
      if (error?.response?.status === 401) {
        return;
      }
      console.error('Failed to initialize autofill service:', error);
    }
  }

  /**
   * Get password suggestions for a website/app
   * @param {string} domain - Website domain or app identifier
   * @returns {Array} Array of password suggestions
   */
  async getSuggestions(domain) {
    if (!this.isInitialized) {
      // Try to load from cache
      try {
        const cached = await AsyncStorage.getItem('autofill_passwords');
        if (cached) {
          this.passwords = JSON.parse(cached);
        }
      } catch (error) {
        console.error('Failed to load cached passwords:', error);
        return [];
      }
    }

    if (!domain || !this.passwords.length) {
      return [];
    }

    // Normalize domain (remove protocol, www, etc.)
    const normalizedDomain = this.normalizeDomain(domain);
    
    // Find matching passwords with improved matching algorithm
    const suggestions = this.passwords
      .map(password => {
        let score = 0;
        
        // Check website match
        if (password.website) {
          const passwordDomain = this.normalizeDomain(password.website);
          if (passwordDomain === normalizedDomain) {
            score = 100; // Exact match
          } else if (passwordDomain.includes(normalizedDomain) || normalizedDomain.includes(passwordDomain)) {
            score = 50; // Partial match
          } else {
            // Check if domain parts match
            const domainParts = normalizedDomain.split('.');
            const passwordParts = passwordDomain.split('.');
            const commonParts = domainParts.filter(part => passwordParts.includes(part));
            if (commonParts.length > 0) {
              score = 25; // Partial domain match
            }
          }
        }
        
        // Check display name match
        if (password.displayName) {
          const nameLower = password.displayName.toLowerCase();
          const domainLower = normalizedDomain.toLowerCase();
          if (nameLower.includes(domainLower) || domainLower.includes(nameLower)) {
            score = Math.max(score, 30); // Name match
          }
        }
        
        return { password, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5) // Limit to 5 suggestions
      .map(item => ({
        id: item.password.passwordId,
        displayName: item.password.displayName,
        username: item.password.username,
        website: item.password.website,
        // Don't decrypt here - decrypt when user selects
        hasPassword: !!item.password.encryptedPassword,
        score: item.score,
      }));

    return suggestions;
  }

  /**
   * Get password for autofill
   * @param {string} passwordId - Password ID
   * @returns {Object} Decrypted password data
   */
  async getPassword(passwordId) {
    try {
      const password = this.passwords.find(p => p.passwordId === passwordId);
      if (!password || !password.encryptedPassword) {
        return null;
      }

      // Decrypt password
      const decryptedPassword = await decryptData(password.encryptedPassword, this.encryptionKey);
      
      return {
        username: password.username || '',
        password: decryptedPassword,
        website: password.website || '',
      };
    } catch (error) {
      console.error('Failed to get password for autofill:', error);
      return null;
    }
  }

  /**
   * Normalize domain for matching
   */
  normalizeDomain(domain) {
    if (!domain) return '';
    
    return domain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '')
      .trim();
  }

  /**
   * Update passwords cache
   */
  async updatePasswords(passwords) {
    this.passwords = passwords;
    await AsyncStorage.setItem('autofill_passwords', JSON.stringify(passwords));
  }

  /**
   * Clear autofill cache
   */
  async clearCache() {
    this.passwords = [];
    this.isInitialized = false;
    await AsyncStorage.removeItem('autofill_passwords');
  }
}

export default new AutofillService();

