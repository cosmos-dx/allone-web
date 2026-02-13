import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function SharedScreen() {
  return (
    <LinearGradient colors={['#faf5ff', '#fff7ed', '#fefce8']} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Shared Items</Text>
        <Text style={styles.subtitle}>Items shared with you will appear here</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});

