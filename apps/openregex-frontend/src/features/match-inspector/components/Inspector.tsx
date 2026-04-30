import React, { useState, useEffect, useRef } from 'react';
import { useRegexStore } from '../../../core/store/useRegexStore';
import { useSelectionStore } from '../../../core/store/useSelectionStore';
import { useOptimizedSelectionStore } from '../../../core/store/useOptimizedSelectionStore';
import { useLLMStore } from '../../../core/store/useLLMStore';
import { InspectorHeader } from './InspectorHeader';
import { InspectorErrorState } from './InspectorErrorState';
import { InspectorMatchItem } from './InspectorMatchItem';

export const Inspector: React.FC = () => {
  const { matches, optimizedMatches, execTime, optimizedExecTime, error } = useRegexStore();
  const originalSelection = useSelectionStore();
  const optimizedSelection = useOptimizedSelectionStore();
  const { optimizationProposal } = useLLMStore();

  const [activeTab, setActiveTab] = useState<'original' | 'optimized'>('original');
  const [expandedMatches, setExpandedMatches] = useState<Record<string, boolean>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (optimizationProposal) {
      setActiveTab('optimized');
    } else {
      setActiveTab('original');
    }
  }, [optimizationProposal]);

  const selection = activeTab === 'optimized' ? optimizedSelection : originalSelection;
  const displayMatches = activeTab === 'optimized' ? optimizedMatches : matches;

  const toggleMatchExpand = (matchId: string) => {
    setExpandedMatches(prev => ({ ...prev, [matchId]: !prev[matchId] }));
  };

  const handleExpandAll = () => {
    const newState = { ...expandedMatches };
    displayMatches.forEach(m => {
      newState[`${activeTab === 'optimized' ? 'opt' : 'orig'}-${m.match_id}`] = true;
    });
    setExpandedMatches(newState);
  };

  const handleCollapseAll = () => {
    const newState = { ...expandedMatches };
    displayMatches.forEach(m => {
      newState[`${activeTab === 'optimized' ? 'opt' : 'orig'}-${m.match_id}`] = false;
    });
    setExpandedMatches(newState);
  };

  useEffect(() => {
    if (!scrollContainerRef.current) return;

    let targetSelector = '';
    let targetMatchId: number | null = null;

    if (selection.activeInstanceIds.length > 0) {
      const lastInstance = selection.activeInstanceIds[selection.activeInstanceIds.length - 1];
      targetSelector = `[data-inspector-instance-id="${lastInstance}"]`;
      const match = lastInstance.match(/^m(\d+)-/);
      if (match) targetMatchId = parseInt(match[1], 10);
    } else if (selection.activeMatchIds.length > 0) {
      targetMatchId = selection.activeMatchIds[selection.activeMatchIds.length - 1];
      targetSelector = `[data-inspector-match-id="${targetMatchId}"]`;
    } else if (selection.activeGroupIds.length > 0) {
      targetSelector = `[data-inspector-group-id="${selection.activeGroupIds[selection.activeGroupIds.length - 1]}"]`;
    }

    if (targetMatchId !== null) {
      const prefix = activeTab === 'optimized' ? 'opt' : 'orig';
      const uniqueId = `${prefix}-${targetMatchId}`;
      setExpandedMatches(prev => {
        if (prev[uniqueId] === false) {
          return { ...prev, [uniqueId]: true };
        }
        return prev;
      });
    }

    if (targetSelector) {
      setTimeout(() => {
        const el = scrollContainerRef.current?.querySelector(targetSelector);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }, [selection.activeMatchIds, selection.activeInstanceIds, selection.activeGroupIds, activeTab]);

  return (
    <div className="flex flex-col h-full w-full relative bg-ide-panel" onMouseLeave={() => { originalSelection.handleHover(null, null, null); optimizedSelection.handleHover(null, null, null); }}>
      <InspectorHeader
        execTime={execTime}
        optimizedExecTime={optimizedExecTime}
        hasOptimization={!!optimizationProposal}
        displayMatchesCount={displayMatches.length}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar p-1" ref={scrollContainerRef}>
        {error && activeTab === 'original' ? (
          <InspectorErrorState error={error} />
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex flex-col gap-px">
              {displayMatches.length === 0 ? (
                <div className="text-theme-muted/40 text-[11px] py-3 font-mono italic text-center border border-dashed border-theme-border/50 rounded-lg mt-1">
                  No matches found.
                </div>
              ) : (
                displayMatches.map((m, index) => {
                  const prefix = activeTab === 'optimized' ? 'opt' : 'orig';
                  const uniqueId = `${prefix}-${m.match_id}`;
                  return (
                    <InspectorMatchItem
                      key={uniqueId}
                      match={m}
                      index={index}
                      uniqueId={uniqueId}
                      prefix={prefix}
                      activeSelection={selection}
                      isExpanded={expandedMatches[uniqueId] ?? true}
                      toggleExpand={toggleMatchExpand}
                    />
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};