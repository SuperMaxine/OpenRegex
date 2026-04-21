import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GitCompare, Check } from 'lucide-react';
import { useRegexStore } from '../../../core/store/useRegexStore';
import { useLLMStore, ChatMessage } from '../../../core/store/useLLMStore';
import { mapPythonIndicesToJs } from '../../../shared/utils/subject.utils';
import { AIPipelineTracker } from './AIPipelineTracker';

export const AIChatMessageBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  const selectedEngineId = useRegexStore(state => state.selectedEngineId);
  const text = useRegexStore(state => state.text);
  const regex = useRegexStore(state => state.regex);
  const setRegex = useRegexStore(state => state.setRegex);
  const setActiveFlags = useRegexStore(state => state.setActiveFlags);
  const setOptimizedMatches = useRegexStore(state => state.setOptimizedMatches);
  const setOptimizedExecTime = useRegexStore(state => state.setOptimizedExecTime);

  const setOptimizationProposal = useLLMStore(state => state.setOptimizationProposal);
  const setOptimizationViewMode = useLLMStore(state => state.setOptimizationViewMode);

  const isError = msg.content.startsWith('Error:');

  const handleApplyToDiff = async (generatedRegex: string, generatedFlags: string[]) => {
    setOptimizationProposal({
      originalRegex: regex,
      optimizedRegex: generatedRegex,
      explanation: 'AI Assistant Generation. Review and apply changes.',
      flags: generatedFlags
    });
    setOptimizationViewMode('optimized');

    try {
      const res = await fetch('/api/match', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ engine_id: selectedEngineId, regex: generatedRegex, text, flags: generatedFlags })
      });
      const mData = await res.json();
      if (mData.success) {
         setOptimizedMatches(mapPythonIndicesToJs(text, mData.matches));
         setOptimizedExecTime(mData.execution_time_ms);
      }
    } catch (e) {
      console.error("Failed to fetch matches for applied regex", e);
    }
  };

  return (
    <div className={`flex flex-col max-w-[95%] rounded-xl p-3 shadow-sm ${msg.role === 'user' ? 'self-end bg-theme-primary/10 border border-theme-primary/20 text-theme-text' : 'self-start bg-black/5 dark:bg-white/5 border border-theme-border text-theme-text'}`}>
      <span className="text-[9px] font-black tracking-widest uppercase opacity-40 mb-1">{msg.role}</span>

      {/* If this message has pipeline history, render it natively inside the bubble */}
      {msg.pipelineAttempts && msg.pipelineAttempts.length > 0 && (
          <div className="mb-3">
              <AIPipelineTracker attempts={msg.pipelineAttempts} inline={true} />
          </div>
      )}

      <div className={`text-xs leading-relaxed overflow-hidden ${isError ? 'text-rose-500' : ''}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({node, ...props}: any) => <p className="mb-2 last:mb-0" {...props} />,
            code(props: any) {
              const {children, className, ...rest} = props;
              return !className ? (
                  <code className="bg-black/10 dark:bg-white/10 rounded px-1 py-0.5 font-mono text-[10px]" {...rest}>{children}</code>
              ) : (
                  <pre className="bg-black/10 dark:bg-white/10 p-2 rounded overflow-x-auto my-2 font-mono text-[10px]"><code className={className} {...rest}>{children}</code></pre>
              )
            },
            ul: ({node, ...props}: any) => <ul className="list-disc ml-4 mb-2 flex flex-col gap-1" {...props} />,
            ol: ({node, ...props}: any) => <ol className="list-decimal ml-4 mb-2 flex flex-col gap-1" {...props} />,
            strong: ({node, ...props}: any) => <strong className="font-bold text-theme-primary" {...props} />,
            a: ({node, ...props}: any) => <a className="text-blue-500 hover:underline" {...props} />
          }}
        >
          {msg.content}
        </ReactMarkdown>
      </div>

      {msg.regex && (
        <div className="mt-3 flex flex-col gap-2">
          <div className={`flex flex-col gap-1.5 p-2 rounded-lg ring-1 ${isError ? 'bg-rose-500/10 ring-rose-500/20' : 'bg-black/20 dark:bg-black/40 ring-white/10'}`}>
            <div className={`text-[10px] font-mono break-all ${isError ? 'text-rose-600 dark:text-rose-300' : 'text-purple-600 dark:text-purple-300'}`}>
              {msg.regex}
            </div>
            {msg.flags && msg.flags.length > 0 && (
              <div className={`flex gap-1.5 mt-1 border-t pt-1.5 ${isError ? 'border-rose-500/20' : 'border-black/10 dark:border-white/10'}`}>
                {msg.flags.map(f => (
                  <span key={f} className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm border ${isError ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20 dark:border-rose-500/30' : 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-500/20 dark:border-purple-500/30'}`}>
                    /{f}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              onClick={() => handleApplyToDiff(msg.regex!, msg.flags || [])}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 rounded transition-colors"
            >
              <GitCompare size={12} /> Test & Compare
            </button>
            <button
              onClick={() => {
                setRegex(msg.regex!);
                setActiveFlags(msg.flags || []);
                setOptimizationProposal(null);
                setOptimizationViewMode('original');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded transition-colors"
            >
              <Check size={12} /> Accept
            </button>
          </div>
        </div>
      )}
    </div>
  );
};