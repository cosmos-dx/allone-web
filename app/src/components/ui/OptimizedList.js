import React, { memo, useCallback } from 'react';
import { FlatList, StyleSheet, View, Text } from 'react-native';
import theme from '../../theme';

/**
 * OptimizedList - Performance-optimized FlatList with best practices
 * @param {array} data - List data
 * @param {function} renderItem - Render function for each item
 * @param {function} keyExtractor - Key extractor function
 * @param {number} itemHeight - Fixed item height for getItemLayout optimization
 * @param {ReactNode} ListEmptyComponent - Component to show when list is empty
 * @param {string} emptyMessage - Message to show when list is empty
 * @param {object} contentContainerStyle - Style for content container
 */
export const OptimizedList = memo(({
  data,
  renderItem,
  keyExtractor,
  itemHeight = 100,
  ListEmptyComponent,
  emptyMessage = 'No items found',
  contentContainerStyle,
  onRefresh,
  refreshing = false,
  ...props
}) => {
  // Optimize item layout for better performance
  const getItemLayout = useCallback(
    (data, index) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    }),
    [itemHeight]
  );

  // Default empty component
  const defaultEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    ),
    [emptyMessage]
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      windowSize={10}
      initialNumToRender={10}
      ListEmptyComponent={ListEmptyComponent || defaultEmptyComponent}
      contentContainerStyle={[
        styles.contentContainer,
        data?.length === 0 && styles.emptyContentContainer,
        contentContainerStyle,
      ]}
      onRefresh={onRefresh}
      refreshing={refreshing}
      {...props}
    />
  );
});

OptimizedList.displayName = 'OptimizedList';

const styles = StyleSheet.create({
  contentContainer: {
    padding: theme.spacing.base,
  },
  emptyContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing['4xl'],
  },
  emptyText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});

export default OptimizedList;
