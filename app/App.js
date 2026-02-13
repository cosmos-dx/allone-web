import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet } from 'react-native';
import { registerBackgroundSync } from './src/services/backgroundService';
import autofillService from './src/services/autofillService';
import { SnackbarContainer } from './src/components/ui/Snackbar';
import useUIStore from './src/stores/uiStore';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { currentUser, getAuthHeaders, encryptionKey, sessionToken } = useAuth();
  const { init: initUI } = useUIStore();

  useEffect(() => {
    initUI();
    registerBackgroundSync();
    if (currentUser && encryptionKey && sessionToken) {
      const userId = currentUser.uid || currentUser.userId;
      autofillService.initialize(getAuthHeaders, encryptionKey, userId);
    }
  }, [currentUser, encryptionKey, sessionToken, initUI]);

  return <AppNavigator />;
}

export default function App() {
  useEffect(() => {
    // Hide splash screen after a short delay
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <AuthProvider>
        <StatusBar style="auto" />
        <AppContent />
        <SnackbarContainer />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

