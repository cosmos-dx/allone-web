import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { LANDING_PAGE_FEATURES, LANDING_PAGE_PHRASES, 
  LANDING_PAGE_SUBTITLE, LANDING_PAGE_DESCRIPTION, LANDING_PAGE_BUTTON_TEXT, 
  LANDING_PAGE_FEATURES_TITLE, LANDING_PAGE_FEATURES_SUBTITLE } 
  from '../common/constants/LandingPageConstants';
import { GLOBAL_ERRORS } from '../common/errors/global';
import { styles } from './styles/landingScreen';
export default function LandingScreen() {
  const { loginWithGoogle, currentUser, loading } = useAuth();
  const navigation = useNavigation();
  const [typewriterText, setTypewriterText] = useState('');
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [signInLoading, setSignInLoading] = useState(false);
  const [error, setError] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const features = LANDING_PAGE_FEATURES;
  const phrases = LANDING_PAGE_PHRASES;

  useEffect(() => {
    if (currentUser) {
      navigation.replace('MainTabs');
    }
  }, [currentUser, navigation]);

  // Typewriter effect
  useEffect(() => {
    let timeout;
    const currentPhrase = phrases[currentPhraseIndex];
    
    if (typewriterText.length < currentPhrase.length) {
      timeout = setTimeout(() => {
        setTypewriterText(currentPhrase.slice(0, typewriterText.length + 1));
      }, 100);
    } else {
      timeout = setTimeout(() => {
        setTypewriterText('');
        setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
      }, 3000);
    }
    
    return () => clearTimeout(timeout);
  }, [typewriterText, currentPhraseIndex]);

  // Fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleGoogleSignIn = async () => {
    setSignInLoading(true);
    setError('');
    
    try {
      await loginWithGoogle();
      // Success - navigation will happen automatically via useEffect when currentUser is set
    } catch (error) {
      console.error('Sign in error:', error);
      
      // Show detailed error in snackbar
      const errorCode = error.code || GLOBAL_ERRORS.unknown_error;
      const errorMessage = error.message || error.fullMessage || GLOBAL_ERRORS.auth_error;
      const errorDetails = error.details || '';
      
      // Build detailed error message for snackbar
      let detailedMessage = errorMessage;
      if (errorDetails) {
        detailedMessage = `${errorMessage}\n${errorDetails}`;
      }
      
      // Special handling for DEVELOPER_ERROR
      if (errorCode === 'DEVELOPER_ERROR' || errorCode === '10') {
        const developerError = new Error(
          `${GLOBAL_DEVELOPER_ERRORS.developer_error + errorCode}\n${GLOBAL_DEVELOPER_ERRORS.developer_error_message + errorMessage}\n${GLOBAL_DEVELOPER_ERRORS.developer_error_details + errorDetails}`
        );
        throw developerError;
        
      } else {
        Toast.show({
          type: 'error',
          text1: GLOBAL_ERRORS.auth_error,
          text2: `${detailedMessage}\n${GLOBAL_ERRORS.auth_error_details}`,
          visibilityTime: 5000,
          topOffset: 60,
        });
      }
      
      // Also set error state for UI display (backup)
      setError(errorMessage);
    } finally {
      setSignInLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9333ea" />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#faf5ff', '#fff7ed', '#fefce8']}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.heroSection}>
            <View >
              <Image
                source={require('../../assets/images/Alloneicon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            
            <View style={styles.titleContainer}>
              <Text style={styles.typewriterText} numberOfLines={2}>
                {typewriterText}
                <Text style={styles.cursor}>|</Text>
              </Text>
            </View>

            <Text style={styles.subtitle}>
              {LANDING_PAGE_SUBTITLE}
            </Text>
            <Text style={styles.description}>
              {LANDING_PAGE_DESCRIPTION}
            </Text>

            <TouchableOpacity
              style={[styles.googleButton, signInLoading && styles.buttonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={signInLoading}
            >
              <LinearGradient
                colors={['#9333ea', '#ea580c']}
                style={styles.buttonGradient}
              >
                {signInLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>{LANDING_PAGE_BUTTON_TEXT}</Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#ffffff" style={styles.buttonIcon} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {error ? (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={20} color="#dc2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>{LANDING_PAGE_FEATURES_TITLE}</Text>
            <Text style={styles.featuresSubtitle}>
              {LANDING_PAGE_FEATURES_SUBTITLE}
            </Text>

            <View style={styles.featuresGrid}>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureCard}>
                  <View style={[styles.featureIconContainer, { backgroundColor: `${feature.color}15` }]}>
                    <MaterialCommunityIcons 
                      name={feature.icon} 
                      size={32} 
                      color={feature.color} 
                    />
                  </View>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}
