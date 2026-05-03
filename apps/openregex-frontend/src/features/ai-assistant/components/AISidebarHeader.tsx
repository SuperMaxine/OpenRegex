import React from 'react';
import { Sparkles, X, Trash2 } from 'lucide-react';
import { useRegexStore } from '../../../core/store/useRegexStore';
import { useLLMStore } from '../../../core/store/useLLMStore';

export const AISidebarHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const selectedEngineId = useRegexStore(state => state.selectedEngineId);
  const engines = useRegexStore(state => state.engines);
  const workerVersion = useLLMStore(state => state.workerVersion);
  const workerReleaseDate = useLLMStore(state => state.workerReleaseDate);
  const clearChatHistory = useLLMStore(state => state.clearChatHistory);
  const activeEngine = engines.find(e => e.engine_id === selectedEngineId);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border shrink-0 bg-black/5 dark:bg-white/5 z-20">

      {/* Left: Title */}
      <div className="flex items-center min-w-0 shrink-0">
        <h2 className="text-sm font-bold text-theme-text flex items-center gap-2">
          <Sparkles size={16} className="text-purple-500 shrink-0" />
          <span className="hidden sm:block">AI Assistant</span>
        </h2>
      </div>

      {/* Center: Target & Version */}
      <div className="flex flex-col items-center justify-center flex-1 px-2 min-w-0">
        <span className="text-[9px] font-mono text-purple-600 dark:text-purple-400 uppercase tracking-wider bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 truncate max-w-full">
          Target: {activeEngine?.engine_label || selectedEngineId}
        </span>
        {workerVersion && (
          <span
            className="text-[9px] mt-1 font-mono text-theme-muted uppercase tracking-wider cursor-help truncate"
            title={workerReleaseDate ? `Release: ${workerReleaseDate}` : 'Release: Unknown'}
          >
            Worker: v{workerVersion}
          </span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-end gap-1.5 min-w-0 shrink-0">
        <button onClick={clearChatHistory} className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 rounded transition-colors" title="Clear Chat">
          <Trash2 size={12} /> <span className="hidden sm:inline">Clear</span>
        </button>
        <button onClick={onClose} className="p-1.5 text-theme-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-full transition-colors shrink-0" title="Close AI Assistant">
          <X size={16} />
        </button>
      </div>

    </div>
  );
};