import React, { useState } from 'react';
import { Bookmark, X, Play, Link, Trash2, Check } from 'lucide-react';
import { useHistoryStore } from '../../../core/store/useHistoryStore';
import { useUIStore } from '../../../core/store/useUIStore';
import { useRegexStore } from '../../../core/store/useRegexStore';
import { getShareUrl } from '../../../shared/utils/link';

export const HistoryPanel: React.FC = () => {
  const { items, removeItem, clearHistory } = useHistoryStore();
  const { isHistoryOpen, setHistoryOpen } = useUIStore();
  const { setSelectedEngineId, setRegex, setText, setActiveFlags } = useRegexStore();

  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isHistoryOpen) return null;

  const handleLoad = (item: any) => {
    setSelectedEngineId(item.engineId);
    setRegex(item.regex);
    setText(item.text);
    setActiveFlags(item.flags);
    setHistoryOpen(false);
  };

  const handleCopyLink = (item: any) => {
    const url = getShareUrl({
      engine_id: item.engineId,
      regex: item.regex,
      text: item.text,
      flags: item.flags
    });
    navigator.clipboard.writeText(url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
      <div className="bg-theme-base dark:bg-[#121216] border border-theme-border shadow-2xl rounded-[20px] w-full max-w-6xl flex flex-col max-h-[85vh] overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border bg-black/5 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-indigo-500/10 text-indigo-500`}>
              <Bookmark size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-theme-text uppercase tracking-widest">Execution History</h2>
              <p className="text-[10px] text-theme-muted font-mono mt-0.5">
                {items.length} saved regex patterns in local history
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {items.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all history?')) clearHistory();
                }}
                className="text-[10px] uppercase font-bold text-rose-500 hover:text-rose-600 transition-colors"
              >
                Clear All
              </button>
            )}
            <button
              onClick={() => setHistoryOpen(false)}
              className="p-2 text-theme-muted hover:text-theme-text hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-theme-muted opacity-60">
              <Bookmark size={48} className="mb-4" />
              <p className="text-sm font-mono">No saved items yet.</p>
              <p className="text-[10px]">Your regex executions will automatically appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-theme-border text-[10px] font-black text-theme-muted uppercase tracking-widest">
                    <th className="px-4 py-3">Engine</th>
                    <th className="px-4 py-3">Pattern</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3 text-center">Matches</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => handleLoad(item)}
                      className="border-b border-theme-border/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                    >
                      <td className="px-4 py-3 text-[10px] font-mono text-indigo-500 whitespace-nowrap">
                        {item.engineLabel}
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative group/tooltip">
                          <div className="text-[11px] font-mono text-theme-text bg-black/5 dark:bg-white/5 px-2 py-1 rounded max-w-[250px] truncate">
                            {item.regex || '<Empty Regex>'}
                          </div>
                          <div className="absolute hidden group-hover/tooltip:block bottom-full left-0 mb-2 w-max max-w-md bg-theme-base border border-theme-border p-3 rounded-md shadow-2xl z-50 text-[11px] font-mono break-all text-theme-text whitespace-pre-wrap pointer-events-none">
                            {item.regex || '<Empty Regex>'}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[10px] font-mono text-theme-muted truncate max-w-[200px]" title={item.text}>
                          {item.text.replace(/\n/g, '\\n')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded">
                          {item.matchCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleLoad(item)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-theme-primary/10 text-theme-primary hover:bg-theme-primary/20 rounded transition-colors"
                            title="Load into Editor"
                          >
                            <Play size={12} /> Load
                          </button>
                          <button
                            onClick={() => handleCopyLink(item)}
                            className="p-1.5 text-theme-muted hover:text-indigo-500 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
                            title="Copy Share Link"
                          >
                            {copiedId === item.id ? <Check size={14} className="text-emerald-500" /> : <Link size={14} />}
                          </button>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 text-theme-muted hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};