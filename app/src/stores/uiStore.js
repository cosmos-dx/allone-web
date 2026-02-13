import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NAV_POSITION_KEY = 'nav_position';
const NAV_SHOW_ON_SCROLL_KEY = 'nav_show_on_scroll';

const useUIStore = create((set, get) => ({
  navPosition: 'right',
  /** When true, bottom nav is hidden until user scrolls (or switches tab). When false, nav is always visible. */
  showBottomNavOnScroll: true,
  /** Current visibility when showBottomNavOnScroll is true; driven by scroll and tab change. */
  bottomNavVisible: false,

  init: async () => {
    try {
      const [position, showOnScroll] = await Promise.all([
        AsyncStorage.getItem(NAV_POSITION_KEY),
        AsyncStorage.getItem(NAV_SHOW_ON_SCROLL_KEY),
      ]);
      if (position != null) set({ navPosition: position });
      if (showOnScroll != null) set({ showBottomNavOnScroll: showOnScroll === 'true' });
    } catch (error) {
      console.warn('Failed to load UI preferences:', error);
    }
  },

  setNavPosition: async (position) => {
    try {
      await AsyncStorage.setItem(NAV_POSITION_KEY, position);
      set({ navPosition: position });
    } catch (error) {
      console.error('Failed to save nav position:', error);
    }
  },

  setShowBottomNavOnScroll: async (value) => {
    try {
      await AsyncStorage.setItem(NAV_SHOW_ON_SCROLL_KEY, String(value));
      set({ showBottomNavOnScroll: value });
    } catch (error) {
      console.error('Failed to save nav show-on-scroll:', error);
    }
  },

  setBottomNavVisible: (visible) => {
    set({ bottomNavVisible: visible });
  },
}));

export default useUIStore;
