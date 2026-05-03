import React, { useState } from 'react';
import { Send, Square } from 'lucide-react';
import { useRegexStore } from '../../../core/store/useRegexStore';
import { useLLMStore, PipelineStep } from '../../../core/store/useLLMStore';

export const AIInputArea: React.FC = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedEngineId = useRegexStore((state) => state.selectedEngineId);
  const text = useRegexStore((state) => state.text);
  const regex = useRegexStore((state) => state.regex);
  const activeFlags = useRegexStore((state) => state.activeFlags);

  const sessions = useLLMStore((state) => state.sessions || []);
  const activeSessionId = useLLMStore((state) => state.activeSessionId);
  const chatHistory = sessions.find(s => s.id === activeSessionId)?.messages || [];

  const isOptimizing = useLLMStore((state) => state.isOptimizing);
  const abortPipeline = useLLMStore((state) => state.abortPipeline);

  const handleGenerate = async () => {
    const trimmedInput = input.trim();

    if (!trimmedInput) return;

    const userMsg = {
      role: 'user' as const,
      content: trimmedInput,
    };

    useLLMStore.getState().addChatMessage(userMsg);
    setInput('');
    setLoading(true);

    useLLMStore.getState().initPipeline();
    useLLMStore.getState().setPipelineStatus('Initializing request...');

    const ctrl = new AbortController();
    useLLMStore.getState().setAbortController(ctrl);

    try {
      const res = await fetch('/api/llm/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          engine_id: selectedEngineId,
          text,
          description: JSON.stringify([...chatHistory, userMsg]),
          flags: activeFlags,
          current_regex: regex || null,
          regex_context_mode: 'auto',
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        useLLMStore.getState().addChatMessage({
          role: 'assistant',
          content: `Network Error: ${res.statusText}`,
        });
        return;
      }

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

            if (data.type === 'status') {
              useLLMStore.getState().setPipelineStatus(data.message);

              if (data.step && data.attempt) {
                useLLMStore.getState().updatePipelineStep(
                  data.attempt,
                  data.step as PipelineStep,
                  data.details,
                  data.regex,
                  data.flags,
                  data.explanation,
                  data.raw,
                  data.intent
                );
              }
            }

            if (data.type === 'result') {
              if (data.success) {
                if (data.attempt) {
                  useLLMStore.getState().updatePipelineStep(
                    data.attempt,
                    'success',
                    undefined,
                    data.generated_regex || data.optimized_regex,
                    data.flags,
                    data.explanation,
                    undefined,
                    data.intent
                  );
                }

                useLLMStore.getState().addChatMessage({
                  role: 'assistant',
                  content: data.explanation,
                  regex: data.generated_regex || data.optimized_regex,
                  flags: data.flags,
                  intent: data.intent,
                  pipelineAttempts: useLLMStore.getState().pipelineAttempts,
                });
              } else {
                if (data.attempt) {
                  useLLMStore.getState().updatePipelineStep(
                    data.attempt,
                    'error',
                    data.details || data.error,
                    data.generated_regex || data.optimized_regex,
                    data.flags,
                    undefined,
                    undefined,
                    data.intent
                  );
                }

                useLLMStore.getState().addChatMessage({
                  role: 'assistant',
                  content: `Error: ${data.error}${
                    data.details ? `\n\nDetails: ${data.details}` : ''
                  }`,
                  regex: data.generated_regex || data.optimized_regex,
                  flags: data.flags,
                  intent: data.intent,
                  pipelineAttempts: useLLMStore.getState().pipelineAttempts,
                });
              }
            }

            if (data.type === 'error') {
              useLLMStore.getState().addChatMessage({
                role: 'assistant',
                content: `Pipeline Error: ${data.message || data.error}`,
              });
            }
          } catch (e) {
            console.error('Failed to parse SSE JSON:', e);
          }
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        useLLMStore.getState().addChatMessage({
          role: 'assistant',
          content: 'Generation cancelled by user.',
        });
      } else {
        useLLMStore.getState().addChatMessage({
          role: 'assistant',
          content: `Network Error: ${e.message}`,
        });
      }
    } finally {
      setLoading(false);
      useLLMStore.getState().setPipelineStatus(null);
      useLLMStore.getState().setAbortController(null);
    }
  };

  const isExecutionActive = loading || isOptimizing;

  return (
    <div className="shrink-0 flex gap-2 p-4 pt-2 border-t border-theme-border bg-theme-base/90 dark:bg-[#121216]/90">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleGenerate();
          }
        }}
        placeholder="Ask for changes..."
        disabled={isExecutionActive}
        className="flex-1 p-3 text-xs bg-black/5 dark:bg-white/5 border border-theme-border rounded-xl outline-none focus:ring-1 focus:ring-purple-500 text-theme-text resize-none h-12 disabled:opacity-50"
      />

      <button
        onClick={isExecutionActive ? abortPipeline : handleGenerate}
        disabled={!isExecutionActive && !input.trim()}
        title={isExecutionActive ? 'Abort Generation' : 'Send Request'}
        className={`px-4 h-12 flex items-center justify-center text-white rounded-xl disabled:opacity-50 transition-all shadow-sm ${
          isExecutionActive
            ? 'bg-rose-500 hover:bg-rose-600 animate-pulse'
            : 'bg-purple-500 hover:bg-purple-600'
        }`}
      >
        {isExecutionActive ? (
          <Square size={14} fill="currentColor" />
        ) : (
          <Send size={16} />
        )}
      </button>
    </div>
  );
};