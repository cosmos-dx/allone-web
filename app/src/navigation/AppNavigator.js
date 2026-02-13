import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';

// Screens
import LandingScreen from '../screens/LandingScreen';
import PhoneAuthScreen from '../screens/PhoneAuthScreen';
import DashboardScreen from '../screens/DashboardScreen';
import PasswordsScreen from '../screens/PasswordsScreen';
import AuthenticatorScreen from '../screens/AuthenticatorScreen';
import SpacesScreen from '../screens/SpacesScreen';
import BillScreen from '../screens/BillScreen';
import SpaceDetailScreen from '../screens/SpaceDetailScreen';
import SharedScreen from '../screens/SharedScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Custom Tab Bar
import CustomTabBar from '../components/navigation/CustomTabBar';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Passwords" component={PasswordsScreen} />
      <Tab.Screen name="Authenticator" component={AuthenticatorScreen} />
      <Tab.Screen name="Spaces" component={SpacesScreen} />
      <Tab.Screen name="Bills" component={BillScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function AppStack() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return null; // Show splash screen
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!currentUser ? (
        <>
          <Stack.Screen name="Landing" component={LandingScreen} />
          <Stack.Screen 
            name="PhoneAuth" 
            component={PhoneAuthScreen}
            options={{ headerShown: true, title: 'Phone Authentication' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen 
            name="SpaceDetail" 
            component={SpaceDetailScreen}
            options={{ headerShown: true, title: 'Space Details' }}
          />
          <Stack.Screen 
            name="Shared" 
            component={SharedScreen}
            options={{ headerShown: true, title: 'Shared Items' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <AppStack />
    </NavigationContainer>
  );
}

