import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import theme from '../../theme';

export function Input({ 
  label, 
  placeholder,
  value,
  onChangeText,
  error, 
  style, 
  containerStyle,
  leftIcon,
  rightIcon,
  secureTextEntry = false,
  ...props 
}) {
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrapper}>
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            <MaterialCommunityIcons name={leftIcon} size={20} color={theme.colors.gray400} />
          </View>
        )}
        <TextInput
          style={[
            styles.input,
            error && styles.inputError,
            leftIcon && styles.inputWithLeftIcon,
            (rightIcon || secureTextEntry) && styles.inputWithRightIcon,
            style,
          ]}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={theme.colors.gray400}
          secureTextEntry={isSecure}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.rightIconContainer}
            onPress={() => setIsSecure(!isSecure)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name={isSecure ? 'eye-off' : 'eye'}
              size={20}
              color={theme.colors.gray400}
            />
          </TouchableOpacity>
        )}
        {rightIcon && !secureTextEntry && (
          <View style={styles.rightIconContainer}>
            <MaterialCommunityIcons name={rightIcon} size={20} color={theme.colors.gray400} />
          </View>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.base,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    minHeight: theme.touchTarget.min,
  },
  inputWithLeftIcon: {
    paddingLeft: theme.spacing['4xl'],
  },
  inputWithRightIcon: {
    paddingRight: theme.spacing['4xl'],
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  leftIconContainer: {
    position: 'absolute',
    left: theme.spacing.base,
    zIndex: 1,
  },
  rightIconContainer: {
    position: 'absolute',
    right: theme.spacing.base,
    zIndex: 1,
  },
  errorText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
});
