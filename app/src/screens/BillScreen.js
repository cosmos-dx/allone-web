import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useRoute } from '@react-navigation/native';
import useBillStore from '../stores/billStore';
import useSpaceStore from '../stores/spaceStore';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card } from '../components/ui/Card';
import { createSquircleStyle } from '../utils/squircle';
import { toast } from '../utils/toast';

export default function BillScreen() {
  const { getAuthHeaders } = useAuth();
  const route = useRoute();
  const { spaceId } = route.params || {};
  const { bills, balances, loadBills, loadBalances, loading } = useBillStore();
  const { spaces } = useSpaceStore();
  const [selectedSpace, setSelectedSpace] = useState(null);

  useEffect(() => {
    if (spaceId) {
      const space = spaces.find(s => s.spaceId === spaceId);
      setSelectedSpace(space);
      loadBills(spaceId, false, getAuthHeaders);
      loadBalances(spaceId, false, getAuthHeaders);
    } else if (spaces.length > 0) {
      setSelectedSpace(spaces[0]);
      loadBills(spaces[0].spaceId, false, getAuthHeaders);
      loadBalances(spaces[0].spaceId, false, getAuthHeaders);
    }
  }, [spaceId, spaces]);

  if (loading) {
    return (
      <LinearGradient colors={['#faf5ff', '#fff7ed', '#fefce8']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9333ea" />
        </View>
      </LinearGradient>
    );
  }

  const spaceBills = selectedSpace ? (bills[selectedSpace.spaceId] || []) : [];
  const spaceBalances = selectedSpace ? (balances[selectedSpace.spaceId] || { balances: [] }) : { balances: [] };

  return (
    <LinearGradient colors={['#faf5ff', '#fff7ed', '#fefce8']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bills</Text>
        {selectedSpace && (
          <Text style={styles.subtitle}>{selectedSpace.name}</Text>
        )}
      </View>

      {/* Balance Summary */}
      {spaceBalances.balances && spaceBalances.balances.length > 0 && (
        <Card glass style={styles.balanceCard} radius="xl">
          <Text style={styles.balanceTitle}>Balance Summary</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {spaceBalances.balances.map((balance, index) => (
              <View key={index} style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>User {balance.userId.slice(0, 8)}</Text>
                <Text
                  style={[
                    styles.balanceAmount,
                    balance.netBalance > 0 ? styles.positive : styles.negative,
                  ]}
                >
                  {balance.netBalance > 0 ? '+' : ''}
                  ₹{Math.abs(balance.netBalance).toFixed(2)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </Card>
      )}

      {/* Bills List */}
      <FlatList
        data={spaceBills}
        keyExtractor={(item) => item.billId}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Card glass style={styles.billCard} radius="xl">
            <View style={styles.billHeader}>
              <View style={styles.billInfo}>
                <Text style={styles.billName}>{item.description || 'Bill'}</Text>
                <Text style={styles.billAmount}>₹{item.amount?.toFixed(2) || '0.00'}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  createSquircleStyle('md'),
                  item.isSettled ? styles.settled : styles.pending,
                ]}
              >
                <Text style={styles.statusText}>
                  {item.isSettled ? 'Settled' : 'Pending'}
                </Text>
              </View>
            </View>
            {item.participants && item.participants.length > 0 && (
              <View style={styles.participants}>
                <Text style={styles.participantsLabel}>
                  {item.participants.length} participant{item.participants.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </Card>
        )}
        ListEmptyComponent={
          <Card glass style={styles.emptyCard} radius="xl">
            <MaterialCommunityIcons name="receipt" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No bills yet</Text>
            <Text style={styles.emptySubtext}>
              Create a bill to split expenses with your space members
            </Text>
          </Card>
        }
      />
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
  header: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  balanceCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
  },
  balanceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  balanceItem: {
    marginRight: 16,
    padding: 12,
    backgroundColor: 'rgba(147, 51, 234, 0.05)',
    borderRadius: 12,
    minWidth: 120,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  positive: {
    color: '#22c55e',
  },
  negative: {
    color: '#ef4444',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  billCard: {
    marginBottom: 16,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  billInfo: {
    flex: 1,
  },
  billName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  billAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9333ea',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  settled: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  pending: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  participants: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  participantsLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
});

