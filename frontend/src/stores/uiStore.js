import { create } from 'zustand';

const useUIStore = create((set) => ({
  // Dialog states
  isAddPasswordDialogOpen: false,
  isAddTOTPDialogOpen: false,
  isAddSpaceDialogOpen: false,
  isManageSpaceDialogOpen: false,
  isSettingsDialogOpen: false,

  // Revealed passwords (for security)
  revealedPasswords: new Set(),

  // Actions
  setAddPasswordDialogOpen: (open) => set({ isAddPasswordDialogOpen: open }),
  setAddTOTPDialogOpen: (open) => set({ isAddTOTPDialogOpen: open }),
  setAddSpaceDialogOpen: (open) => set({ isAddSpaceDialogOpen: open }),
  setManageSpaceDialogOpen: (open) => set({ isManageSpaceDialogOpen: open }),
  setSettingsDialogOpen: (open) => set({ isSettingsDialogOpen: open }),

  toggleRevealPassword: (passwordId) => {
    set((state) => {
      const newSet = new Set(state.revealedPasswords);
      if (newSet.has(passwordId)) {
        newSet.delete(passwordId);
      } else {
        newSet.add(passwordId);
      }
      return { revealedPasswords: newSet };
    });
  },

  clearRevealedPasswords: () => set({ revealedPasswords: new Set() }),
}));

export default useUIStore;

