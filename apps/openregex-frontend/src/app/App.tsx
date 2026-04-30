import { useState, useEffect } from 'react';
import { Header } from './layout/Header';
import { Footer } from './layout/Footer';
import { PatternEditor } from '../features/pattern-editor';
import { SubjectEditor } from '../features/subject-tester';
import { Inspector } from '../features/match-inspector';
import { CheatSheet } from '../features/cheat-sheet';
import { CompatibilityReport } from '../features/engine-selector';
import { PersonalPanel } from '../features/personal';
import { AISidebar } from '../features/ai-assistant';
import { useRegexStore } from '../core/store/useRegexStore';
import { useSelectionStore } from '../core/store/useSelectionStore';
import { useUIStore } from '../core/store/useUIStore';
import { useLLMStore } from '../core/store/useLLMStore';
import { useStorageStore } from '../core/store/useStorageStore';
import { getUrlState, updateUrlState } from '../shared/utils/link';
import { mapPythonIndicesToJs } from '../shared/utils/subject.utils';
import { MessageSquareText } from 'lucide-react';
import pkg from '../../package.json';

const LEGACY_ENGINE_MAP: Record<string, string> = {
  'Python - re': 'python_re',
  'Python - regex': 'python_regex',
  'C++': 'cpp_std',
  'Java': 'jvm_standard',
  'JavaScript': 'v8_standard'
};

