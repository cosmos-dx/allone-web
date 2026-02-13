// Firebase configuration for React Native
// The actual initialization is handled by @react-native-firebase
// Configuration files are read from:
// - android/app/google-services.json (Android)
// - ios/GoogleService-Info.plist (iOS)

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Export Firebase services
export { auth, firestore };

// Google Auth Provider
export const googleProvider = auth.GoogleAuthProvider;

export default {
  auth,
  firestore,
  googleProvider,
};
