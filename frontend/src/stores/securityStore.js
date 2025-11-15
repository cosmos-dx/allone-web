import { create } from 'zustand';
import { calculatePasswordStrength } from '../utils/passwordGenerator';

const useSecurityStore = create((set, get) => ({
  // State
  weakPasswordCount: 0,
  securityScore: 0,
  totalPasswords: 0,
  loading: false,
  error: null,

  // Actions
  calculateSecurityStats: (passwords) => {
    if (!passwords || passwords.length === 0) {
      const emptyStats = {
        weakPasswordCount: 0,
        securityScore: 100,
        totalPasswords: 0,
      };
      set(emptyStats);
      return emptyStats;
    }

    let weakCount = 0;
    
    // Calculate weak passwords (strength < 3)
    passwords.forEach((password) => {
      // If password has encryptedPassword, we can't check it (it's encrypted)
      // So we'll use the strength field if available, or skip it
      if (password.encryptedPassword && !password.password) {
        // If we have a strength field, use it
        if (password.strength !== undefined && password.strength < 3) {
          weakCount++;
        }
        // Otherwise, we can't determine strength of encrypted passwords
      } else if (password.password) {
        // If password is decrypted, calculate strength
        const strength = calculatePasswordStrength(password.password);
        if (strength < 3) {
          weakCount++;
        }
      } else if (password.strength !== undefined && password.strength < 3) {
        weakCount++;
      }
    });

    const total = passwords.length;
    // Calculate security score: 100 - (weakCount * 10), minimum 0
    const score = Math.max(0, Math.min(100, 100 - (weakCount * 10)));

    const stats = {
      weakPasswordCount: weakCount,
      securityScore: score,
      totalPasswords: total,
    };
    
    set(stats);
    return stats;
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

export default useSecurityStore;

