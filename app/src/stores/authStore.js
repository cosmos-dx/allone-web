import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useAuthStore = create((set, get) => ({
  // State
  user: null,
  sessionToken: null,
  encryptionKey: null,
  loading: false,
  error: null,

  // Actions
  setUser: (user) => set({ user }),
  setSessionToken: (token) => {
    set({ sessionToken: token });
    if (token) {
      AsyncStorage.setItem('sessionToken', token);
    } else {
      AsyncStorage.removeItem('sessionToken');
    }
  },
  setEncryptionKey: (key) => set({ encryptionKey: key }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Clear all auth data
  clearAuth: async () => {
    set({ user: null, sessionToken: null, encryptionKey: null });
    await AsyncStorage.removeItem('sessionToken');
  },
}));

export default useAuthStore;

