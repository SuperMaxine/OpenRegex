import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Activity, Share2, Check, Lightbulb, Trash2, BookmarkPlus, Save, ChevronDown, Clock, Undo2, Redo2, Bookmark } from 'lucide-react';
import { useRegexStore } from '../../../../core/store/useRegexStore';
import { useSelectionStore } from '../../../../core/store/useSelectionStore';
import { useOptimizedSelectionStore } from '../../../../core/store/useOptimizedSelectionStore';
import { useUIStore } from '../../../../core/store/useUIStore';
import { useLLMStore } from '../../../../core/store/useLLMStore';
import { useStorageStore } from '../../../../core/store/useStorageStore';
import { getShareUrl } from '../../../../shared/utils/link';

type FlagGroup = 'Basic' | 'Advance' | 'Unique';

interface FlagInfo {
  description: string;
  group: FlagGroup;
}

const FLAG_INFO: Record<string, FlagInfo> = {
  'i': { description: 'Ignore case. Most common user-facing flag.', group: 'Basic' },
  'm': { description: 'Multiline anchors. Makes ^ and $ work per line.', group: 'Basic' },
  's': { description: 'DotAll. Makes . match newline.', group: 'Basic' },
  'x': { description: 'Extended/free-spacing pattern mode. Allows readable multi-line regex with comments.', group: 'Basic' },
  'u': { description: 'Unicode or UTF-8 mode. Exact behavior depends on engine.', group: 'Basic' },
  'g': { description: 'Global matching. JavaScript-specific, but your highlighter should always collect all matches anyway.', group: 'Basic' },
  'd': { description: 'JavaScript: return match indices. Java: Unix-lines mode. Conflicting meaning, so avoid as global UI flag.', group: 'Advance' },
  'U': { description: 'Usually ungreedy mode in Go/RE2/Rust/PCRE/PHP; in Java it means Unicode character classes. Conflicting meaning.', group: 'Advance' },
  'a': { description: 'ASCII-only matching for character classes like \\w, \\d, \\b. Mainly Python.', group: 'Advance' },
  'A': { description: 'PHP/PCRE: force match to start at subject start. Python: ASCII alias internally.', group: 'Advance' },
  'D': { description: 'PHP/PCRE: $ matches only at real end, not before final newline.', group: 'Advance' },
  'S': { description: 'PHP/PCRE study flag, mostly compatibility/ignored in modern PCRE2. Python uses uppercase alias for s.', group: 'Unique' },
  'X': { description: 'PHP/PCRE: extra syntax checking. Python uses uppercase alias for x.', group: 'Unique' },
  'J': { description: 'PCRE/PHP: allow duplicate named capture groups.', group: 'Unique' },
  'n': { description: 'No auto-capture / explicit capture. Plain (...) does not capture, depending on engine.', group: 'Advance' },
  'r': { description: '.NET/Python regex: reverse/right-to-left matching. PHP 8.4+: restrict some caseless ASCII/non-ASCII folds.', group: 'Unique' },
  'R': { description: 'Rust: CRLF-aware mode. Python regex: uppercase alias for reverse.', group: 'Unique' },
  'v': { description: 'JavaScript Unicode sets mode. Mutually exclusive with u.', group: 'Advance' },
  'y': { description: 'JavaScript sticky mode at lastIndex. Usually not needed for highlighter UI.', group: 'Advance' },
  'b': { description: 'Python regex: best fuzzy match. Advanced only.', group: 'Unique' },
  'e': { description: 'Python regex: enhanced fuzzy matching. Advanced only.', group: 'Unique' },
  'f': { description: 'Python regex: full Unicode case folding. Advanced only.', group: 'Advance' },
  'p': { description: 'Python regex: POSIX leftmost-longest matching. Advanced only.', group: 'Advance' },
  'w': { description: 'Python regex: Unicode word-boundary behavior. Advanced only.', group: 'Advance' },
  'L': { description: 'Locale-dependent matching. Avoid for general UI.', group: 'Unique' },
  'l': { description: 'Locale-dependent matching. Avoid for general UI.', group: 'Unique' },
  'V0': { description: 'Python regex: choose old regex behavior version. Advanced only.', group: 'Unique' },
  'V1': { description: 'Python regex: choose new regex behavior version. Advanced only.', group: 'Unique' }
};

