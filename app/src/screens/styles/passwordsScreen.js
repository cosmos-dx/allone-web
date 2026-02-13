import { StyleSheet } from 'react-native';
import theme from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.xl,
    paddingTop: theme.spacing['4xl'],
  },
  title: {
    fontSize: theme.typography.fontSize['4xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  addButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchCard: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.base,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  },
  categoryContainer: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.base,
  },
  categoryContent: {
    gap: theme.spacing.sm,
  },
  categoryButton: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: `${theme.colors.gray500}15`,
  },
  categoryButtonActive: {
    backgroundColor: theme.colors.purple,
  },
  categoryButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.gray600,
    fontWeight: theme.typography.fontWeight.medium,
  },
  categoryButtonTextActive: {
    color: theme.colors.textInverse,
  },
  formContainer: {
    padding: theme.spacing.xl,
  },
  formTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xl,
  },
  passwordField: {
    position: 'relative',
  },
  passwordActions: {
    position: 'absolute',
    right: theme.spacing.md,
    top: 38,
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  passwordActionButton: {
    padding: theme.spacing.sm,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.gray200,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: theme.borderRadius.sm,
  },
  strengthText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    minWidth: 80,
  },
  formField: {
    marginBottom: theme.spacing.base,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  categoryScroll: {
    marginTop: theme.spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: `${theme.colors.gray500}15`,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.purple,
  },
  categoryChipText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.gray600,
    fontWeight: theme.typography.fontWeight.medium,
  },
  categoryChipTextActive: {
    color: theme.colors.textInverse,
  },
  formActions: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing['2xl'],
  },
});
