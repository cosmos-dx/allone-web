import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card } from '../components/ui/Card';
import useUIStore from '../stores/uiStore';
import { createSquircleStyle } from '../utils/squircle';
import { toast } from '../utils/toast';
import useScrollToShowNav from '../hooks/useScrollToShowNav';

export default function SettingsScreen() {
  const { logout, currentUser } = useAuth();
  const navigation = useNavigation();
  const { navPosition, setNavPosition, showBottomNavOnScroll, setShowBottomNavOnScroll } = useUIStore();
  const { onScroll, scrollEventThrottle } = useScrollToShowNav();

  const handleLogout = async () => {
    try {
      await logout();
      navigation.replace('Landing');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const handleShowNavOnScrollChange = async (value) => {
    await setShowBottomNavOnScroll(value);
    toast.success(value ? 'Nav bar will show when you scroll' : 'Nav bar always visible');
  };

  const handleNavPositionChange = async (value) => {
    const newPosition = value ? 'right' : 'left';
    await setNavPosition(newPosition);
    toast.success(`Navigation moved to ${newPosition} side`);
  };

  return (
    <LinearGradient colors={['#faf5ff', '#fff7ed', '#fefce8']} style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Settings</Text>
          
          {/* Account Section */}
          <Card glass style={styles.card} radius="xl">
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(147, 51, 234, 0.1)' }]}>
                <MaterialCommunityIcons name="account" size={24} color="#9333ea" />
              </View>
              <Text style={styles.cardTitle}>Account</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoText}>{currentUser?.email || 'Not available'}</Text>
            </View>
          </Card>

          {/* Appearance Section */}
          <Card glass style={styles.card} radius="xl">
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <MaterialCommunityIcons name="palette" size={24} color="#3b82f6" />
              </View>
              <Text style={styles.cardTitle}>Appearance</Text>
            </View>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <MaterialCommunityIcons name="gesture-swipe" size={20} color="#6b7280" />
                <Text style={styles.settingLabel}>Show nav bar on scroll</Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={styles.settingValue}>{showBottomNavOnScroll ? 'On scroll' : 'Always'}</Text>
                <Switch
                  value={showBottomNavOnScroll}
                  onValueChange={handleShowNavOnScrollChange}
                  trackColor={{ false: '#d1d5db', true: '#9333ea' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <MaterialCommunityIcons name="navigation" size={20} color="#6b7280" />
                <Text style={styles.settingLabel}>Navigation Position</Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={styles.settingValue}>{navPosition === 'right' ? 'Right' : 'Left'}</Text>
                <Switch
                  value={navPosition === 'right'}
                  onValueChange={handleNavPositionChange}
                  trackColor={{ false: '#d1d5db', true: '#9333ea' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          </Card>

          {/* Security Section */}
          <Card glass style={styles.card} radius="xl">
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                <MaterialCommunityIcons name="shield-check" size={24} color="#22c55e" />
              </View>
              <Text style={styles.cardTitle}>Security</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.infoText}>Your data is encrypted end-to-end</Text>
            </View>
          </Card>

          {/* Logout Button */}
          <TouchableOpacity 
            style={[styles.logoutButton, createSquircleStyle('xl')]} 
            onPress={handleLogout}
          >
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              style={styles.logoutGradient}
            >
              <MaterialCommunityIcons name="logout" size={24} color="#ffffff" />
              <Text style={styles.logoutText}>Logout</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 24,
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  cardContent: {
    marginTop: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingValue: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  logoutButton: {
    marginTop: 24,
    overflow: 'hidden',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

