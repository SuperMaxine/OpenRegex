import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PipelineStepStatus = 'pending' | 'active' | 'done' | 'ok' | 'error';

export type PipelineStep =
  | 'init'
  | 'thinking'
  | 'generation'
  | 'validation'
  | 'error'
  | 'success';

export interface PipelineAttempt {
  attempt: number;
  thinking: PipelineStepStatus;
  generation: PipelineStepStatus;
  validation: PipelineStepStatus;
  error?: string;
  regex?: string;
  flags?: string[];
  explanation?: string;
  raw?: string;
  intent?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  regex?: string;
  flags?: string[];
  intent?: string;
  pipelineAttempts?: PipelineAttempt[];
}

export interface OptimizationProposal {
  originalRegex: string;
  optimizedRegex: string;
  explanation: string;
  flags?: string[];
}

interface LLMState {
  isAvailable: boolean;
  workerVersion: string | null;
  workerReleaseDate: string | null;
  pipelineStatus: string | null;
  pipelineAttempts: PipelineAttempt[];
  chatHistory: ChatMessage[];
  isAiSidebarOpen: boolean;
  optimizationProposal: OptimizationProposal | null;
  optimizationViewMode: 'original' | 'optimized';
  isOptimizing: boolean;
  abortController: AbortController | null;

  checkAvailability: () => Promise<void>;
  setPipelineStatus: (status: string | null) => void;
  initPipeline: () => void;
  updatePipelineStep: (
    attempt: number,
    step: PipelineStep,
    details?: string,
    regex?: string,
    flags?: string[],
    explanation?: string,
    raw?: string,
    intent?: string
  ) => void;
  addChatMessage: (msg: ChatMessage) => void;
  clearChatHistory: () => void;
  setAiSidebarOpen: (isOpen: boolean) => void;
  toggleAiSidebar: () => void;
  setOptimizationProposal: (proposal: OptimizationProposal | null) => void;
  setOptimizationViewMode: (mode: 'original' | 'optimized') => void;
  setIsOptimizing: (val: boolean) => void;
  setAbortController: (ctrl: AbortController | null) => void;
  abortPipeline: () => void;
}

const createEmptyAttempt = (attempt: number): PipelineAttempt => ({
  attempt,
  thinking: 'pending',
  generation: 'pending',
  validation: 'pending',
});

export const useLLMStore = create<LLMState>()(
  persist(
    (set, get) => ({
      isAvailable: false,
      workerVersion: null,
      workerReleaseDate: null,
      pipelineStatus: null,
      pipelineAttempts: [],
      chatHistory: [],
      isAiSidebarOpen: false,
      optimizationProposal: null,
      optimizationViewMode: 'original',
      isOptimizing: false,
      abortController: null,

      checkAvailability: async () => {
        const handleOffline = () => {
          set((state) => {
            if (state.isAvailable) {
              return {
                isAvailable: false,
                isAiSidebarOpen: false,
                workerVersion: null,
                workerReleaseDate: null,
              };
            }

            return {
              isAvailable: false,
              workerVersion: null,
              workerReleaseDate: null,
            };
          });
        };

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const res = await fetch('/api/llm/status', {
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!res.ok) {
            handleOffline();
            return;
          }

          const data = await res.json();
          const available = !!data.available;

          set((state) => {
            if (!available && state.isAvailable) {
              return {
                isAvailable: false,
                isAiSidebarOpen: false,
                workerVersion: null,
                workerReleaseDate: null,
              };
            }

            return {
              isAvailable: available,
              workerVersion: data.version || null,
              workerReleaseDate: data.release_date || null,
            };
          });
        } catch {
          handleOffline();
        }
      },

      setPipelineStatus: (status) => set({ pipelineStatus: status }),

      initPipeline: () =>
        set({
          pipelineAttempts: [],
          pipelineStatus: null,
        }),

      updatePipelineStep: (
        attempt,
        step,
        details,
        regex,
        flags,
        explanation,
        raw,
        intent
      ) =>
        set((state) => {
          const attempts = [...state.pipelineAttempts];
          let attIndex = attempts.findIndex((a) => a.attempt === attempt);

          if (attIndex === -1) {
            attempts.push(createEmptyAttempt(attempt));
            attIndex = attempts.length - 1;
          }

          const curr: PipelineAttempt = { ...attempts[attIndex] };

          if (step === 'init') {
            curr.thinking = 'pending';
            curr.generation = 'pending';
            curr.validation = 'pending';
          }

          if (step === 'thinking') {
            curr.thinking = 'active';
            curr.generation = 'pending';
            curr.validation = 'pending';
          }

          if (step === 'generation') {
            curr.thinking = 'done';
            curr.generation = 'active';
            curr.validation = 'pending';

            if (intent !== undefined) curr.intent = intent;
          }

          if (step === 'validation') {
            curr.thinking = 'done';
            curr.generation = 'done';
            curr.validation = 'active';

            if (regex !== undefined) curr.regex = regex;
            if (flags !== undefined) curr.flags = flags;
            if (explanation !== undefined) curr.explanation = explanation;
            if (raw !== undefined) curr.raw = raw;
            if (intent !== undefined) curr.intent = intent;
          }

          if (step === 'error') {
            if (curr.thinking === 'active') curr.thinking = 'done';
            if (curr.generation === 'active') curr.generation = 'done';

            curr.validation = 'error';

            if (details !== undefined) curr.error = details;
            if (regex !== undefined) curr.regex = regex;
            if (flags !== undefined) curr.flags = flags;
            if (explanation !== undefined) curr.explanation = explanation;
            if (raw !== undefined) curr.raw = raw;
            if (intent !== undefined) curr.intent = intent;
          }

          if (step === 'success') {
            curr.thinking = 'done';
            curr.generation = 'done';
            curr.validation = 'ok';

            if (regex !== undefined) curr.regex = regex;
            if (flags !== undefined) curr.flags = flags;
            if (explanation !== undefined) curr.explanation = explanation;
            if (raw !== undefined) curr.raw = raw;
            if (intent !== undefined) curr.intent = intent;
          }

          attempts[attIndex] = curr;

          return { pipelineAttempts: attempts };
        }),

      addChatMessage: (msg) =>
        set((state) => ({
          chatHistory: [...state.chatHistory, msg],
        })),

      clearChatHistory: () => set({ chatHistory: [] }),

      setAiSidebarOpen: (isOpen) => set({ isAiSidebarOpen: isOpen }),

      toggleAiSidebar: () =>
        set((state) => ({
          isAiSidebarOpen: !state.isAiSidebarOpen,
        })),

      setOptimizationProposal: (proposal) =>
        set({ optimizationProposal: proposal }),

      setOptimizationViewMode: (mode) =>
        set({ optimizationViewMode: mode }),

      setIsOptimizing: (val) => set({ isOptimizing: val }),

      setAbortController: (ctrl) => set({ abortController: ctrl }),

      abortPipeline: () => {
        const { abortController } = get();

        if (abortController) {
          abortController.abort();

          set({
            abortController: null,
            isOptimizing: false,
            pipelineStatus: 'Execution aborted by user.',
          });
        }
      },
    }),
    {
      name: 'llm-chat-storage',
      partialize: (state) => ({
        chatHistory: state.chatHistory,
      }),
    }
  )
);

if (typeof window !== 'undefined') {
  useLLMStore.getState().checkAvailability();
  setInterval(() => useLLMStore.getState().checkAvailability(), 10000);
}