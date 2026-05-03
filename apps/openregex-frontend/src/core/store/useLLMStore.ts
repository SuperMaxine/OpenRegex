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

export interface ChatSession {
  id: string;
  createdAt: number;
  preview: string;
  messages: ChatMessage[];
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
  sessions: ChatSession[];
  activeSessionId: string | null;
  isAiSidebarOpen: boolean;
  isAiHistoryOpen: boolean;
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
  generateChatTitle: (sessionId: string, firstMessage: string) => Promise<void>;
  createNewSession: () => void;
  loadSession: (id: string) => void;
  deleteSession: (id: string) => void;
  setAiSidebarOpen: (isOpen: boolean) => void;
  setAiHistoryOpen: (isOpen: boolean) => void;
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
      sessions: [],
      activeSessionId: null,
      isAiSidebarOpen: false,
      isAiHistoryOpen: false,
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

      generateChatTitle: async (sessionId, firstMessage) => {
        try {
          const res = await fetch('/api/llm/generate-title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: firstMessage }),
          });

          if (!res.ok) return;

          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          if (!reader) return;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'result' && data.success && data.title) {
                  set((state) => {
                    const newSessions = [...(state.sessions || [])];
                    const targetIndex = newSessions.findIndex((s) => s.id === sessionId);
                    if (targetIndex !== -1) {
                      const s = newSessions[targetIndex];
                      newSessions[targetIndex] = { ...s, preview: data.title };
                    }
                    return { sessions: newSessions };
                  });
                  return;
                }
              } catch (e) {
                // ignore parse error
              }
            }
          }
        } catch (e) {
          // Silently fail for title generation
        }
      },

      addChatMessage: (msg) =>
        set((state) => {
          let activeId = state.activeSessionId;
          const newSessions = [...(state.sessions || [])];

          if (!activeId || !newSessions.some(s => s.id === activeId)) {
            activeId = crypto.randomUUID();
            newSessions.push({
              id: activeId,
              createdAt: Date.now(),
              preview: 'New Chat',
              messages: []
            });
          }

          const targetIndex = newSessions.findIndex(s => s.id === activeId);
          if (targetIndex !== -1) {
            const s = newSessions[targetIndex];

            if (s.messages.length === 0 && msg.role === 'user') {
              setTimeout(() => get().generateChatTitle(activeId!, msg.content), 0);
            }

            newSessions[targetIndex] = { ...s, messages: [...s.messages, msg] };
          }

          return { sessions: newSessions, activeSessionId: activeId };
        }),

      createNewSession: () =>
        set((state) => {
          const existingEmpty = (state.sessions || []).find(s => s.messages.length === 0);
          if (existingEmpty) {
            return {
              activeSessionId: existingEmpty.id,
              isAiHistoryOpen: false
            };
          }

          const newId = crypto.randomUUID();
          const newSession = {
            id: newId,
            createdAt: Date.now(),
            preview: 'New Chat',
            messages: []
          };
          return {
            sessions: [newSession, ...(state.sessions || [])],
            activeSessionId: newId,
            isAiHistoryOpen: false
          };
        }),

      loadSession: (id) => set({ activeSessionId: id, isAiHistoryOpen: false }),

      deleteSession: (id) =>
        set((state) => {
          const newSessions = (state.sessions || []).filter((s) => s.id !== id);
          let newActiveId = state.activeSessionId;
          if (newActiveId === id) {
            newActiveId = newSessions.length > 0 ? newSessions[0].id : null;
          }
          return { sessions: newSessions, activeSessionId: newActiveId };
        }),

      setAiSidebarOpen: (isOpen) => set({ isAiSidebarOpen: isOpen }),

      setAiHistoryOpen: (isOpen) => set({ isAiHistoryOpen: isOpen }),

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
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    }
  )
);

if (typeof window !== 'undefined') {
  useLLMStore.getState().checkAvailability();
  setInterval(() => useLLMStore.getState().checkAvailability(), 10000);
}