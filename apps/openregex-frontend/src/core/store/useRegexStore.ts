import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EngineInfo, WorkerInfo, MatchItem } from '../types';
import { useSelectionStore } from './useSelectionStore';

interface RegexState {
  workers: WorkerInfo[];
  engines: EngineInfo[];
  loading: boolean;
  selectedEngineId: string;
  activeFlags: string[];
  regex: string;
  text: string;
  matches: MatchItem[];
  optimizedMatches: MatchItem[];
  error: string | null;
  execTime: number | null;
  optimizedExecTime: number | null;

  setWorkers: (workers: WorkerInfo[]) => void;
  setLoading: (loading: boolean) => void;
  setSelectedEngineId: (id: string) => void;
  setRegex: (regex: string) => void;
  setText: (text: string) => void;
  setMatches: (matches: MatchItem[]) => void;
  setOptimizedMatches: (matches: MatchItem[]) => void;
  setError: (error: string | null) => void;
  setExecTime: (time: number | null) => void;
  setOptimizedExecTime: (time: number | null) => void;
  toggleFlag: (flag: string) => void;
  setActiveFlags: (flags: string[]) => void;
  handleClear: () => void;
  handleLoadExample: () => void;
}

export const useRegexStore = create<RegexState>()(
  persist(
    (set, get) => ({
      workers: [],
      engines: [],
      loading: true,
      selectedEngineId: '',
      activeFlags: [],
      regex: '',
      text: '',
      matches: [],
      optimizedMatches: [],
      error: null,
      execTime: null,
      optimizedExecTime: null,

      setWorkers: (workers) => set({ workers, engines: workers.flatMap(w => w.engines) }),
      setLoading: (loading) => set({ loading }),
      setSelectedEngineId: (id) => set({ selectedEngineId: id, activeFlags: [] }),
      setRegex: (regex) => set({ regex }),
      setText: (text) => set({ text }),
      setMatches: (matches) => set({ matches }),
      setOptimizedMatches: (matches) => set({ optimizedMatches: matches }),
      setError: (error) => set({ error }),
      setExecTime: (execTime) => set({ execTime }),
      setOptimizedExecTime: (optimizedExecTime) => set({ optimizedExecTime }),

      toggleFlag: (flag) => set((state) => ({
        activeFlags: state.activeFlags.includes(flag)
          ? state.activeFlags.filter(f => f !== flag)
          : [...state.activeFlags, flag]
      })),

      setActiveFlags: (flags) => set({ activeFlags: flags }),

      handleClear: () => {
        set({ regex: '', text: '', optimizedExecTime: null });
        useSelectionStore.getState().handleClearSelection();
      },

      handleLoadExample: () => {
        const { engines, selectedEngineId } = get();
        const activeEngine = engines.find(e => e.engine_id === selectedEngineId);
        if (activeEngine && activeEngine.engine_examples && activeEngine.engine_examples.length > 0) {
          const randomExample = activeEngine.engine_examples[Math.floor(Math.random() * activeEngine.engine_examples.length)];
          set({
            regex: randomExample.regex.replace(/\r/g, ''),
            text: randomExample.text.replace(/\r/g, '')
          });
        }
      }
    }),
    {
      name: 'openregex-regex-store',
      partialize: (state) => ({ selectedEngineId: state.selectedEngineId }),
    }
  )
);