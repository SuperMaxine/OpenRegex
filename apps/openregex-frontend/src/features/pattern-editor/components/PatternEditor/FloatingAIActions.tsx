import React from 'react';
import { Wand2, Sparkles, X } from 'lucide-react';
import { useLLMStore } from '../../../../core/store/useLLMStore';
import { useRegexStore } from '../../../../core/store/useRegexStore';
import { useRegexOptimization } from '../../hooks/useRegexOptimization';

export const FloatingAIActions: React.FC = () => {
  const isAvailable = useLLMStore(state => state.isAvailable);
  const isOptimizing = useLLMStore(state => state.isOptimizing);
  const setAiSidebarOpen = useLLMStore(state => state.setAiSidebarOpen);
  const abortPipeline = useLLMStore(state => state.abortPipeline);
  const regex = useRegexStore(state => state.regex);
  const { handleOptimize } = useRegexOptimization();

  if (!isAvailable) return null;

  return (
    <div className="absolute bottom-3 right-4 z-20 flex items-center gap-2">
        {regex && (
            <button
                onClick={isOptimizing ? abortPipeline : handleOptimize}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-transform hover:scale-105 active:scale-95 border ${
                    isOptimizing 
                    ? 'bg-rose-500/90 hover:bg-rose-600 text-white border-rose-400/30' 
                    : 'bg-indigo-500/90 hover:bg-indigo-600 text-white border-indigo-400/30'
                }`}
            >
                {isOptimizing ? (
                    <><X size={12} className="shrink-0" /> Abort Optimize</>
                ) : (
                    <><Wand2 size={12} className="shrink-0" /> AI Optimize</>
                )}
            </button>
        )}
        <button
            onClick={() => setAiSidebarOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/90 hover:bg-purple-600 text-white rounded-full shadow-[0_4px_12px_rgba(168,85,247,0.3)] transition-transform hover:scale-105 active:scale-95 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border border-purple-400/30"
        >
            <Sparkles size={12} /> Ask AI (Ctrl+L)
        </button>
    </div>
  );
};