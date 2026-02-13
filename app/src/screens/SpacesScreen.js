import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import useSpaceStore from '../stores/spaceStore';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { createSquircleStyle } from '../utils/squircle';
import { toast } from '../utils/toast';

export default function SpacesScreen() {
  const { getAuthHeaders } = useAuth();
  const navigation = useNavigation();
  const { spaces, loadSpaces, createSpace, loading } = useSpaceStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'personal' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSpaces(false, getAuthHeaders);
  }, []);

  const getSpaceIcon = (type) => {
    switch (type) {
      case 'family':
        return 'account-group';
      case 'work':
        return 'briefcase';
      default:
        return 'home';
    }
  };

  const getSpaceColor = (type) => {
    switch (type) {
      case 'family':
        return '#22c55e';
      case 'work':
        return '#3b82f6';
      default:
        return '#9333ea';
    }
  };

  const handleAddSpace = async () => {
    if (!formData.name) {
      toast.error('Space name is required');
      return;
    }

    setSubmitting(true);
    try {
      await createSpace(formData, getAuthHeaders);
      toast.success('Space created successfully');
      setIsAddModalOpen(false);
      setFormData({ name: '', type: 'personal' });
      loadSpaces(true, getAuthHeaders);
    } catch (error) {
      console.error('Failed to create space:', error);
      toast.error('Failed to create space');
    } finally {
      setSubmitting(false);
    }
  };

  const renderSpaceItem = ({ item }) => {
    const icon = getSpaceIcon(item.type);
    const color = getSpaceColor(item.type);

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('SpaceDetail', { spaceId: item.spaceId })}
        activeOpacity={0.7}
      >
        <Card glass style={styles.spaceCard} radius="xl">
          <View style={styles.spaceHeader}>
            <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
              <MaterialCommunityIcons name={icon} size={32} color={color} />
            </View>
            <View style={styles.spaceInfo}>
              <Text style={styles.spaceName}>{item.name}</Text>
              <Text style={styles.spaceType}>{item.type?.charAt(0).toUpperCase() + item.type?.slice(1) || 'Personal'}</Text>
              {item.members && (
                <Text style={styles.memberCount}>
                  {item.members.length + 1} member{item.members.length !== 0 ? 's' : ''}
                </Text>
              )}
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={['#faf5ff', '#fff7ed', '#fefce8']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#faf5ff', '#fff7ed', '#fefce8']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Spaces</Text>
        <TouchableOpacity
          onPress={() => setIsAddModalOpen(true)}
          style={[styles.addButton, createSquircleStyle('xl')]}
        >
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={styles.addButtonGradient}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <FlatList
        data={spaces}
        renderItem={renderSpaceItem}
        keyExtractor={(item) => item.spaceId}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Card glass style={styles.emptyCard} radius="xl">
            <MaterialCommunityIcons name="account-group" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No spaces yet</Text>
            <Text style={styles.emptySubtext}>
              Create a space to organize and share your passwords
            </Text>
          </Card>
        }
      />

      {/* Add Modal */}
      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIsAddModalOpen(false);
          setFormData({ name: '', type: 'personal' });
        }}
      >
        <View style={styles.modalOverlay}>
          <Card glass style={styles.modalCard} radius="xl">
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.form}>
                <Text style={styles.formTitle}>Create Space</Text>

                <View style={styles.formField}>
                  <Text style={styles.label}>Space Name *</Text>
                  <Input
                    placeholder="e.g., Family, Work Team"
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.label}>Space Type</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                    {['personal', 'family', 'work'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setFormData({ ...formData, type })}
                        style={[
                          styles.typeChip,
                          formData.type === type && styles.typeChipActive,
                          createSquircleStyle('md'),
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={getSpaceIcon(type)}
                          size={20}
                          color={formData.type === type ? '#ffffff' : getSpaceColor(type)}
                        />
                        <Text
                          style={[
                            styles.typeChipText,
                            formData.type === type && styles.typeChipTextActive,
                          ]}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.formActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setIsAddModalOpen(false);
                      setFormData({ name: '', type: 'personal' });
                    }}
                    style={[styles.cancelButton, createSquircleStyle('xl')]}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleAddSpace}
                    disabled={submitting}
                    style={[styles.submitButton, createSquircleStyle('xl')]}
                  >
                    <LinearGradient
                      colors={['#6366f1', '#8b5cf6']}
                      style={styles.submitGradient}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.submitButtonText}>Create Space</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </Card>
        </View>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    width: 56,
    height: 56,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  spaceCard: {
    marginBottom: 16,
  },
  spaceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  spaceInfo: {
    flex: 1,
  },
  spaceName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  spaceType: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  memberCount: {
    fontSize: 12,
    color: '#9ca3af',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  modalContent: {
    maxHeight: '90%',
  },
  form: {
    padding: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 24,
  },
  formField: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  typeScroll: {
    marginTop: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    gap: 8,
  },
  typeChipActive: {
    backgroundColor: '#6366f1',
  },
  typeChipText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  typeChipTextActive: {
    color: '#ffffff',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButton: {
    flex: 1,
    overflow: 'hidden',
  },
  submitGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

