import React, { useMemo } from 'react';
import { useRegexStore } from '../../../../core/store/useRegexStore';
import { PatternEditorHeader } from './PatternEditorHeader';
import { PatternInputArea } from './PatternInputArea';
import { OptimizedPatternSplitView } from './OptimizedPatternSplitView';
import { FloatingAIActions } from './FloatingAIActions';

export const PatternEditor: React.FC = () => {
  const engines = useRegexStore(state => state.engines);
  const selectedEngineId = useRegexStore(state => state.selectedEngineId);

  const activeEngine = engines.find(e => e.engine_id === selectedEngineId);

  const cheatSheetItems = useMemo(() => {
    if (!activeEngine?.engine_cheat_sheet) return [];
    return activeEngine.engine_cheat_sheet.flatMap(cat => cat.items.map(i => i.character));
  }, [activeEngine]);

  return (
    <div className="flex flex-col h-full bg-ide-panel border border-ide-border shadow-sm rounded-sm focus-within:ring-1 focus-within:ring-theme-primary transition-all overflow-hidden relative">
      <PatternEditorHeader />

      <div className="flex-1 flex flex-col min-h-0 bg-transparent">
        <PatternInputArea cheatSheetItems={cheatSheetItems} />
        <OptimizedPatternSplitView cheatSheetItems={cheatSheetItems} />
      </div>

      <FloatingAIActions />
    </div>
  );
};