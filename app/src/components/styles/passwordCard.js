import { StyleSheet } from 'react-native';
import theme from '../../theme';

export const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  card: {
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
  name: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  username: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  website: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.purple,
    fontWeight: theme.typography.fontWeight.medium,
  },
  passwordContainer: {
    backgroundColor: `${theme.colors.purple}08`,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: `${theme.colors.purple}20`,
  },
  passwordText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: 'monospace',
    color: theme.colors.textPrimary,
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftActions: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  categoryText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  strengthContainer: {
    flex: 1,
    maxWidth: 60,
  },
  strengthIndicator: {
    height: 4,
    backgroundColor: theme.colors.gray200,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
    borderRadius: theme.borderRadius.sm,
  },
  rightActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  actionButton: {
    padding: theme.spacing.sm,
    minWidth: theme.touchTarget.min,
    minHeight: theme.touchTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
