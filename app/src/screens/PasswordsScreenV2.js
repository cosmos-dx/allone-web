import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import usePasswordStore from '../stores/passwordStore';
import useSpaceStore from '../stores/spaceStore';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { GlassCard } from '../components/ui/GlassCard';
import { GradientButton } from '../components/ui/GradientButton';
import { OptimizedList } from '../components/ui/OptimizedList';
import { SkeletonList } from '../components/ui/SkeletonLoader';
import { BottomSheet } from '../components/ui/BottomSheet';
import PasswordCard from '../components/passwords/PasswordCard';
import { Input } from '../components/ui/Input';
import { encryptData } from '../utils/encryption';
import { decryptPasswordOrNotes } from '../utils/encryptionHelpers';
import { generatePassword, calculatePasswordStrength } from '../utils/passwordGenerator';
import { toast } from '../utils/toast';
import theme from '../theme';
import { styles } from './styles/passwordsScreen';
import {
  PASSWORD_CARD_HEIGHT,
  CATEGORIES,
  STRENGTH_LABELS,
  SCREEN_TITLE,
  FORM_TITLE_ADD,
  FORM_TITLE_EDIT,
  PLACEHOLDER_NAME,
  PLACEHOLDER_USERNAME,
  PLACEHOLDER_PASSWORD,
  PLACEHOLDER_WEBSITE,
  PLACEHOLDER_NOTES,
  PLACEHOLDER_SEARCH,
  LABEL_NAME,
  LABEL_USERNAME,
  LABEL_PASSWORD,
  LABEL_WEBSITE,
  LABEL_CATEGORY,
  LABEL_NOTES,
  EMPTY_MESSAGE_FILTERED,
  EMPTY_MESSAGE_DEFAULT,
  BUTTON_ADD_PASSWORD,
  BUTTON_UPDATE_PASSWORD,
  DELETE_ALERT_TITLE,
  DELETE_ALERT_MESSAGE,
  DELETE_ALERT_CANCEL,
  DELETE_ALERT_CONFIRM,
  TOAST_PASSWORD_ADDED,
  TOAST_PASSWORD_UPDATED,
  TOAST_PASSWORD_DELETED,
} from '../common/constants/PasswordsScreen';
import { ERROR_MESSAGES, DEFAULTS } from '../constants';

