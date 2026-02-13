import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  // Banner container styles
  bannerScroll: {
    marginHorizontal: -20
  },
  bannerContent: {
    paddingHorizontal: 20,
    paddingBottom: 8
  },

  // Base slide container - defines the exact dimensions for each card
  bannerSlide: {
    paddingRight: 12,
    // width and height are passed as inline props from parent
  },

  // Touchable wrapper - fills the slide completely
  bannerSlideTouchable: {
    width: '100%',
    height: '100%'
  },

  // Card base styles - removed all overrides
  insightCard: {
    // Card component handles its own styling
  },

  // Card banner specific - ensures card fills the touchable area
  insightCardBanner: {
    flex: 1,
    width: '100%',
  },

  // Content wrapper inside card
  insightCardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },

  // Header row with icon, title, and action
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0, // spacing handled by flex container
  },

  // Prevent header from being squashed by flex
  insightRowShrink: {
    flexShrink: 0,
  },

  // Graph area - fixed shrink so it doesn't push header; keeps space-between working
  insightGraphWrap: {
    flexShrink: 0,
  },

  insightIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  insightText: {
    flex: 1
  },

  insightLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937'
  },

  insightValue: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2
  },

  insightLink: {
    flexDirection: 'row',
    alignItems: 'center'
  },

  insightLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9333ea',
    marginRight: 2
  },

  // Graph styles
  barChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 56,
    gap: 6,
  },

  barWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end'
  },

  bar: {
    width: '100%',
    minHeight: 8,
    borderRadius: 6
  },

  horizontalBarChart: {
    gap: 8
  },

  horizontalBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 10
  },

  horizontalBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },

  horizontalBarFill: {
    height: '100%',
    borderRadius: 4
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around'
  },

  miniStat: {
    alignItems: 'center',
    flex: 1
  },

  miniStatBorder: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.08)'
  },

  miniStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937'
  },

  miniStatLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2
  },

  stackBarRow: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },

  stackSegment: {
    minWidth: 4
  },

  lineChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 52,
    gap: 4,
  },

  lineChartBar: {
    flex: 1,
    minHeight: 8,
    borderRadius: 4
  },

  // Pagination dots
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(147, 51, 234, 0.25)'
  },

  dotActive: {
    backgroundColor: '#9333ea',
    width: 10,
    height: 10,
    borderRadius: 5
  },
});
