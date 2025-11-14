import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider } from '../config/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
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
          const response = await axios.post(`${API}/auth/session`, { idToken });
          setSessionToken(response.data.sessionToken);
          setCurrentUser(response.data.user);
          
          // Derive or retrieve encryption key
          let key = await retrieveKey(user.uid);
          if (!key) {
            key = await deriveEncryptionKey(user.uid);
            await storeKey(user.uid, key);
          }
          setEncryptionKey(key);
        } catch (error) {
          console.error('Session creation failed:', error);
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
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

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

  const getAuthHeaders = async () => {
    if (!auth.currentUser) return {};
    const token = await auth.currentUser.getIdToken();
    return { Authorization: `Bearer ${token}` };
  };

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