const getFlagColors = (group: FlagGroup, isActive: boolean) => {
  switch (group) {
    case 'Advance':
      return isActive
        ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-700 dark:text-indigo-300'
        : 'bg-indigo-500/5 border-indigo-500/10 text-indigo-600/70 dark:text-indigo-400/70 hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400';
    case 'Unique':
      return isActive
        ? 'bg-amber-500/20 border-amber-500/30 text-amber-700 dark:text-amber-300'
        : 'bg-amber-500/5 border-amber-500/10 text-amber-600/70 dark:text-amber-400/70 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400';
    case 'Basic':
    default:
      return isActive
        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
        : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-600/70 dark:text-emerald-400/70 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400';
  }
};

export const PatternEditorHeader: React.FC = () => {
  const regex = useRegexStore(state => state.regex);
  const text = useRegexStore(state => state.text);
  const activeFlags = useRegexStore(state => state.activeFlags);
  const toggleFlag = useRegexStore(state => state.toggleFlag);
  const engines = useRegexStore(state => state.engines);
  const selectedEngineId = useRegexStore(state => state.selectedEngineId);
  const setSelectedEngineId = useRegexStore(state => state.setSelectedEngineId);
  const setRegex = useRegexStore(state => state.setRegex);
  const setText = useRegexStore(state => state.setText);
  const setActiveFlags = useRegexStore(state => state.setActiveFlags);
  const handleClear = useRegexStore(state => state.handleClear);
  const handleLoadExample = useRegexStore(state => state.handleLoadExample);
  const matches = useRegexStore(state => state.matches);

  const originalSelection = useSelectionStore();
  const optimizedSelection = useOptimizedSelectionStore();
  const setCompatibilityReportOpen = useUIStore(state => state.setCompatibilityReportOpen);
  const optimizationProposal = useLLMStore(state => state.optimizationProposal);

  const { addPersonal, history, historyIndex, setHistoryIndex, personal } = useStorageStore();

  const [copied, setCopied] = useState(false);
  const [historySaved, setHistorySaved] = useState(false);
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const [isHistoryMenuOpen, setIsHistoryMenuOpen] = useState(false);

  const [isNamingSave, setIsNamingSave] = useState(false);
  const [customSaveName, setCustomSaveName] = useState('');

  const saveMenuRef = useRef<HTMLDivElement>(null);
  const historyMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (saveMenuRef.current && !saveMenuRef.current.contains(e.target as Node)) {
        setIsSaveMenuOpen(false);
        setIsNamingSave(false);
      }
      if (historyMenuRef.current && !historyMenuRef.current.contains(e.target as Node)) {
        setIsHistoryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeEngine = engines.find(e => e.engine_id === selectedEngineId);
  const availableFlags = activeEngine?.engine_capabilities.flags || [];
  const isOptimizationMode = optimizationProposal !== null;

  const handleShareClick = () => {
    const shareUrl = getShareUrl({ engine_id: selectedEngineId, regex, text, flags: activeFlags });
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const executeSave = (name?: string) => {
    addPersonal({
      name,
      engineId: selectedEngineId,
      engineLabel: activeEngine?.engine_label || selectedEngineId,
      regex,
      text,
      flags: activeFlags,
      matchCount: matches.length
    });
    setHistorySaved(true);
    setTimeout(() => setHistorySaved(false), 2000);
    setIsSaveMenuOpen(false);
    setIsNamingSave(false);
    setCustomSaveName('');
  };

  const handleSaveQuick = () => executeSave();

  const canUndo = historyIndex < history.length - 1 && history.length > 0;
  const canRedo = historyIndex > 0;

  const loadHistoryItem = (index: number) => {
    if (index >= 0 && index < history.length) {
      const item = history[index];
      setSelectedEngineId(item.engineId);
      setRegex(item.regex);
      setText(item.text);
      setActiveFlags(item.flags);
      setHistoryIndex(index);
    }
    setIsHistoryMenuOpen(false);
  };

  const handleUndo = () => {
    const nextIndex = historyIndex === -1 ? 1 : historyIndex + 1;
    loadHistoryItem(nextIndex);
  };

  const handleRedo = () => {
    if (historyIndex > 0) loadHistoryItem(historyIndex - 1);
  };

  const groupedFlags = useMemo(() => {
    const basic: string[] = [];
    const advance: string[] = [];
    const unique: string[] = [];

    availableFlags.forEach(f => {
      const group = FLAG_INFO[f]?.group || 'Basic';
      if (group === 'Basic') basic.push(f);
      else if (group === 'Advance') advance.push(f);
      else unique.push(f);
    });

    const sortAlphabetically = (a: string, b: string) => a.localeCompare(b);
    basic.sort(sortAlphabetically);
    advance.sort(sortAlphabetically);
    unique.sort(sortAlphabetically);

    return { basic, advance, unique };
  }, [availableFlags]);

  const renderFlagGroup = (flags: string[]) => {
    return flags.map(flag => {
      const flagInfo = FLAG_INFO[flag] || { description: `Flag (${flag})`, group: 'Basic' as FlagGroup };
      const colorClass = getFlagColors(flagInfo.group, activeFlags.includes(flag));

      return (
        <button
          key={flag}
          onClick={() => toggleFlag(flag)}
          title={flagInfo.description}
          className={`font-mono text-[11px] px-2 py-0.5 rounded-sm border transition-colors ${colorClass}`}
        >
          /{flag}
        </button>
      );
    });
  };

  return (
    <div className="component-header flex-wrap gap-2 w-full relative">
      {/* Left - Label & Main Actions */}
      <div className="flex items-center gap-3 justify-start z-20 shrink-0">
        <div className="flex items-center gap-2">
           <label className="component-label m-0">Pattern</label>
           {isOptimizationMode && <span className="text-[9px] font-black uppercase text-theme-muted/50 tracking-wider bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full border border-theme-border shadow-sm">Split View</span>}
        </div>

        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-0.5 rounded-lg border border-black/5 dark:border-white/5">
          <button onClick={handleUndo} disabled={!canUndo} className="p-1 text-theme-muted hover:text-theme-text hover:bg-black/5 dark:hover:bg-white/10 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors" title="Undo">
            <Undo2 size={12} strokeWidth={2.5} />
          </button>
          <button onClick={handleRedo} disabled={!canRedo} className="p-1 text-theme-muted hover:text-theme-text hover:bg-black/5 dark:hover:bg-white/10 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors" title="Redo">
            <Redo2 size={12} strokeWidth={2.5} />
          </button>
          <div className="relative" ref={historyMenuRef}>
            <button onClick={() => setIsHistoryMenuOpen(!isHistoryMenuOpen)} className="p-1 text-theme-muted hover:text-theme-text hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors" title="Execution History">
              <Clock size={12} strokeWidth={2.5} />
            </button>
            {isHistoryMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-72 max-h-64 bg-theme-base dark:bg-[#121216] backdrop-blur-md rounded-md border border-theme-border shadow-xl z-50 overflow-y-auto custom-scrollbar flex flex-col p-1">
                {history.length === 0 ? (
                  <div className="p-3 text-[10px] text-theme-muted text-center font-mono italic">No history yet. Executions auto-save here.</div>
                ) : (
                  history.map((h, i) => {
                    const isPersonal = personal.some(p => p.regex === h.regex && p.text === h.text && p.engineId === h.engineId && JSON.stringify(p.flags) === JSON.stringify(h.flags));
                    const isCurrent = historyIndex === -1 ? i === 0 : historyIndex === i;
                    return (
                      <div key={h.id} className="relative group/item">
                        <button onClick={() => loadHistoryItem(i)} className={`w-full flex items-center justify-between px-2 py-1.5 text-left text-[10px] font-mono rounded transition-colors ${isCurrent ? 'bg-theme-primary/10 text-theme-primary font-bold' : 'text-theme-text hover:bg-black/5 dark:hover:bg-white/5'}`}>
                          <div className="truncate flex-1 pr-2 flex flex-col">
                            <span className="truncate">{h.regex || '<Empty Regex>'}</span>
                          </div>
                          {isPersonal && <Bookmark size={10} className="text-emerald-500 shrink-0" />}
                        </button>
                        <div className="absolute hidden group-hover/item:block top-0 right-full mr-2 w-64 bg-theme-base border border-theme-border p-2 rounded-md shadow-2xl z-[100] text-[10px] font-mono break-all text-theme-text whitespace-pre-wrap pointer-events-none">
                          {h.regex || '<Empty Regex>'}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 border-l border-ide-border pl-2 shrink-0">
          <div className="relative flex items-stretch border border-transparent hover:border-ide-border rounded-md group" ref={saveMenuRef}>
            <button onClick={handleSaveQuick} className="p-1.5 text-indigo-500 hover:bg-black/5 dark:hover:bg-white/5 rounded-l-md transition-colors" title="Quick Save to Personal">
              {historySaved ? <Check size={14} strokeWidth={2.5} className="text-emerald-500" /> : <Save size={14} strokeWidth={2.5} />}
            </button>
            <button onClick={() => setIsSaveMenuOpen(!isSaveMenuOpen)} className="p-1 text-indigo-500 hover:bg-black/5 dark:hover:bg-white/5 rounded-r-md transition-colors border-l border-transparent group-hover:border-ide-border" title="Save Options">
              <ChevronDown size={12} strokeWidth={2.5} />
            </button>
            {isSaveMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-theme-base dark:bg-[#121216] backdrop-blur-md rounded-md border border-theme-border shadow-xl z-[60] flex flex-col p-1">
                {isNamingSave ? (
                  <div className="p-2 flex flex-col gap-2">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Regex name..."
                      value={customSaveName}
                      onChange={(e) => setCustomSaveName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          executeSave(customSaveName.trim());
                        } else if (e.key === 'Escape') {
                          setIsNamingSave(false);
                          setCustomSaveName('');
                        }
                      }}
                      className="bg-black/5 dark:bg-white/5 border border-theme-border rounded px-2 py-1 text-[10px] text-theme-text outline-none focus:ring-1 focus:ring-indigo-500 w-full"
                    />
                    <div className="flex gap-1">
                      <button onClick={() => executeSave(customSaveName.trim())} className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white text-[9px] font-bold py-1 rounded transition-colors">Save</button>
                      <button onClick={() => { setIsNamingSave(false); setCustomSaveName(''); }} className="flex-1 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-theme-text text-[9px] font-bold py-1 rounded transition-colors">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button onClick={handleSaveQuick} className="text-left px-3 py-1.5 text-[10px] font-bold text-theme-text hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors flex items-center gap-2">
                      <Save size={12} /> Quick Save
                    </button>
                    <button onClick={() => setIsNamingSave(true)} className="text-left px-3 py-1.5 text-[10px] font-bold text-theme-text hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors flex items-center gap-2">
                      <BookmarkPlus size={12} /> Save with Name...
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center - Flags */}
      <div className="flex items-center justify-center w-full order-3 mt-1 md:mt-0 md:w-auto md:order-none md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-0 overflow-x-auto custom-scrollbar pb-0.5 md:pb-0 pointer-events-none">
        {availableFlags.length > 0 && (
          <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 p-1 rounded-lg border border-black/5 dark:border-white/5 shrink-0 pointer-events-auto">
            {groupedFlags.basic.length > 0 && (
              <div className="flex items-center gap-1">
                {renderFlagGroup(groupedFlags.basic)}
              </div>
            )}
            {groupedFlags.advance.length > 0 && (
              <>
                {groupedFlags.basic.length > 0 && <div className="w-px h-3.5 bg-theme-border opacity-50 mx-0.5" />}
                <div className="flex items-center gap-1">
                  {renderFlagGroup(groupedFlags.advance)}
                </div>
              </>
            )}
            {groupedFlags.unique.length > 0 && (
              <>
                {(groupedFlags.basic.length > 0 || groupedFlags.advance.length > 0) && <div className="w-px h-3.5 bg-theme-border opacity-50 mx-0.5" />}
                <div className="flex items-center gap-1">
                  {renderFlagGroup(groupedFlags.unique)}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right - Rest of Actions */}
      <div className="flex items-center gap-2 justify-end ml-auto z-10 overflow-x-auto custom-scrollbar pb-0.5 md:pb-0 shrink-0">
        {(originalSelection.activeGroupIds.length > 0 || originalSelection.activeToken !== null || optimizedSelection.activeGroupIds.length > 0) && (
          <button className="shrink-0 text-xs font-mono bg-cyan-100 dark:bg-[#2A3130] text-cyan-700 dark:text-[#A7B5B3] px-2 py-1 rounded-sm border border-cyan-300 dark:border-[#3D4745] hover:bg-cyan-200 dark:hover:bg-[#343C3A] transition-colors" onClick={() => { originalSelection.handleClearSelection(); optimizedSelection.handleClearSelection(); }}>
             Clear Selections ✕
          </button>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => setCompatibilityReportOpen(true)} className="p-1.5 text-indigo-500 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors border border-transparent hover:border-ide-border" title="Check Cross-Engine Compatibility">
            <Activity size={14} strokeWidth={2.5} />
          </button>

          <div className="w-px h-3.5 bg-ide-border mx-0.5" />

          <button onClick={handleShareClick} className="p-1.5 text-indigo-500 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors border border-transparent hover:border-ide-border" title="Share">
            {copied ? <Check size={14} strokeWidth={2.5} /> : <Share2 size={14} strokeWidth={2.5} />}
          </button>

          {(activeEngine?.engine_examples?.length ?? 0) > 0 && <button onClick={handleLoadExample} className="p-1.5 text-amber-500 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors border border-transparent hover:border-ide-border" title="Load Random Example"><Lightbulb size={14} strokeWidth={2.5} /></button>}
          <button onClick={handleClear} className="p-1.5 text-rose-600 hover:bg-rose-500/10 rounded-md transition-colors border border-transparent hover:border-rose-500/20" title="Clear Inputs"><Trash2 size={14} strokeWidth={2.5} /></button>
        </div>
      </div>
    </div>
  );
};