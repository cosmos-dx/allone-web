import React, { useCallback, useMemo, forwardRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import BottomSheetComponent, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import theme from '../../theme';

/**
 * BottomSheet - Modern bottom sheet component
 * @param {ReactNode} children - Sheet content
 * @param {array} snapPoints - Snap points for the sheet (e.g., ['25%', '50%', '90%'])
 * @param {string} title - Sheet title
 * @param {boolean} enablePanDownToClose - Allow closing by panning down
 * @param {function} onChange - Callback when sheet position changes
 */
export const BottomSheet = forwardRef(({
  children,
  snapPoints = ['50%', '90%'],
  title,
  enablePanDownToClose = true,
  onChange,
  ...props
}, ref) => {
  // Memoize snap points
  const memoizedSnapPoints = useMemo(() => snapPoints, [snapPoints]);

  // Render backdrop
  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  return (
    <BottomSheetComponent
      ref={ref}
      index={-1}
      snapPoints={memoizedSnapPoints}
      enablePanDownToClose={enablePanDownToClose}
      backdropComponent={renderBackdrop}
      onChange={onChange}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.indicator}
      {...props}
    >
      <View style={styles.container}>
        {title && (
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
          </View>
        )}
        <View style={styles.content}>
          {children}
        </View>
      </View>
    </BottomSheetComponent>
  );
});

BottomSheet.displayName = 'BottomSheet';

const styles = StyleSheet.create({
  background: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
  },
  indicator: {
    backgroundColor: theme.colors.gray300,
    width: 40,
    height: 4,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: theme.spacing.base,
  },
});

export default BottomSheet;
