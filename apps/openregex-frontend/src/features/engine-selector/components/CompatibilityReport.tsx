import React, { useEffect, useState, useMemo } from 'react';
import { X, Activity, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { EngineInfo } from '../../../core/types';
import { useRegexStore } from '../../../core/store/useRegexStore';
import { useUIStore } from '../../../core/store/useUIStore';

type CheckStatus = 'pending' | 'success' | 'error';

interface EngineResult {
  status: CheckStatus;
  matchCount?: number;
  execTime?: number;
  errorMessage?: string;
}

export const CompatibilityReport: React.FC = () => {
  const { engines, regex, text, activeFlags } = useRegexStore();
  const { isCompatibilityReportOpen: isOpen, setCompatibilityReportOpen } = useUIStore();
  const [results, setResults] = useState<Record<string, EngineResult>>({});

  const groupedEngines = useMemo(() => {
    const groups: Record<string, EngineInfo[]> = {};
    engines.forEach(engine => {
      const family = engine.engine_label.split(' ')[0];
      if (!groups[family]) groups[family] = [];
      groups[family].push(engine);
    });
    return groups;
  }, [engines]);

  useEffect(() => {
    if (!isOpen) return;

    const runChecks = async () => {
      const initialResults: Record<string, EngineResult> = {};
      engines.forEach(e => {
        initialResults[e.engine_id] = { status: 'pending' };
      });
      setResults(initialResults);

      await Promise.allSettled(
        engines.map(async (engine) => {
          try {
            const res = await fetch('/api/match', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ engine_id: engine.engine_id, regex, text, flags: activeFlags })
            });
            const data = await res.json();

            setResults(prev => ({
              ...prev,
              [engine.engine_id]: data.success
                ? { status: 'success', matchCount: data.matches?.length || 0, execTime: data.execution_time_ms }
                : { status: 'error', errorMessage: data.error || 'Unknown error' }
            }));
          } catch (err: any) {
            setResults(prev => ({
              ...prev,
              [engine.engine_id]: { status: 'error', errorMessage: err.message || 'Network error' }
            }));
          }
        })
      );
    };

    runChecks();
  }, [isOpen, engines, regex, text, activeFlags]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
      <div className="bg-theme-base dark:bg-[#121216] border border-theme-border shadow-2xl rounded-[20px] w-full max-w-4xl flex flex-col max-h-[85vh] overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border bg-black/5 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-indigo-500/10 text-indigo-500`}>
              <Activity size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-theme-text uppercase tracking-widest">Compatibility Report</h2>
              <p className="text-[10px] text-theme-muted font-mono mt-0.5">
                Testing {engines.length} engines simultaneously
              </p>
            </div>
          </div>
          <button
            onClick={() => setCompatibilityReportOpen(false)}
            className="p-2 text-theme-muted hover:text-theme-text hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(groupedEngines).map(([family, familyEngines]) => (
              <div key={family} className="flex flex-col gap-2">
                <h3 className="text-[10px] font-black text-theme-muted/60 uppercase tracking-widest select-none border-b border-theme-border pb-1 mb-1">
                  {family}
                </h3>
                {familyEngines.map(engine => {
                  const result = results[engine.engine_id];
                  return (
                    <div
                      key={engine.engine_id}
                      className={`flex flex-col gap-1.5 p-3 rounded-lg border transition-colors ${
                        result?.status === 'error' 
                          ? 'bg-rose-500/5 border-rose-500/20' 
                          : result?.status === 'success'
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-theme-text">
                          {engine.engine_label.replace(family + ' ', '')}
                        </span>

                        <div className="flex items-center gap-2">
                          {result?.status === 'pending' && <Loader2 size={14} className="text-theme-muted animate-spin" />}
                          {result?.status === 'success' && <CheckCircle2 size={14} className="text-emerald-500" />}
                          {result?.status === 'error' && <XCircle size={14} className="text-rose-500" />}
                        </div>
                      </div>

                      {result?.status === 'success' && (
                        <div className="flex items-center justify-between mt-1 text-[9px] font-mono text-theme-muted">
                          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                            {result.matchCount} Matches
                          </span>
                          <span>{result.execTime?.toFixed(2)}ms</span>
                        </div>
                      )}

                      {result?.status === 'error' && (
                        <div className="mt-1 text-[9px] font-mono text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-1.5 rounded break-all leading-tight">
                          {result.errorMessage}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};