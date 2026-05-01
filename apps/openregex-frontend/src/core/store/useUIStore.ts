import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  isCheatSheetOpen: boolean;
  isCompatibilityReportOpen: boolean;
  isPersonalOpen: boolean;
  isHistoryOpen: boolean;
  isMinimapOpen: boolean;
  toggleCheatSheet: () => void;
  setCompatibilityReportOpen: (isOpen: boolean) => void;
  togglePersonal: () => void;
  setPersonalOpen: (isOpen: boolean) => void;
  setHistoryOpen: (isOpen: boolean) => void;
  setIsMinimapOpen: (isOpen: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isCheatSheetOpen: false,
      isCompatibilityReportOpen: false,
      isPersonalOpen: false,
      isHistoryOpen: false,
      isMinimapOpen: true,
      toggleCheatSheet: () => set((state) => ({ isCheatSheetOpen: !state.isCheatSheetOpen })),
      setCompatibilityReportOpen: (isOpen) => set({ isCompatibilityReportOpen: isOpen }),
      togglePersonal: () => set((state) => ({ isPersonalOpen: !state.isPersonalOpen })),
      setPersonalOpen: (isOpen) => set({ isPersonalOpen: isOpen }),
      setHistoryOpen: (isOpen) => set({ isHistoryOpen: isOpen }),
      setIsMinimapOpen: (isOpen) => set({ isMinimapOpen: isOpen }),
    }),
    {
      name: 'openregex-ui-store',
      partialize: (state) => ({ isMinimapOpen: state.isMinimapOpen }),
    }
  )
);