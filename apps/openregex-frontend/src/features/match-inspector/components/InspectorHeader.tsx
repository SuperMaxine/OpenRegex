import React from 'react';
import { Activity, ChevronsDown, ChevronsUp, Sparkles } from 'lucide-react';

interface InspectorHeaderProps {
  execTime: number | null;
  optimizedExecTime: number | null;
  hasOptimization: boolean;
  displayMatchesCount: number;
  activeTab: 'original' | 'optimized';
  setActiveTab: (tab: 'original' | 'optimized') => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export const InspectorHeader: React.FC<InspectorHeaderProps> = ({
  execTime,
  optimizedExecTime,
  hasOptimization,
  displayMatchesCount,
  activeTab,
  setActiveTab,
  onExpandAll,
  onCollapseAll
}) => {
  return (
    <div className="component-header flex flex-row flex-nowrap items-center justify-between sticky top-0 z-20 border-b border-ide-border py-1 px-2 min-h-[36px] overflow-x-auto custom-scrollbar">
      <div className="flex items-center gap-2 shrink-0">
          <label className="component-label m-0">Inspector</label>

          {(typeof execTime === 'number') && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-[10px] font-mono text-theme-muted font-bold shadow-inner">
                  <Activity size={12} />
                  <span>{execTime.toFixed(2)}ms</span>
                  {hasOptimization && typeof optimizedExecTime === 'number' && (
                      <>
                          <span className="opacity-40">|</span>
                          <span className="text-purple-600 dark:text-purple-400">Opt: {optimizedExecTime.toFixed(2)}ms</span>
                      </>
                  )}
              </div>
          )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
          {displayMatchesCount > 0 && (
              <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 rounded p-0.5 shadow-inner">
                  <button onClick={onExpandAll} className="flex items-center gap-1 p-0.5 text-theme-muted hover:text-theme-text hover:bg-white dark:hover:bg-[#2A2A35] hover:shadow-sm rounded transition-all" title="Expand All Matches">
                      <ChevronsDown size={12} />
                  </button>
                  <button onClick={onCollapseAll} className="flex items-center gap-1 p-0.5 text-theme-muted hover:text-theme-text hover:bg-white dark:hover:bg-[#2A2A35] hover:shadow-sm rounded transition-all" title="Collapse All Matches">
                      <ChevronsUp size={12} />
                  </button>
              </div>
          )}

          {hasOptimization && (
          <div className="flex items-center bg-black/5 dark:bg-white/5 rounded p-0.5 shadow-inner">
              <button
              onClick={() => setActiveTab('original')}
              className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${activeTab === 'original' ? 'bg-white dark:bg-[#2A2A35] shadow-sm text-theme-text' : 'text-theme-muted hover:text-theme-text'}`}
              >
              Original
              </button>
              <button
              onClick={() => setActiveTab('optimized')}
              className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-1 ${activeTab === 'optimized' ? 'bg-white dark:bg-[#2A2A35] shadow-sm text-purple-500' : 'text-theme-muted hover:text-theme-text'}`}
              >
              <Sparkles size={10} /> Optimized
              </button>
          </div>
          )}
      </div>
    </div>
  );
};