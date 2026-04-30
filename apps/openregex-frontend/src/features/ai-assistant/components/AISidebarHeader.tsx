import React from 'react';
import { Sparkles, X, Trash2 } from 'lucide-react';
import { useRegexStore } from '../../../core/store/useRegexStore';
import { useLLMStore } from '../../../core/store/useLLMStore';

export const AISidebarHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const selectedEngineId = useRegexStore(state => state.selectedEngineId);
  const engines = useRegexStore(state => state.engines);
  const workerVersion = useLLMStore(state => state.workerVersion);
  const clearChatHistory = useLLMStore(state => state.clearChatHistory);
  const activeEngine = engines.find(e => e.engine_id === selectedEngineId);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border shrink-0 bg-black/5 dark:bg-white/5 z-20">
      <div className="flex flex-col">
        <h2 className="text-sm font-bold text-theme-text flex items-center gap-2">
          <Sparkles size={16} className="text-purple-500" /> AI Assistant
        </h2>
        <div className="flex items-center gap-2 mt-1">
          {workerVersion && (
            <span className="text-[9px] font-mono text-theme-muted uppercase tracking-wider border-r border-theme-border pr-2">
              Worker: v{workerVersion}
            </span>
          )}
          <span className="text-[9px] font-mono text-purple-600 dark:text-purple-400 uppercase tracking-wider bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
            Target: {activeEngine?.engine_label || selectedEngineId}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={clearChatHistory} className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 rounded transition-colors" title="Clear Chat">
          <Trash2 size={12} /> Clear
        </button>
        <button onClick={onClose} className="p-1.5 text-theme-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-full transition-colors" title="Close AI Assistant">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};