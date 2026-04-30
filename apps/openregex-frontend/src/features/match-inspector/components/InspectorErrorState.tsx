import React from 'react';
import { Sparkles } from 'lucide-react';
import { useAIFix } from '../hooks/useAIFix';

interface InspectorErrorStateProps {
  error: string;
}

export const InspectorErrorState: React.FC<InspectorErrorStateProps> = ({ error }) => {
  const { handleAIFix, isAiBusy, isAiAvailable } = useAIFix();

  return (
    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-3 rounded-lg font-mono text-sm mb-3 flex flex-col gap-3">
      <div>
          <span className="font-black uppercase text-[10px] block mb-1 opacity-50">Error</span>
          {error}
      </div>
      {isAiAvailable && (
          <button
              onClick={handleAIFix}
              disabled={isAiBusy}
              className="self-start flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/90 hover:bg-purple-600 text-white rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border border-purple-500/50"
          >
              <Sparkles size={12} className={isAiBusy ? "animate-pulse" : ""} />
              {isAiBusy ? "Fixing..." : "AI Fix"}
          </button>
      )}
    </div>
  );
};