import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { styles } from './styles/passwordsScreenLegacy';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import usePasswordStore from '../stores/passwordStore';
import useSpaceStore from '../stores/spaceStore';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card } from '../components/ui/Card';
import PasswordCard from '../components/passwords/PasswordCard';
import { Input } from '../components/ui/Input';
import { createSquircleStyle } from '../utils/squircle';
import { encryptData, decryptData } from '../utils/encryption';
import { generatePassword, calculatePasswordStrength } from '../utils/passwordGenerator';
import { toast } from '../utils/toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CATEGORIES = ['Social', 'Banking', 'Work', 'Shopping', 'Email', 'Entertainment', 'Other'];

export default function PasswordsScreen() {
  const { getAuthHeaders, encryptionKey } = useAuth();
  const { 
    filteredPasswords, 
    loadPasswords, 
    filterPasswords,
    createPassword,
    updatePassword,
    deletePassword,
    loading,
  } = usePasswordStore();
  const { spaces, loadSpaces } = useSpaceStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState(null);
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    password: '',
    website: '',
    category: 'Other',
    notes: '',
    spaceId: 'personal',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSpaces(false, getAuthHeaders);
    loadPasswords(null, true, false, getAuthHeaders);
  }, []);

  useEffect(() => {
    filterPasswords(selectedCategory, searchQuery);
  }, [searchQuery, selectedCategory, filterPasswords]);

  const handleAddPassword = async () => {
    if (!formData.displayName || !formData.password) {
      toast.error('Name and password are required');
      return;
    }

    setSubmitting(true);
    try {
      const encryptedPassword = await encryptData(formData.password, encryptionKey);
      const encryptedNotes = formData.notes ? await encryptData(formData.notes, encryptionKey) : '';
      const passwordStrength = calculatePasswordStrength(formData.password);

      await createPassword({
        displayName: formData.displayName,
        username: formData.username || '',
        website: formData.website || '',
        category: formData.category || 'Other',
        encryptedPassword,
        notes: encryptedNotes,
        strength: passwordStrength,
        spaceId: formData.spaceId || 'personal',
        tags: [],
      }, getAuthHeaders);

      toast.success('Password added successfully');
      setIsAddModalOpen(false);
      resetForm();
      loadPasswords(null, true, true, getAuthHeaders);
    } catch (error) {
      console.error('Failed to add password:', error);
      toast.error('Failed to add password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPassword = async (password) => {
    try {
      const decryptedPassword = await decryptData(password.encryptedPassword, encryptionKey);
      const decryptedNotes = password.notes ? await decryptData(password.notes, encryptionKey) : '';
      
      setEditingPassword(password);
      setFormData({
        displayName: password.displayName || '',
        username: password.username || '',
        password: decryptedPassword,
        website: password.website || '',
        category: password.category || 'Other',
        notes: decryptedNotes,
        spaceId: password.spaceId || 'personal',
      });
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Failed to decrypt password:', error);
      toast.error('Failed to load password for editing');
    }
  };

  const handleUpdatePassword = async () => {
    if (!formData.displayName || !formData.password || !editingPassword) {
      toast.error('Name and password are required');
      return;
    }

    setSubmitting(true);
    try {
      const encryptedPassword = await encryptData(formData.password, encryptionKey);
      const encryptedNotes = formData.notes ? await encryptData(formData.notes, encryptionKey) : '';
      const passwordStrength = calculatePasswordStrength(formData.password);

      await updatePassword(editingPassword.passwordId, {
        displayName: formData.displayName,
        username: formData.username || '',
        website: formData.website || '',
        category: formData.category || 'Other',
        encryptedPassword,
        notes: encryptedNotes,
        strength: passwordStrength,
        spaceId: formData.spaceId || 'personal',
        tags: editingPassword.tags || [],
      }, getAuthHeaders);

      toast.success('Password updated successfully');
      setIsEditModalOpen(false);
      setEditingPassword(null);
      resetForm();
      loadPasswords(null, true, true, getAuthHeaders);
    } catch (error) {
      console.error('Failed to update password:', error);
      toast.error('Failed to update password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePassword = async (password) => {
    Alert.alert(
      'Delete Password',
      'Are you sure you want to delete this password?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePassword(password.passwordId, getAuthHeaders);
              toast.success('Password deleted');
              loadPasswords(null, true, true, getAuthHeaders);
            } catch (error) {
              console.error('Failed to delete password:', error);
              toast.error('Failed to delete password');
            }
          },
        },
      ]
    );
  };

  const handleGeneratePassword = async () => {
    try {
      const password = await generatePassword({ length: 16 });
      setFormData({ ...formData, password });
    } catch (error) {
      console.error('Failed to generate password:', error);
      toast.error('Failed to generate password');
    }
  };

  const resetForm = () => {
    setFormData({
      displayName: '',
      username: '',
      password: '',
      website: '',
      category: 'Other',
      notes: '',
      spaceId: spaces.length > 0 ? spaces[0].spaceId : 'personal',
    });
    setShowPassword(false);
    setEditingPassword(null);
  };

  const renderPasswordForm = (isEdit = false) => (
    <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <Text style={styles.formTitle}>{isEdit ? 'Edit Password' : 'Add New Password'}</Text>

        <View style={styles.formField}>
          <Text style={styles.label}>Name *</Text>
          <Input
            placeholder="e.g., Facebook, Gmail"
            value={formData.displayName}
            onChangeText={(text) => setFormData({ ...formData, displayName: text })}
          />
        </View>

        <View style={styles.formField}>
          <Text style={styles.label}>Username/Email</Text>
          <Input
            placeholder="username@example.com"
            value={formData.username}
            onChangeText={(text) => setFormData({ ...formData, username: text })}
          />
        </View>

        <View style={styles.formField}>
          <Text style={styles.label}>Password *</Text>
          <View style={styles.passwordInputContainer}>
            <Input
              placeholder="Enter password"
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              secureTextEntry={!showPassword}
              style={styles.passwordInput}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <MaterialCommunityIcons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#6b7280"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleGeneratePassword}
              style={styles.generateButton}
            >
              <MaterialCommunityIcons name="key" size={20} color="#9333ea" />
            </TouchableOpacity>
          </View>
          {formData.password && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBar}>
                <View
                  style={[
                    styles.strengthFill,
                    {
                      width: `${(calculatePasswordStrength(formData.password) / 5) * 100}%`,
                      backgroundColor: getStrengthColor(calculatePasswordStrength(formData.password)),
                    },
                  ]}
                />
              </View>
              <Text style={styles.strengthText}>
                {['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][calculatePasswordStrength(formData.password)]}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.formField}>
          <Text style={styles.label}>Website</Text>
          <Input
            placeholder="https://example.com"
            value={formData.website}
            onChangeText={(text) => setFormData({ ...formData, website: text })}
          />
        </View>

        <View style={styles.formField}>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setFormData({ ...formData, category: cat })}
                style={[
                  styles.categoryChip,
                  formData.category === cat && styles.categoryChipActive,
                  createSquircleStyle('md'),
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    formData.category === cat && styles.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.formField}>
          <Text style={styles.label}>Notes</Text>
          <Input
            placeholder="Additional notes (encrypted)"
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.formActions}>
          <TouchableOpacity
            onPress={() => {
              if (isEdit) {
                setIsEditModalOpen(false);
              } else {
                setIsAddModalOpen(false);
              }
              resetForm();
            }}
            style={[styles.cancelButton, createSquircleStyle('xl')]}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={isEdit ? handleUpdatePassword : handleAddPassword}
            disabled={submitting}
            style={[styles.submitButton, createSquircleStyle('xl')]}
          >
            <LinearGradient
              colors={['#9333ea', '#ea580c']}
              style={styles.submitGradient}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isEdit ? 'Update' : 'Add'} Password
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const getStrengthColor = (strength) => {
    if (strength <= 2) return '#ef4444';
    if (strength <= 3) return '#f59e0b';
    if (strength <= 4) return '#eab308';
    return '#22c55e';
  };

  if (loading) {
    return (
      <LinearGradient colors={['#faf5ff', '#fff7ed', '#fefce8']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9333ea" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#faf5ff', '#fff7ed', '#fefce8']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Passwords</Text>
        <TouchableOpacity
          onPress={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          style={[styles.addButton, createSquircleStyle('xl')]}
        >
          <LinearGradient
            colors={['#9333ea', '#ea580c']}
            style={styles.addButtonGradient}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Card glass style={styles.searchCard} radius="xl">
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search passwords..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </Card>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
        {['All', ...CATEGORIES].map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setSelectedCategory(cat)}
            style={[
              styles.categoryButton,
              selectedCategory === cat && styles.categoryButtonActive,
              createSquircleStyle('xl'),
            ]}
          >
            <Text
              style={[
                styles.categoryButtonText,
                selectedCategory === cat && styles.categoryButtonTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredPasswords}
        renderItem={({ item }) => (
          <PasswordCard
            password={item}
            encryptionKey={encryptionKey}
            onPress={() => handleEditPassword(item)}
            onEdit={handleEditPassword}
            onDelete={handleDeletePassword}
          />
        )}
        keyExtractor={(item) => item.passwordId}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Card glass style={styles.emptyCard} radius="xl">
            <MaterialCommunityIcons name="key-variant" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No passwords found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || selectedCategory !== 'All'
                ? 'Try adjusting your filters'
                : 'Add your first password to get started'}
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
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <Card glass style={styles.modalCard} radius="xl">
            {renderPasswordForm(false)}
          </Card>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={isEditModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <Card glass style={styles.modalCard} radius="xl">
            {renderPasswordForm(true)}
          </Card>
        </View>
      </Modal>
    </LinearGradient>
  );
}
