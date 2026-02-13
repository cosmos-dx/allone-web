import React, { useState, useEffect, memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { GlassCard } from '../ui/GlassCard';
import { generateTOTP, getRemainingTime } from '../../utils/totp';
import { decryptData, retrieveKey } from '../../utils/encryption';
import { decryptData as decryptDataV2, isNewEncryptionFormat, retrieveKeyV2 } from '../../utils/encryptionV2';
import { toast } from '../../utils/toast';
import { ERROR_MESSAGES } from '../../constants';
import theme from '../../theme';

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

const TOTPCard = memo(({ totp, encryptionKey, userId, onDelete }) => {
  const [code, setCode] = useState('------');
  const [timeLeft, setTimeLeft] = useState(30);
  const [secret, setSecret] = useState('');
  const [progressAnim] = useState(new Animated.Value(1));
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    const decryptSecret = async () => {
      if (!totp?.encryptedSecret) {
        setSecret('');
        return;
      }
      const isV2Format = isNewEncryptionFormat(totp.encryptedSecret);
      const tryWithKey = async (key, useV2) => {
        if (!key) return null;
        if (useV2 && !isV2Format) return null;
        if (!useV2 && isV2Format) return null;
        if (useV2) return await decryptDataV2(totp.encryptedSecret, key);
        return await decryptData(totp.encryptedSecret, key);
      };
      const useV2First = isV2Format;
      try {
        let decrypted = null;
        if (encryptionKey) {
          try {
            decrypted = await tryWithKey(encryptionKey, useV2First);
          } catch (e) {
            try {
              decrypted = await tryWithKey(encryptionKey, !useV2First);
            } catch (e2) {}
          }
        }
        if (decrypted == null && userId) {
          const keyV2 = await retrieveKeyV2(userId);
          if (keyV2) {
            try {
              decrypted = await tryWithKey(keyV2, useV2First);
            } catch (e) {
              try {
                decrypted = await tryWithKey(keyV2, !useV2First);
              } catch (e2) {}
            }
          }
        }
        if (decrypted == null && userId) {
          const keyOld = await retrieveKey(userId);
          if (keyOld) {
            try {
              decrypted = await tryWithKey(keyOld, useV2First);
            } catch (e) {
              try {
                decrypted = await tryWithKey(keyOld, !useV2First);
              } catch (e2) {}
            }
          }
        }
        setSecret(decrypted || '');
        if (decrypted == null) {
          toast.error(ERROR_MESSAGES.TOTP_DECRYPT_FAILED);
        }
      } catch (error) {
        console.error('Failed to decrypt TOTP secret:', error);
        setSecret('');
        toast.error(ERROR_MESSAGES.TOTP_DECRYPT_FAILED);
      }
    };

    decryptSecret();
  }, [totp.encryptedSecret, encryptionKey, userId]);

  useEffect(() => {
    if (!secret) return;

    const updateCode = async () => {
      try {
        const algorithm = totp.algorithm || 'SHA1';
        const period = totp.period || 30;
        const digits = totp.digits || 6;
        const newCode = await generateTOTP(secret, period, digits, algorithm);
        setCode(newCode);
        const remaining = getRemainingTime(period);
        setTimeLeft(remaining);
        
        // Animate progress bar
        Animated.timing(progressAnim, {
          toValue: remaining / period,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      } catch (error) {
        console.error('TOTP generation error:', error);
        setCode('ERROR');
        const isInvalidSecret = error?.message?.toLowerCase().includes('invalid totp secret') || error?.message?.toLowerCase().includes('invalid base32');
        toast.error(isInvalidSecret ? ERROR_MESSAGES.TOTP_INVALID_SECRET : `TOTP Error: ${error.message}`);
      }
    };

    updateCode();
    const interval = setInterval(updateCode, 1000);
    return () => clearInterval(interval);
  }, [secret, totp.period, totp.digits, totp.algorithm, progressAnim]);

  const handleCopyCode = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(code);
      toast.success('Code copied to clipboard');
      
      // Animate button press
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
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
      console.error('Failed to copy code:', error);
      toast.error('Failed to copy code');
    }
  }, [code, scaleAnim]);

  const period = totp.period || 30;
  const isExpiringSoon = timeLeft <= 5;

  return (
    <GlassCard radius="xl" style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.orange}15` }]}>
          <MaterialCommunityIcons 
            name="shield-key" 
            size={24} 
            color={theme.colors.orange} 
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.serviceName} numberOfLines={1}>
            {totp.serviceName}
          </Text>
          {totp.account && (
            <Text style={styles.account} numberOfLines={1}>
              {totp.account}
            </Text>
          )}
        </View>
        {onDelete && (
          <TouchableOpacity 
            onPress={() => onDelete(totp.totpId)} 
            style={styles.deleteButton}
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

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: isExpiringSoon ? theme.colors.error : theme.colors.orange,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>

      {/* Code Display */}
      <TouchableOpacity
        onPress={handleCopyCode}
        activeOpacity={theme.opacity.pressed}
        style={styles.codeContainer}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <LinearGradient
            colors={[`${theme.colors.orange}10`, `${theme.colors.orange}05`]}
            style={styles.codeGradient}
          >
            <Text style={styles.code}>
              {code.match(/.{1,3}/g)?.join(' ') || code}
            </Text>
            <View style={styles.timeLeftContainer}>
              <MaterialCommunityIcons 
                name="timer-sand" 
                size={14} 
                color={isExpiringSoon ? theme.colors.error : theme.colors.textSecondary} 
              />
              <Text style={[
                styles.timeLeft,
                isExpiringSoon && styles.timeLeftExpiring
              ]}>
                {timeLeft}s remaining
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>

      {/* Copy Button */}
      <TouchableOpacity
        onPress={handleCopyCode}
        style={styles.copyButton}
        activeOpacity={theme.opacity.pressed}
      >
        <MaterialCommunityIcons 
          name="content-copy" 
          size={18} 
          color={theme.colors.orange} 
        />
        <Text style={styles.copyButtonText}>Copy Code</Text>
      </TouchableOpacity>
    </GlassCard>
  );
});

TOTPCard.displayName = 'TOTPCard';

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  info: {
    flex: 1,
  },
  serviceName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  account: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  deleteButton: {
    padding: theme.spacing.sm,
    minWidth: theme.touchTarget.min,
    minHeight: theme.touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    marginBottom: theme.spacing.base,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.gray200,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.borderRadius.sm,
  },
  codeContainer: {
    marginBottom: theme.spacing.md,
  },
  codeGradient: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: `${theme.colors.orange}20`,
  },
  code: {
    fontSize: 36,
    fontFamily: 'monospace',
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    letterSpacing: 4,
    marginBottom: theme.spacing.sm,
  },
  timeLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  timeLeft: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  timeLeftExpiring: {
    color: theme.colors.error,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.base,
    backgroundColor: `${theme.colors.orange}10`,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    minHeight: theme.touchTarget.min,
  },
  copyButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.orange,
  },
});

export default TOTPCard;