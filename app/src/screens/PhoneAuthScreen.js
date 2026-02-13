import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

export default function PhoneAuthScreen() {
  const { loginWithPhone, verifyPhoneCode } = useAuth();
  const navigation = useNavigation();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a valid phone number');
      return;
    }

    // Format phone number with country code if not present
    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+${formattedPhone}`;
    }

    setLoading(true);
    setError('');

    try {
      const confirmationResult = await loginWithPhone(formattedPhone);
      setConfirmation(confirmationResult);
    } catch (err) {
      console.error('Phone sign-in error:', err);
      
      // Show error in snackbar
      const errorCode = err.code || 'UNKNOWN';
      const errorMessage = err.message || err.fullMessage || 'Failed to send verification code. Please try again.';
      const errorDetails = err.details || '';
      
      // Build detailed error message for snackbar
      let detailedMessage = errorMessage;
      if (errorDetails) {
        detailedMessage = `${errorMessage}\n${errorDetails}`;
      }
      
      // Special handling for missing-client-identifier
      if (errorCode === 'auth/missing-client-identifier') {
        Toast.show({
          type: 'error',
          text1: 'Configuration Error',
          text2: detailedMessage + '\n\nSHA-1 Debug: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25',
          visibilityTime: 8000,
          topOffset: 60,
          onPress: () => Toast.hide(),
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Phone Authentication Failed',
          text2: detailedMessage,
          visibilityTime: 6000,
          topOffset: 60,
          onPress: () => Toast.hide(),
        });
      }
      
      // Also set error state for UI display
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim() || code.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    if (!confirmation) {
      setError('No confirmation available. Please request a new code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await verifyPhoneCode(confirmation, code);
      // Navigation will happen automatically via AuthContext when user is set
    } catch (err) {
      console.error('Phone verification error:', err);
      
      // Show error in snackbar
      const errorCode = err.code || 'UNKNOWN';
      const errorMessage = err.message || err.fullMessage || 'Invalid verification code. Please try again.';
      const errorDetails = err.details || '';
      
      // Build detailed error message for snackbar
      let detailedMessage = errorMessage;
      if (errorDetails) {
        detailedMessage = `${errorMessage}\n${errorDetails}`;
      }
      
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: detailedMessage,
        visibilityTime: 5000,
        topOffset: 60,
        onPress: () => Toast.hide(),
      });
      
      // Also set error state for UI display
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (confirmation) {
      setConfirmation(null);
      setCode('');
      setError('');
    } else {
      navigation.goBack();
    }
  };

  return (
    <LinearGradient
      colors={['#faf5ff', '#fff7ed', '#fefce8']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={styles.title}>Phone Authentication</Text>
            <Text style={styles.subtitle}>
              {confirmation
                ? 'Enter the verification code sent to your phone'
                : 'Enter your phone number to receive a verification code'}
            </Text>

            {!confirmation ? (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+1234567890"
                  placeholderTextColor="#9ca3af"
                  value={phoneNumber}
                  onChangeText={(text) => {
                    setPhoneNumber(text);
                    setError('');
                  }}
                  keyboardType="phone-pad"
                  autoFocus
                  editable={!loading}
                />
                <Text style={styles.hint}>
                  Include country code (e.g., +1 for US)
                </Text>
              </View>
            ) : (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Verification Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="000000"
                  placeholderTextColor="#9ca3af"
                  value={code}
                  onChangeText={(text) => {
                    // Only allow digits and limit to 6 characters
                    const digits = text.replace(/[^0-9]/g, '').slice(0, 6);
                    setCode(digits);
                    setError('');
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  editable={!loading}
                />
                <Text style={styles.hint}>
                  Enter the 6-digit code sent to {phoneNumber}
                </Text>
              </View>
            )}

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={confirmation ? handleVerifyCode : handleSendCode}
              disabled={loading}
            >
              <LinearGradient
                colors={['#9333ea', '#ea580c']}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>
                    {confirmation ? 'Verify Code' : 'Send Code'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              disabled={loading}
            >
              <Text style={styles.backButtonText}>
                {confirmation ? 'Change Phone Number' : 'Back'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#9333ea',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 6,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#9333ea',
    fontSize: 16,
    fontWeight: '600',
  },
});

