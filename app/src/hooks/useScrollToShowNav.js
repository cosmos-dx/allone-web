import { useCallback } from 'react';
import useUIStore from '../stores/uiStore';

const SCROLL_SHOW_THRESHOLD = 60;
const SCROLL_HIDE_THRESHOLD = 20;

/**
 * Use with ScrollView/FlatList onScroll to show the bottom nav when user scrolls.
 * When showBottomNavOnScroll is enabled: scroll down past threshold shows nav, scroll to top hides it.
 * @returns {{ onScroll: function, scrollEventThrottle: number }}
 */
export default function useScrollToShowNav() {
  const showBottomNavOnScroll = useUIStore((s) => s.showBottomNavOnScroll);
  const setBottomNavVisible = useUIStore((s) => s.setBottomNavVisible);

  const onScroll = useCallback(
    (e) => {
      if (!showBottomNavOnScroll) return;
      const y = e.nativeEvent?.contentOffset?.y ?? 0;
      if (y > SCROLL_SHOW_THRESHOLD) {
        setBottomNavVisible(true);
      } else if (y < SCROLL_HIDE_THRESHOLD) {
        setBottomNavVisible(false);
      }
    },
    [showBottomNavOnScroll, setBottomNavVisible]
  );

  return {
    onScroll,
    scrollEventThrottle: 16,
  };
}
