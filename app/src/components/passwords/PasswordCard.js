import React, { useState, memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { GlassCard } from '../ui/GlassCard';
import { decryptPasswordOrNotes } from '../../utils/encryptionHelpers';
import { toast } from '../../utils/toast';
import { ERROR_MESSAGES } from '../../constants';
import theme from '../../theme';
import { styles } from '../styles/passwordCard';

// Use Clipboard API - fallback if expo-clipboard not available
let Clipboard;
try {
  Clipboard = require('expo-clipboard');
} catch (e) {
  try {
    const { Clipboard: RNClipboard } = require('react-native');
    Clipboard = {
      setStringAsync: async (text) => RNClipboard.setString(text),
    };
  } catch (e2) {
    Clipboard = {
      setStringAsync: async (text) => {
        console.log('Clipboard not available, text:', text);
        return Promise.resolve();
      },
    };
  }
}

const PasswordCard = memo(({ password, encryptionKey, userId, onPress, onEdit, onDelete }) => {
  const [revealed, setRevealed] = useState(false);
  const [decryptedPassword, setDecryptedPassword] = useState('');
  const [scaleAnim] = useState(new Animated.Value(1));

  const handleReveal = useCallback(async () => {
    if (!revealed && !decryptedPassword) {
      try {
        const decrypted = await decryptPasswordOrNotes(
          password.encryptedPassword,
          encryptionKey,
          userId
        );
        setDecryptedPassword(decrypted);
        setRevealed(true);
      } catch (error) {
        console.error('Failed to decrypt password:', error);
        toast.error(ERROR_MESSAGES.PASSWORD_DECRYPT_FAILED);
      }
    } else {
      setRevealed(!revealed);
    }
  }, [revealed, decryptedPassword, password.encryptedPassword, encryptionKey, userId]);

  const handleCopy = useCallback(async () => {
    try {
      let passwordToCopy = decryptedPassword;
      if (!passwordToCopy) {
        const decrypted = await decryptPasswordOrNotes(
          password.encryptedPassword,
          encryptionKey,
          userId
        );
        setDecryptedPassword(decrypted);
        passwordToCopy = decrypted;
      }
      await Clipboard.setStringAsync(passwordToCopy || '');
      toast.success('Password copied to clipboard');

      // Animate button press
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error('Failed to copy password:', error);
      toast.error(ERROR_MESSAGES.PASSWORD_COPY_FAILED);
    }
  }, [decryptedPassword, password.encryptedPassword, encryptionKey, userId, scaleAnim]);

  const getStrengthColor = useCallback((strength) => {
    if (strength <= 1) return theme.passwordStrength.veryWeak;
    if (strength <= 2) return theme.passwordStrength.weak;
    if (strength <= 3) return theme.passwordStrength.fair;
    if (strength <= 4) return theme.passwordStrength.good;
    return theme.passwordStrength.strong;
  }, []);

  const getCategoryColor = useCallback((category) => {
    return theme.categoryColors[category] || theme.categoryColors.Other;
  }, []);

  const strength = password.strength || 0;
  const strengthColor = getStrengthColor(strength);
  const categoryColor = getCategoryColor(password.category);

  return (
    <TouchableOpacity 
      onPress={onPress} 
      activeOpacity={theme.opacity.pressed}
      style={styles.container}
    >
      <GlassCard radius="xl" style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.purple}15` }]}>
            <MaterialCommunityIcons name="key-variant" size={24} color={theme.colors.purple} />
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {password.displayName}
            </Text>
            {password.username && (
              <Text style={styles.username} numberOfLines={1}>
                {password.username}
              </Text>
            )}
            {password.website && (
              <Text style={styles.website} numberOfLines={1}>
                {password.website}
              </Text>
            )}
          </View>
        </View>

        {/* Revealed Password */}
        {revealed && decryptedPassword && (
          <View style={styles.passwordContainer}>
            <Text style={styles.passwordText} selectable>
              {decryptedPassword}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.leftActions}>
            {password.category && (
              <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}15` }]}>
                <Text style={[styles.categoryText, { color: categoryColor }]}>
                  {password.category}
                </Text>
              </View>
            )}
            <View style={styles.strengthContainer}>
              <View style={styles.strengthIndicator}>
                <View 
                  style={[
                    styles.strengthBar, 
                    { 
                      width: `${(strength / 5) * 100}%`, 
                      backgroundColor: strengthColor 
                    }
                  ]} 
                />
              </View>
            </View>
          </View>
          
          <View style={styles.rightActions}>
            <TouchableOpacity 
              onPress={handleReveal} 
              style={styles.actionButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons
                name={revealed ? 'eye-off' : 'eye'}
                size={20}
                color={theme.colors.gray600}
              />
            </TouchableOpacity>
            
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity 
                onPress={handleCopy} 
                style={styles.actionButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons 
                  name="content-copy" 
                  size={20} 
                  color={theme.colors.gray600} 
                />
              </TouchableOpacity>
            </Animated.View>
            
            {onEdit && (
              <TouchableOpacity 
                onPress={() => onEdit(password)} 
                style={styles.actionButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons 
                  name="pencil" 
                  size={20} 
                  color={theme.colors.gray600} 
                />
              </TouchableOpacity>
            )}
            
            {onDelete && (
              <TouchableOpacity 
                onPress={() => onDelete(password)} 
                style={styles.actionButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons 
                  name="delete" 
                  size={20} 
                  color={theme.colors.error} 
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
});

PasswordCard.displayName = 'PasswordCard';

export default PasswordCard;