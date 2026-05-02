import React from 'react';
import { Map } from 'lucide-react';

interface SubjectEditorHeaderProps {
  isMinimapOpen: boolean;
  setIsMinimapOpen: (val: boolean) => void;
  hasOptimization: boolean;
}

export const SubjectEditorHeader: React.FC<SubjectEditorHeaderProps> = ({ isMinimapOpen, setIsMinimapOpen, hasOptimization }) => {
  return (
    <div className="component-header">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="component-label m-0">Subject String</label>
          {hasOptimization && <span className="text-[9px] font-black uppercase text-theme-muted/50 tracking-wider bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full border border-theme-border shadow-sm">Split View</span>}
        </div>
        <span className="text-[9px] font-mono text-theme-muted/60 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded border border-black/5 dark:border-white/5 ml-2 hidden md:inline-block">
          Ctrl/Cmd + Click to multi-select
        </span>
      </div>
      <button
        onClick={() => setIsMinimapOpen(!isMinimapOpen)}
        className={`p-1.5 rounded-md transition-colors border ${isMinimapOpen ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30' : 'text-theme-muted border-transparent hover:border-ide-border hover:bg-black/5 dark:hover:bg-white/5'}`}
        title="Toggle Document Minimap"
      >
        <Map size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
};