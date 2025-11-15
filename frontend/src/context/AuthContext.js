import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, googleProvider } from '../config/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth';
import axios from 'axios';
import { deriveEncryptionKey, storeKey, retrieveKey, clearKey } from '../utils/encryption';

const AuthContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const idToken = await user.getIdToken();
          
          // Create session with backend
          try {
            const response = await axios.post(`${API}/auth/session`, { idToken });
            setSessionToken(response.data.sessionToken);
            setCurrentUser(response.data.user);
          } catch (sessionError) {
            console.error('Session creation failed:', sessionError);
            // Even if session creation fails, set the user so they can still navigate
            // The backend session can be retried later
            setCurrentUser({
              userId: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              passkeyEnabled: false,
              preferences: {}
            });
          }
          
          // Derive or retrieve encryption key
          let key = await retrieveKey(user.uid);
          if (!key) {
            key = await deriveEncryptionKey(user.uid);
            await storeKey(user.uid, key);
          }
          setEncryptionKey(key);
        } catch (error) {
          console.error('Auth state change error:', error);
          // Set user anyway to allow navigation
          setCurrentUser({
            userId: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            passkeyEnabled: false,
            preferences: {}
          });
        }
      } else {
        setCurrentUser(null);
        setSessionToken(null);
        setEncryptionKey(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    try {
      // Try popup first (better UX - no page reload)
      // The COOP meta tag in index.html should allow popups to work
      await signInWithPopup(auth, googleProvider);
      // If popup succeeds, onAuthStateChanged will handle the rest
    } catch (error) {
      // Suppress COOP warnings - they're just warnings, not errors
      if (error.message?.includes('Cross-Origin-Opener-Policy') && 
          !error.code && 
          error.message?.includes('would block')) {
        // This is just a warning, popup likely succeeded
        console.log('COOP warning (can be ignored):', error.message);
        return; // Popup likely succeeded despite the warning
      }
      
      // If popup fails (blocked or COOP issue), fallback to redirect
      if (error.code === 'auth/popup-blocked' || 
          error.code === 'auth/popup-closed-by-user' ||
          error.code === 'auth/cancelled-popup-request') {
        console.log('Popup blocked or failed, using redirect instead');
        try {
          await signInWithRedirect(auth, googleProvider);
          // Page will redirect, getRedirectResult will handle it on return
          return;
        } catch (redirectError) {
          console.error('Redirect also failed:', redirectError);
          throw redirectError;
        }
      }
      throw error;
    }
  };

  // Check for redirect result on mount
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        // Redirect login handled by onAuthStateChanged
        if (result) {
          // User successfully logged in via redirect
        }
      })
      .catch((error) => {
        console.error('Redirect result error:', error);
      });
  }, []);

  const logout = async () => {
    try {
      if (currentUser) {
        clearKey(currentUser.userId);
      }
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getAuthHeaders = useCallback(async () => {
    if (!auth.currentUser) return {};
    const token = await auth.currentUser.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, []); // Stable function - auth.currentUser is accessed directly

  const value = {
    currentUser,
    sessionToken,
    encryptionKey,
    loading,
    loginWithGoogle,
    logout,
    getAuthHeaders,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}