import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  overlayBackdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    minHeight: 300,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  sheetHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetHeaderButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  sheetHeaderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9333ea',
  },
  list: {
    paddingVertical: 8,
    paddingBottom: 32,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  listItemUnread: {
    backgroundColor: 'rgba(147, 51, 234, 0.04)',
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  listItemMessage: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  listItemTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  emptyWrap: {
    paddingVertical: 48,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
});