export default function PasswordsScreen() {
  const { getAuthHeaders, encryptionKey, currentUser } = useAuth();
  const userId = currentUser?.uid || currentUser?.userId;
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
  const [refreshing, setRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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
  
  const bottomSheetRef = useRef(null);

  useEffect(() => {
    loadSpaces(false, getAuthHeaders);
    loadPasswords(null, true, false, getAuthHeaders);
  }, []);

  useEffect(() => {
    filterPasswords(selectedCategory, searchQuery);
  }, [searchQuery, selectedCategory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPasswords(null, true, true, getAuthHeaders);
    } catch (error) {
      console.error('Failed to refresh passwords:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadPasswords, getAuthHeaders]);

  const handleAddPassword = async () => {
    if (!formData.displayName || !formData.password) {
      toast.error(ERROR_MESSAGES.PASSWORD_NAME_REQUIRED);
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
        spaceId: formData.spaceId || DEFAULTS.SPACE_ID,
        tags: [],
      }, getAuthHeaders);

      toast.success(TOAST_PASSWORD_ADDED);
      bottomSheetRef.current?.close();
      setIsAddModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to add password:', error);
      toast.error(ERROR_MESSAGES.PASSWORD_ADD_FAILED);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPassword = async (password) => {
    try {
      const decryptedPassword = await decryptPasswordOrNotes(
        password.encryptedPassword,
        encryptionKey,
        userId
      );
      const decryptedNotes = password.notes
        ? await decryptPasswordOrNotes(password.notes, encryptionKey, userId)
        : '';

      setEditingPassword(password);
      setFormData({
        displayName: password.displayName || '',
        username: password.username || '',
        password: decryptedPassword,
        website: password.website || '',
        category: password.category || 'Other',
        notes: decryptedNotes,
        spaceId: password.spaceId || DEFAULTS.SPACE_ID,
      });
      bottomSheetRef.current?.snapToIndex(1);
      setIsAddModalOpen(true);
    } catch (error) {
      console.error('Failed to decrypt password:', error);
      toast.error(ERROR_MESSAGES.PASSWORD_LOAD_EDIT_FAILED);
    }
  };

  const handleUpdatePassword = async () => {
    if (!formData.displayName || !formData.password || !editingPassword) {
      toast.error(ERROR_MESSAGES.PASSWORD_NAME_REQUIRED);
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
        spaceId: formData.spaceId || DEFAULTS.SPACE_ID,
        tags: editingPassword.tags || [],
      }, getAuthHeaders);

      toast.success(TOAST_PASSWORD_UPDATED);
      bottomSheetRef.current?.close();
      setIsAddModalOpen(false);
      setEditingPassword(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update password:', error);
      toast.error(ERROR_MESSAGES.PASSWORD_UPDATE_FAILED);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePassword = useCallback(async (password) => {
    Alert.alert(
      DELETE_ALERT_TITLE,
      DELETE_ALERT_MESSAGE,
      [
        { text: DELETE_ALERT_CANCEL, style: 'cancel' },
        {
          text: DELETE_ALERT_CONFIRM,
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePassword(password.passwordId, getAuthHeaders);
              toast.success(TOAST_PASSWORD_DELETED);
            } catch (error) {
              console.error('Failed to delete password:', error);
              toast.error(ERROR_MESSAGES.PASSWORD_DELETE_FAILED);
            }
          },
        },
      ]
    );
  }, [deletePassword, getAuthHeaders]);

  const handleGeneratePassword = useCallback(async () => {
    try {
      const password = await generatePassword({ length: 16 });
      setFormData((prev) => ({ ...prev, password }));
    } catch (error) {
      console.error('Failed to generate password:', error);
      toast.error(ERROR_MESSAGES.PASSWORD_GENERATE_FAILED);
    }
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      displayName: '',
      username: '',
      password: '',
      website: '',
      category: DEFAULTS.PASSWORD_CATEGORY,
      notes: '',
      spaceId: spaces.length > 0 ? spaces[0].spaceId : DEFAULTS.SPACE_ID,
    });
    setShowPassword(false);
    setEditingPassword(null);
  }, [spaces]);

  const getStrengthColor = useCallback((strength) => {
    if (strength <= 1) return theme.passwordStrength.veryWeak;
    if (strength <= 2) return theme.passwordStrength.weak;
    if (strength <= 3) return theme.passwordStrength.fair;
    if (strength <= 4) return theme.passwordStrength.good;
    return theme.passwordStrength.strong;
  }, []);

  const renderPasswordCard = useCallback(({ item }) => (
    <PasswordCard
      password={item}
      encryptionKey={encryptionKey}
      userId={userId}
      onPress={() => handleEditPassword(item)}
      onEdit={handleEditPassword}
      onDelete={handleDeletePassword}
    />
  ), [encryptionKey, userId, handleEditPassword, handleDeletePassword]);

  const renderPasswordForm = () => (
    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.formTitle}>
        {editingPassword ? FORM_TITLE_EDIT : FORM_TITLE_ADD}
      </Text>

      <Input
        label={LABEL_NAME}
        placeholder={PLACEHOLDER_NAME}
        value={formData.displayName}
        onChangeText={(text) => setFormData({ ...formData, displayName: text })}
        leftIcon="text"
      />

      <Input
        label={LABEL_USERNAME}
        placeholder={PLACEHOLDER_USERNAME}
        value={formData.username}
        onChangeText={(text) => setFormData({ ...formData, username: text })}
        leftIcon="account"
        autoCapitalize="none"
      />

      <View style={styles.passwordField}>
        <Input
          label={LABEL_PASSWORD}
          placeholder={PLACEHOLDER_PASSWORD}
          value={formData.password}
          onChangeText={(text) => setFormData({ ...formData, password: text })}
          secureTextEntry={!showPassword}
        />
        <View style={styles.passwordActions}>
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.passwordActionButton}
          >
            <MaterialCommunityIcons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color={theme.colors.gray600}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleGeneratePassword}
            style={styles.passwordActionButton}
          >
            <MaterialCommunityIcons 
              name="key-variant" 
              size={20} 
              color={theme.colors.purple} 
            />
          </TouchableOpacity>
        </View>
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
            {STRENGTH_LABELS[calculatePasswordStrength(formData.password)]}
          </Text>
        </View>
      )}

      <Input
        label={LABEL_WEBSITE}
        placeholder={PLACEHOLDER_WEBSITE}
        value={formData.website}
        onChangeText={(text) => setFormData({ ...formData, website: text })}
        leftIcon="web"
        autoCapitalize="none"
      />

      <View style={styles.formField}>
        <Text style={styles.label}>{LABEL_CATEGORY}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setFormData({ ...formData, category: cat })}
              style={[
                styles.categoryChip,
                formData.category === cat && styles.categoryChipActive,
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

      <Input
        label={LABEL_NOTES}
        placeholder={PLACEHOLDER_NOTES}
        value={formData.notes}
        onChangeText={(text) => setFormData({ ...formData, notes: text })}
        multiline
        numberOfLines={3}
      />

      <View style={styles.formActions}>
        <GradientButton
          title={editingPassword ? BUTTON_UPDATE_PASSWORD : BUTTON_ADD_PASSWORD}
          onPress={editingPassword ? handleUpdatePassword : handleAddPassword}
          loading={submitting}
          disabled={submitting}
          size="lg"
        />
      </View>
    </ScrollView>
  );

  if (loading && filteredPasswords.length === 0) {
    return (
      <LinearGradient 
        colors={[theme.colors.background, theme.colors.gray50]} 
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{SCREEN_TITLE}</Text>
        </View>
        <SkeletonList count={5} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient 
      colors={[theme.colors.background, theme.colors.gray50]} 
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{SCREEN_TITLE}</Text>
        <TouchableOpacity
          onPress={() => {
            resetForm();
            bottomSheetRef.current?.snapToIndex(1);
            setIsAddModalOpen(true);
          }}
          style={styles.addButton}
        >
          <LinearGradient
            colors={theme.gradients.primary}
            start={theme.gradientPositions.horizontal.start}
            end={theme.gradientPositions.horizontal.end}
            style={styles.addButtonGradient}
          >
            <MaterialCommunityIcons name="plus" size={24} color={theme.colors.textInverse} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <GlassCard radius="xl" style={styles.searchCard}>
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.gray500} />
          <TextInput
            style={styles.searchInput}
            placeholder={PLACEHOLDER_SEARCH}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.colors.gray400}
          />
        </View>
      </GlassCard>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {['All', ...CATEGORIES].map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setSelectedCategory(cat)}
            style={[
              styles.categoryButton,
              selectedCategory === cat && styles.categoryButtonActive,
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

      <OptimizedList
        data={filteredPasswords}
        renderItem={renderPasswordCard}
        keyExtractor={(item) => item.passwordId}
        itemHeight={PASSWORD_CARD_HEIGHT}
        emptyMessage={
          searchQuery || selectedCategory !== 'All'
            ? EMPTY_MESSAGE_FILTERED
            : EMPTY_MESSAGE_DEFAULT
        }
        onRefresh={onRefresh}
        refreshing={refreshing}
      />

      {/* Bottom Sheet for Add/Edit */}
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={['50%', '90%']}
        enablePanDownToClose
        onChange={(index) => {
          if (index === -1) {
            setIsAddModalOpen(false);
            resetForm();
          }
        }}
      >
        {renderPasswordForm()}
      </BottomSheet>
    </LinearGradient>
  );
}
