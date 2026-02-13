import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { spaceService } from '../services/spaceService';

export default function SpaceDetailScreen() {
  const route = useRoute();
  const { spaceId } = route.params;
  const { getAuthHeaders } = useAuth();
  const [space, setSpace] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSpace = async () => {
      try {
        const headers = await getAuthHeaders();
        const spaceData = await spaceService.getById(spaceId, headers);
        setSpace(spaceData);
      } catch (error) {
        console.error('Failed to load space:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSpace();
  }, [spaceId]);

  if (loading) {
    return (
      <LinearGradient colors={['#faf5ff', '#fff7ed', '#fefce8']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#faf5ff', '#fff7ed', '#fefce8']} style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>{space?.name}</Text>
          <Text style={styles.type}>{space?.type}</Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  type: {
    fontSize: 18,
    color: '#6b7280',
  },
});

