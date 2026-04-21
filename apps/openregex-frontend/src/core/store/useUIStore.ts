import { create } from 'zustand';

interface UIState {
  isCheatSheetOpen: boolean;
  isCompatibilityReportOpen: boolean;
  isPersonalOpen: boolean;
  isHistoryOpen: boolean;
  toggleCheatSheet: () => void;
  setCompatibilityReportOpen: (isOpen: boolean) => void;
  togglePersonal: () => void;
  setPersonalOpen: (isOpen: boolean) => void;
  setHistoryOpen: (isOpen: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isCheatSheetOpen: false,
  isCompatibilityReportOpen: false,
  isPersonalOpen: false,
  isHistoryOpen: false,
  toggleCheatSheet: () => set((state) => ({ isCheatSheetOpen: !state.isCheatSheetOpen })),
  setCompatibilityReportOpen: (isOpen) => set({ isCompatibilityReportOpen: isOpen }),
  togglePersonal: () => set((state) => ({ isPersonalOpen: !state.isPersonalOpen })),
  setPersonalOpen: (isOpen) => set({ isPersonalOpen: isOpen }),
  setHistoryOpen: (isOpen) => set({ isHistoryOpen: isOpen }),
}));