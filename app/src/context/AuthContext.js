import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import auth from '@react-native-firebase/auth';
import { authService } from '../services/authService';
import { deriveEncryptionKey, storeKey, retrieveKey, clearKey } from '../utils/encryption';
import { retrieveKeyV2 } from '../utils/encryptionV2';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://allone.co.in';
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
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const idToken = await user.getIdToken();
          
          // Create session with backend
          try {
            const response = await authService.createSession(idToken);
            const token = response.sessionToken;
            setSessionToken(token);
            const uid = user.uid;
            setCurrentUser({
              ...response.user,
              userId: response.user?.userId ?? response.user?.uid ?? uid,
              uid,
            });
            await AsyncStorage.setItem('sessionToken', token);
            console.log('✅ Backend session created successfully');
          } catch (sessionError) {
            console.error('Session creation failed:', sessionError);
            
            // Provide better error information
            if (sessionError.response) {
              const status = sessionError.response.status;
              const message = sessionError.response.data?.detail || sessionError.response.data?.message;
              
              if (status === 401) {
                console.error('❌ Authentication failed: Invalid token');
              } else if (status === 503) {
                console.error('❌ Backend service unavailable');
              } else {
                console.error(`❌ Backend error (${status}):`, message);
              }
            } else if (sessionError.request) {
              console.error('❌ Network error: Could not reach backend server at', BACKEND_URL);
            } else {
              console.error('❌ Session creation error:', sessionError.message);
            }
            
            // Even if session creation fails, set the user so they can still navigate
            // This allows offline functionality
            console.log('⚠️  Continuing with Firebase auth only (backend session failed)');
            setCurrentUser({
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
          
          let key = await retrieveKeyV2(user.uid) || await retrieveKey(user.uid);
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
            passwordEnabled: false,
            preferences: {}
          });
        }
      } else {
        setCurrentUser(null);
        setSessionToken(null);
        setEncryptionKey(null);
        await AsyncStorage.removeItem('sessionToken');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    try {
      // Use Google Sign-In for React Native
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      const { Platform } = require('react-native');
      
      // Configure Google Sign-In with platform-specific settings
      // Web client ID is the same for both platforms (OAuth 2.0 client ID)
      GoogleSignin.configure({
        webClientId: '368464651413-04seid7s33jfd4iguhmb2tqrqrcl2j9g.apps.googleusercontent.com',
        offlineAccess: true, // if you want to access Google API on behalf of the user FROM YOUR SERVER
        forceCodeForRefreshToken: true, // [Android] related to `serverAuthCode`, read the docs link below *.
        iosClientId: '368464651413-05ohj1cks99sqedo56ogptdkused832a.apps.googleusercontent.com', // [iOS] optional, if you want to specify the client ID of type iOS (otherwise, it is taken from GoogleService-Info.plist)
      });
      
      // Check if device supports Google Play (Android only)
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      
      // Sign in
      await GoogleSignin.signIn();
      const userInfo = await GoogleSignin.getCurrentUser();
      
      if (!userInfo || !userInfo.idToken) {
        throw new Error('Failed to get Google user information');
      }
      
      // Create a Google Auth credential
      const googleCredential = auth.GoogleAuthProvider.credential(userInfo.idToken);
      
      // Sign in with the credential
      await auth().signInWithCredential(googleCredential);
      // onAuthStateChanged will handle the rest
    } catch (error) {
      // Comprehensive error logging
      console.error('Google sign-in error - Full details:', {
        code: error.code,
        message: error.message,
        error: error,
        stack: error.stack,
        toString: error.toString(),
      });
      
      // Handle DEVELOPER_ERR specifically
      if (error.code === 'DEVELOPER_ERROR' || error.code === '10' || error.message?.includes('DEVELOPER_ERROR')) {
        const developerError = new Error(
          'DEVELOPER_ERROR: SHA-1 certificate fingerprint not configured. ' +
          'Please add your app\'s SHA-1 fingerprint to Firebase Console. ' +
          'Error code: ' + (error.code || 'DEVELOPER_ERROR')
        );
        developerError.code = 'DEVELOPER_ERROR';
        developerError.originalError = error;
        throw developerError;
      }
      
      // Provide user-friendly error messages with detailed info
      let errorMessage = 'Failed to sign in with Google.';
      let errorDetails = '';
      
      if (error.code === 'SIGN_IN_CANCELLED') {
        errorMessage = 'Sign in was cancelled.';
      } else if (error.code === 'IN_PROGRESS') {
        errorMessage = 'Sign in is already in progress.';
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        errorMessage = 'Google Play Services is not available. Please update it.';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.code === 'SIGN_IN_REQUIRED') {
        errorMessage = 'Please sign in to continue.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Add error code to details if available
      if (error.code) {
        errorDetails = `Error Code: ${error.code}`;
      }
      
      // Create enhanced error with all details
      const enhancedError = new Error(errorMessage);
      enhancedError.code = error.code;
      enhancedError.details = errorDetails;
      enhancedError.originalError = error;
      enhancedError.fullMessage = errorDetails ? `${errorMessage} (${errorDetails})` : errorMessage;
      
      throw enhancedError;
    }
  };

  const loginWithPhone = async (phoneNumber) => {
    try {
      const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
      return confirmation;
    } catch (error) {
      // Comprehensive error logging
      console.error('Phone sign-in error - Full details:', {
        code: error.code,
        message: error.message,
        error: error,
        stack: error.stack,
      });
      
      // Handle specific Firebase auth errors
      let errorMessage = 'Failed to send verification code. Please try again.';
      let errorDetails = '';
      
      if (error.code === 'auth/missing-client-identifier') {
        errorMessage = 'Authentication configuration error. SHA-1 fingerprint may not be configured in Firebase Console.';
        errorDetails = 'Please add your app\'s SHA-1 certificate fingerprint to Firebase Console. Check logs for SHA-1 value.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
        errorDetails = 'Unable to reach Firebase servers. Check your connection.';
      } else if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format. Please include country code (e.g., +1234567890).';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many verification attempts. Please try again later.';
      } else if (error.code === 'auth/quota-exceeded') {
        errorMessage = 'SMS quota exceeded. Please try again later or contact support.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Create enhanced error
      const enhancedError = new Error(errorMessage);
      enhancedError.code = error.code;
      enhancedError.details = errorDetails;
      enhancedError.originalError = error;
      enhancedError.fullMessage = errorDetails ? `${errorMessage}\n${errorDetails}` : errorMessage;
      
      throw enhancedError;
    }
  };

  const verifyPhoneCode = async (confirmation, code) => {
    try {
      await confirmation.confirm(code);
      // onAuthStateChanged will handle the rest
    } catch (error) {
      // Comprehensive error logging
      console.error('Phone verification error - Full details:', {
        code: error.code,
        message: error.message,
        error: error,
        stack: error.stack,
      });
      
      // Handle specific Firebase auth errors
      let errorMessage = 'Invalid verification code. Please try again.';
      let errorDetails = '';
      
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid verification code. Please check and try again.';
      } else if (error.code === 'auth/code-expired') {
        errorMessage = 'Verification code has expired. Please request a new one.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
        errorDetails = 'Unable to reach Firebase servers. Check your connection.';
      } else if (error.code === 'auth/session-expired') {
        errorMessage = 'Session expired. Please request a new verification code.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Create enhanced error
      const enhancedError = new Error(errorMessage);
      enhancedError.code = error.code;
      enhancedError.details = errorDetails;
      enhancedError.originalError = error;
      enhancedError.fullMessage = errorDetails ? `${errorMessage}\n${errorDetails}` : errorMessage;
      
      throw enhancedError;
    }
  };

  const logout = async () => {
    try {
      if (currentUser) {
        await clearKey(currentUser.userId);
      }
      await auth().signOut();
      await AsyncStorage.removeItem('sessionToken');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getAuthHeaders = useCallback(async () => {
    const user = auth().currentUser;
    if (!user) {
      const token = await AsyncStorage.getItem('sessionToken');
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
      return {};
    }
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, []);

  const value = {
    currentUser,
    sessionToken,
    encryptionKey,
    loading,
    loginWithGoogle,
    loginWithPhone,
    verifyPhoneCode,
    logout,
    getAuthHeaders,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

