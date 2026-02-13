import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AIAssistant from './AIAssistant';
import { LinearGradient } from 'expo-linear-gradient';

export default function Layout({ children }) {
  const { logout, currentUser } = useAuth();
  const navigation = useNavigation();
  const [isAIOpen, setIsAIOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigation.replace('Landing');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.8)']}
        style={styles.topBar}
      >
        <View style={styles.topBarContent}>
          {/* Logo */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('Dashboard')}
            style={styles.logoContainer}
          >
            <Image 
              source={require('../../assets/images/Alloneicon.png')}
              style={styles.logo}
            />
            <Text style={styles.logoText}>AllOne</Text>
          </TouchableOpacity>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => setIsAIOpen(!isAIOpen)}
              style={styles.iconButton}
            >
              <MaterialCommunityIcons name="robot" size={24} color="#9333ea" />
              <View style={styles.pulseDot} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogout}
              style={styles.iconButton}
            >
              <MaterialCommunityIcons name="logout" size={24} color="#ef4444" />
            </TouchableOpacity>

            {currentUser?.photoURL && (
              <Image
                source={{ uri: currentUser.photoURL }}
                style={styles.avatar}
              />
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Main Content */}
      <View style={styles.content}>
        {children}
      </View>

      {/* AI Assistant */}
      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf5ff',
  },
  topBar: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 32,
    height: 32,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#9333ea',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  pulseDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9333ea',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e9d5ff',
  },
  content: {
    flex: 1,
  },
});