export default function App() {
  const [systemInfo, setSystemInfo] = useState({
    backendVersion: 'Unknown',
    frontendVersion: pkg.version,
    releaseDate: 'Unknown'
  });

  const isCheatSheetOpen = useUIStore(state => state.isCheatSheetOpen);

  const isAiSidebarOpen = useLLMStore(state => state.isAiSidebarOpen);
  const setAiSidebarOpen = useLLMStore(state => state.setAiSidebarOpen);
  const isAvailable = useLLMStore(state => state.isAvailable);

  const setWorkers = useRegexStore(state => state.setWorkers);
  const setLoading = useRegexStore(state => state.setLoading);
  const setSelectedEngineId = useRegexStore(state => state.setSelectedEngineId);
  const setRegex = useRegexStore(state => state.setRegex);
  const setText = useRegexStore(state => state.setText);
  const loading = useRegexStore(state => state.loading);
  const selectedEngineId = useRegexStore(state => state.selectedEngineId);
  const regex = useRegexStore(state => state.regex);
  const text = useRegexStore(state => state.text);
  const activeFlags = useRegexStore(state => state.activeFlags);
  const setMatches = useRegexStore(state => state.setMatches);
  const setError = useRegexStore(state => state.setError);
  const setExecTime = useRegexStore(state => state.setExecTime);

  useEffect(() => {
    fetch('/api/info', {
      headers: { 'X-Frontend-Version': pkg.version }
    })
      .then(res => res.json())
      .then(data => {
        setSystemInfo({
          backendVersion: data.backend_version || data.version || 'Unknown',
          frontendVersion: pkg.version,
          releaseDate: data.release_date || 'Unknown'
        });

      })
      .catch(() => {
        setSystemInfo({ backendVersion: 'Unknown', frontendVersion: pkg.version, releaseDate: 'Unknown' });
      });

    fetch('/api/engines')
      .then(res => res.json())
      .then(async (workerData) => {
        setWorkers(workerData);
        const flatEngines = workerData.flatMap((w: any) => w.engines);

        const urlState = await getUrlState();
        if (urlState) {

          let resolvedEngineId = '';

          if (urlState.engine_id) {
            resolvedEngineId = urlState.engine_id;
          } else if (urlState.e) {
            const exactMatch = flatEngines.find((e: any) => e.engine_id === urlState.e || e.engine_label === urlState.e);
            if (exactMatch) {
              resolvedEngineId = exactMatch.engine_id;
            } else {
              const normalizedLegacy = LEGACY_ENGINE_MAP[urlState.e] || urlState.e.toLowerCase();
              const prefixMatch = flatEngines.find((e: any) =>
                e.engine_id.startsWith(`${normalizedLegacy}_`) ||
                e.engine_id.startsWith(normalizedLegacy) ||
                e.engine_label.toLowerCase().includes(normalizedLegacy)
              );
              resolvedEngineId = prefixMatch ? prefixMatch.engine_id : (flatEngines.length > 0 ? flatEngines[0].engine_id : '');
            }
          } else {
            resolvedEngineId = flatEngines.length > 0 ? flatEngines[0].engine_id : '';
          }

          setSelectedEngineId(resolvedEngineId);
          setRegex((urlState.regex || urlState.r || '').replace(/\r/g, ''));
          setText((urlState.text || urlState.t || '').replace(/\r/g, ''));
          useRegexStore.setState({ activeFlags: urlState.flags || [] });
        } else if (flatEngines.length > 0) {
          setSelectedEngineId(flatEngines[0].engine_id);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch engines", err);
        setLoading(false);
      });
  }, [setWorkers, setLoading, setSelectedEngineId, setRegex, setText]);

  useEffect(() => {
    if (!loading) {
      updateUrlState({ engine_id: selectedEngineId, regex, text, flags: activeFlags });
    }

    if (!regex || !text || !selectedEngineId) {
      setMatches([]);
      setError(null);
      setExecTime(null);
      return;
    }

    const timer = setTimeout(() => {
      fetch('/api/match', {
        method: 'POST',

        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine_id: selectedEngineId, regex, text, flags: activeFlags })
      })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Server error');
        return data;
      })
      .then(data => {
        if (data.success) {

          const normalizedMatches = mapPythonIndicesToJs(text, data.matches);
          setMatches(normalizedMatches);
          setError(null);

          useStorageStore.getState().pushHistory({
            engineId: selectedEngineId,
            regex,
            text,
            flags: activeFlags
          });

        } else {
          setMatches([]);
          setError(data.error || 'Unknown execution error');
        }
        setExecTime(data.execution_time_ms);

        const { activeGroupIds, handleClearSelection } = useSelectionStore.getState();
        if (activeGroupIds.length > 0 && data.success) {
           const maxGroup = data.matches.reduce((max: number, m: any) =>
             Math.max(max, ...m.groups.map((g: any) => g.group_id)), 0);
           if (activeGroupIds.some(id => id > maxGroup)) handleClearSelection();
        }
      })
      .catch(err => {
        setError(err.message);
        setMatches([]);
        setExecTime(null);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [regex, text, selectedEngineId, activeFlags, loading, setMatches, setError, setExecTime]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        if (isAvailable) {
          setAiSidebarOpen(!isAiSidebarOpen);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isAvailable, isAiSidebarOpen, setAiSidebarOpen]);

  return (
    <div className="flex flex-col h-screen w-full relative text-theme-text overflow-hidden bg-theme-base">
      <div className="bg-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      <div className="relative z-10 flex flex-col h-full w-full">
        <div className="px-4 pt-4 shrink-0 w-full relative z-30">
          <Header />

        </div>

        <div className={`transition-all duration-300 ease-in-out overflow-hidden px-4 z-20 ${isCheatSheetOpen ? 'max-h-96 opacity-100 py-4' : 'max-h-0 opacity-0 py-0'}`}>
          <CheatSheet />
        </div>

        <main className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden p-4 gap-4 h-full custom-scrollbar relative">
          <div className="flex flex-col lg:flex-row gap-4 w-full">

            <div className="flex flex-col gap-4 shrink-0 lg:shrink w-full lg:w-7/12">

              <div className="flex-1 min-h-[200px] flex flex-col rounded-[20px] overflow-hidden glass-panel relative border border-ide-border focus-within:ring-1 focus-within:ring-theme-primary transition-all">
                <PatternEditor />
              </div>

              <div className="flex-[1.5] min-h-[250px] flex flex-col rounded-[20px] overflow-hidden glass-panel relative border border-ide-border focus-within:ring-1 focus-within:ring-theme-primary transition-all">
                <SubjectEditor />

              </div>
            </div>

            <div className="w-full h-[350px] lg:h-full glass-panel rounded-[20px] overflow-hidden flex flex-col relative shadow-lg shrink-0 lg:shrink hidden md:flex lg:w-5/12">
              <Inspector />
            </div>

          </div>

          {isAiSidebarOpen && isAvailable && (
             <div className="fixed bottom-16 md:bottom-[100px] right-4 md:right-[52px] z-50 w-[calc(100vw-32px)] md:w-[420px] h-[80vh] md:h-[800px] max-h-[90vh] glass-panel rounded-[20px] overflow-hidden flex flex-col shadow-2xl shadow-purple-500/20 border border-purple-500/40 animate-in slide-in-from-bottom-8 fade-in bg-theme-base/95 backdrop-blur-xl">
               <AISidebar onClose={() => setAiSidebarOpen(false)} />
             </div>

          )}
        </main>

        <div className="px-4 pb-2 shrink-0 flex items-center justify-between">
          {isAvailable && (
            <button
              className="md:hidden p-2 rounded-full bg-theme-surface border border-theme-border shadow-md z-40"
              onClick={() => setAiSidebarOpen(!isAiSidebarOpen)}
            >

              <MessageSquareText size={20} className={isAiSidebarOpen ? 'text-purple-500' : 'text-theme-muted'} />
            </button>
          )}
          <div className="flex-1 ml-2 md:ml-0">
            <Footer
              frontendVersion={systemInfo.frontendVersion}
              backendVersion={systemInfo.backendVersion}
              backendReleaseDate={systemInfo.releaseDate}

            />
          </div>
        </div>
      </div>

      <CompatibilityReport />
      <PersonalPanel />
    </div>
  );
}