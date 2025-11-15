import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { auth, googleProvider } from '../config/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth';
import { authService } from '../services/authService';
import { deriveEncryptionKey, storeKey, retrieveKey, clearKey } from '../utils/encryption';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      currentUser: null,
      sessionToken: null,
      encryptionKey: null,
      loading: true,

      // Actions
      setCurrentUser: (user) => set({ currentUser: user }),
      setSessionToken: (token) => {
        set({ sessionToken: token });
        if (token) {
          localStorage.setItem('sessionToken', token);
        } else {
          localStorage.removeItem('sessionToken');
        }
      },
      setEncryptionKey: (key) => set({ encryptionKey: key }),
      setLoading: (loading) => set({ loading }),

      // Initialize auth state listener
      initializeAuth: () => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            try {
              const idToken = await user.getIdToken();
              
              // Create session with backend
              try {
                const response = await authService.createSession(idToken);
                get().setSessionToken(response.sessionToken);
                get().setCurrentUser(response.user);
              } catch (sessionError) {
                console.error('Session creation failed:', sessionError);
                // Even if session creation fails, set the user so they can still navigate
                get().setCurrentUser({
                  userId: user.uid,
                  email: user.email,
                  displayName: user.displayName,
                  photoURL: user.photoURL,
                  createdAt: new Date().toISOString(),
                  lastLogin: new Date().toISOString(),
                  passwordEnabled: false,
                  preferences: {}
                });
              }
              
              // Derive or retrieve encryption key
              let key = await retrieveKey(user.uid);
              if (!key) {
                key = await deriveEncryptionKey(user.uid);
                await storeKey(user.uid, key);
              }
              get().setEncryptionKey(key);
            } catch (error) {
              console.error('Auth state change error:', error);
              get().setCurrentUser({
                userId: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                passwordEnabled: false,
                preferences: {}
              });
            }
          } else {
            get().setCurrentUser(null);
            get().setSessionToken(null);
            get().setEncryptionKey(null);
          }
          get().setLoading(false);
        });

        return unsubscribe;
      },

      // Login with Google
      loginWithGoogle: async () => {
        try {
          await signInWithPopup(auth, googleProvider);
        } catch (error) {
          if (error.code === 'auth/popup-blocked' || 
              error.code === 'auth/popup-closed-by-user' ||
              error.message?.includes('Cross-Origin-Opener-Policy')) {
            console.log('Popup blocked or failed, using redirect instead');
            try {
              await signInWithRedirect(auth, googleProvider);
              return;
            } catch (redirectError) {
              console.error('Redirect also failed:', redirectError);
              throw redirectError;
            }
          }
          throw error;
        }
      },

      // Logout
      logout: async () => {
        try {
          await signOut(auth);
          get().setCurrentUser(null);
          get().setSessionToken(null);
          get().setEncryptionKey(null);
          clearKey();
        } catch (error) {
          console.error('Logout error:', error);
          throw error;
        }
      },

      // Get auth headers for API calls
      getAuthHeaders: async () => {
        const token = get().sessionToken || localStorage.getItem('sessionToken');
        if (!token) {
          throw new Error('No session token available');
        }
        return {
          Authorization: `Bearer ${token}`,
        };
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessionToken: state.sessionToken,
        // Don't persist encryptionKey for security
      }),
    }
  )
);

export default useAuthStore;

