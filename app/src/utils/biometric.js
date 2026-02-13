/**
 * Biometric Authentication Utilities
 * Provides Face ID, Touch ID, and fingerprint authentication
 */
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

/**
 * Check if biometric authentication is available
 * @returns {Promise<{available: boolean, type: string}>}
 */
export async function isBiometricAvailable() {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) {
      return { available: false, type: 'none' };
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      return { available: false, type: 'not_enrolled' };
    }

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const biometricType = types.includes(
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
    )
      ? 'face'
      : types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
      ? 'fingerprint'
      : types.includes(LocalAuthentication.AuthenticationType.IRIS)
      ? 'iris'
      : 'unknown';

    return { available: true, type: biometricType };
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return { available: false, type: 'error' };
  }
}

/**
 * Authenticate with biometrics
 * @param {string} promptMessage - Message to show in authentication prompt
 * @param {string} cancelLabel - Label for cancel button
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function authenticateWithBiometric(
  promptMessage = 'Authenticate to continue',
  cancelLabel = 'Cancel'
) {
  try {
    const { available } = await isBiometricAvailable();
    if (!available) {
      return {
        success: false,
        error: 'Biometric authentication is not available',
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel,
      disableDeviceFallback: false, // Allow PIN/password fallback
      fallbackLabel: 'Use PIN',
    });

    if (result.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: result.error || 'Authentication failed',
      };
    }
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return {
      success: false,
      error: error.message || 'Authentication error',
    };
  }
}

/**
 * Get biometric type name for display
 * @returns {Promise<string>}
 */
export async function getBiometricTypeName() {
  const { available, type } = await isBiometricAvailable();
  
  if (!available) {
    return 'Biometric';
  }

  switch (type) {
    case 'face':
      return 'Face ID';
    case 'fingerprint':
      return 'Fingerprint';
    case 'iris':
      return 'Iris';
    default:
      return 'Biometric';
  }
}

/**
 * Check if biometric is enabled for the app
 * @returns {Promise<boolean>}
 */
export async function isBiometricEnabled() {
  try {
    const enabled = await SecureStore.getItemAsync('biometric_enabled');
    return enabled === 'true';
  } catch (error) {
    console.error('Error checking biometric enabled:', error);
    return false;
  }
}

/**
 * Enable biometric authentication for the app
 * @returns {Promise<boolean>}
 */
export async function enableBiometric() {
  try {
    // First authenticate to enable
    const { success } = await authenticateWithBiometric(
      'Authenticate to enable biometric login'
    );
    
    if (!success) {
      return false;
    }

    await SecureStore.setItemAsync('biometric_enabled', 'true');
    return true;
  } catch (error) {
    console.error('Error enabling biometric:', error);
    return false;
  }
}

/**
 * Disable biometric authentication for the app
 * @returns {Promise<boolean>}
 */
export async function disableBiometric() {
  try {
    await SecureStore.deleteItemAsync('biometric_enabled');
    return true;
  } catch (error) {
    console.error('Error disabling biometric:', error);
    return false;
  }
}

/**
 * Authenticate with biometric if enabled, otherwise return success
 * @param {string} promptMessage - Message to show in authentication prompt
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function authenticateIfEnabled(
  promptMessage = 'Authenticate to continue'
) {
  const enabled = await isBiometricEnabled();
  
  if (!enabled) {
    return { success: true };
  }

  return await authenticateWithBiometric(promptMessage);
}

/**
 * Store sensitive data with biometric protection
 * @param {string} key - Storage key
 * @param {string} value - Value to store
 * @returns {Promise<boolean>}
 */
export async function storeSensitiveData(key, value) {
  try {
    const { success } = await authenticateWithBiometric(
      'Authenticate to save data'
    );
    
    if (!success) {
      return false;
    }

    await SecureStore.setItemAsync(key, value, {
      requireAuthentication: true,
    });
    
    return true;
  } catch (error) {
    console.error('Error storing sensitive data:', error);
    return false;
  }
}

/**
 * Retrieve sensitive data with biometric protection
 * @param {string} key - Storage key
 * @returns {Promise<{success: boolean, data?: string, error?: string}>}
 */
export async function retrieveSensitiveData(key) {
  try {
    const { success } = await authenticateWithBiometric(
      'Authenticate to access data'
    );
    
    if (!success) {
      return { success: false, error: 'Authentication failed' };
    }

    const data = await SecureStore.getItemAsync(key);
    
    if (data) {
      return { success: true, data };
    } else {
      return { success: false, error: 'Data not found' };
    }
  } catch (error) {
    console.error('Error retrieving sensitive data:', error);
    return { success: false, error: error.message };
  }
}

export default {
  isBiometricAvailable,
  authenticateWithBiometric,
  getBiometricTypeName,
  isBiometricEnabled,
  enableBiometric,
  disableBiometric,
  authenticateIfEnabled,
  storeSensitiveData,
  retrieveSensitiveData,
};
