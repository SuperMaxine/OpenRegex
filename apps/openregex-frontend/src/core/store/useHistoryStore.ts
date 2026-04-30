import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface HistoryItem {
  id: string;
  name?: string;
  engineId: string;
  engineLabel: string;
  regex: string;
  text: string;
  flags: string[];
  matchCount: number;
  timestamp: number;
}

interface HistoryState {
  items: HistoryItem[];
  addItem: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  removeItem: (id: string) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set((state) => ({
        items: [{ ...item, id: crypto.randomUUID(), timestamp: Date.now() }, ...state.items]
      })),
      removeItem: (id) => set((state) => ({
        items: state.items.filter((i) => i.id !== id)
      })),
      clearHistory: () => set({ items: [] }),
    }),
    {
      name: 'openregex-history-store'
    }
  )
);