import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useRegexStore } from '../../../core/store/useRegexStore';
import { useSelectionStore } from '../../../core/store/useSelectionStore';
import { useOptimizedSelectionStore } from '../../../core/store/useOptimizedSelectionStore';
import { useLLMStore } from '../../../core/store/useLLMStore';
import { InspectorHeader } from './InspectorHeader';
import { InspectorErrorState } from './InspectorErrorState';
import { InspectorMatchItem } from './InspectorMatchItem';

const calculateItemHeight = (m: any, isExp: boolean) => {
  const matchLines = Math.max(1, Math.ceil((m.full_match?.length || 0) / 55));
  const baseHeight = 28 + (matchLines * 16);

  let groupsHeight = 0;
  if (isExp && m.groups?.length > 0) {
    const rowsHeight = m.groups.reduce((sum: number, g: any) => {
       const contentLines = Math.max(1, Math.ceil((g.content?.length || 0) / 45));
       return sum + 6 + (contentLines * 16);
    }, 0);
    groupsHeight = 20 + rowsHeight + 6;
  }

  return baseHeight + groupsHeight + 12; // Extra buffer to completely prevent overlapping
};

const VirtualInspectorList = memo(({
  matches, prefix, expandedMatches, toggleExpand,
  activeMatchSet, activeGroupSet, activeInstanceSet,
  hoveredMatchId, hoveredGroupId, hoveredInstanceId,
  handleSelection, handleHover, scrollTop, clientHeight
}: any) => {
  const positions = useMemo(() => {
    let y = 0;
    return matches.map((m: any) => {
      const isExp = expandedMatches[`${prefix}-${m.match_id}`] ?? true;
      const h = calculateItemHeight(m, isExp);
      const pos = { top: y, height: h };
      y += h;
      return pos;
    });
  }, [matches, expandedMatches, prefix]);

  const totalHeight = positions.length > 0 ? positions[positions.length - 1].top + positions[positions.length - 1].height : 0;

  let startIndex = 0;
  let endIndex = matches.length;

  if (matches.length > 20) {
    startIndex = Math.max(0, positions.findIndex((p: any) => p.top + p.height > scrollTop) - 5);
    let eIdx = positions.findIndex((p: any) => p.top > scrollTop + clientHeight + 500);
    endIndex = eIdx === -1 ? matches.length : Math.min(matches.length, eIdx + 5);
  }

  const visibleItems = matches.slice(startIndex, endIndex);

  return (
    <div style={{ height: totalHeight, position: 'relative', width: '100%' }}>
      {visibleItems.map((m: any, i: number) => {
        const actualIndex = startIndex + i;
        const pos = positions[actualIndex];
        const uniqueId = `${prefix}-${m.match_id}`;
        return (
          // Removing strict height on absolute wrapper allows natural flow inside its bounds
          // preventing clipping if content wraps unexpectedly
          <div key={uniqueId} style={{ position: 'absolute', top: pos.top, left: 0, right: 0 }}>
            <InspectorMatchItem
              match={m}
              index={actualIndex}
              uniqueId={uniqueId}
              prefix={prefix}
              activeMatchSet={activeMatchSet}
              activeGroupSet={activeGroupSet}
              activeInstanceSet={activeInstanceSet}
              hoveredMatchId={hoveredMatchId}
              hoveredGroupId={hoveredGroupId}
              hoveredInstanceId={hoveredInstanceId}
              handleSelection={handleSelection}
              handleHover={handleHover}
              isExpanded={expandedMatches[uniqueId] ?? true}
              toggleExpand={toggleExpand}
            />
          </div>
        );
      })}
    </div>
  );
});

export const Inspector: React.FC = () => {
  const { matches, optimizedMatches, execTime, optimizedExecTime, error } = useRegexStore();
  const { optimizationProposal } = useLLMStore();

  const originalSelectionProps = {
    activeMatchIds: useSelectionStore(s => s.activeMatchIds),
    activeGroupIds: useSelectionStore(s => s.activeGroupIds),
    activeInstanceIds: useSelectionStore(s => s.activeInstanceIds),
    hoveredMatchId: useSelectionStore(s => s.hoveredMatchId),
    hoveredGroupId: useSelectionStore(s => s.hoveredGroupId),
    hoveredInstanceId: useSelectionStore(s => s.hoveredInstanceId),
    handleSelection: useSelectionStore(s => s.handleSelection),
    handleHover: useSelectionStore(s => s.handleHover),
  };

  const optimizedSelectionProps = {
    activeMatchIds: useOptimizedSelectionStore(s => s.activeMatchIds),
    activeGroupIds: useOptimizedSelectionStore(s => s.activeGroupIds),
    activeInstanceIds: useOptimizedSelectionStore(s => s.activeInstanceIds),
    hoveredMatchId: useOptimizedSelectionStore(s => s.hoveredMatchId),
    hoveredGroupId: useOptimizedSelectionStore(s => s.hoveredGroupId),
    hoveredInstanceId: useOptimizedSelectionStore(s => s.hoveredInstanceId),
    handleSelection: useOptimizedSelectionStore(s => s.handleSelection),
    handleHover: useOptimizedSelectionStore(s => s.handleHover),
  };

  const [activeTab, setActiveTab] = useState<'original' | 'optimized'>('original');
  const [expandedMatches, setExpandedMatches] = useState<Record<string, boolean>>({});
  const [scrollTop, setScrollTop] = useState(0);
  const [clientHeight, setClientHeight] = useState(800);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (optimizationProposal) {
      setActiveTab('optimized');
    } else {
      setActiveTab('original');
    }
  }, [optimizationProposal]);

  useEffect(() => {
    if (scrollContainerRef.current) {
        setClientHeight(scrollContainerRef.current.clientHeight);
    }
  }, []);

  const selection = activeTab === 'optimized' ? optimizedSelectionProps : originalSelectionProps;
  const displayMatches = activeTab === 'optimized' ? optimizedMatches : matches;

  const stateRefs = useRef({ displayMatches, expandedMatches, activeTab });
  useEffect(() => {
    stateRefs.current = { displayMatches, expandedMatches, activeTab };
  }, [displayMatches, expandedMatches, activeTab]);

  const activeMatchSet = useMemo(() => new Set(selection.activeMatchIds), [selection.activeMatchIds]);
  const activeGroupSet = useMemo(() => new Set(selection.activeGroupIds), [selection.activeGroupIds]);
  const activeInstanceSet = useMemo(() => new Set(selection.activeInstanceIds), [selection.activeInstanceIds]);

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

  // Synchronize scrolling to matched element within virtualized window
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    let targetMatchId: number | null = null;

    if (selection.activeInstanceIds.length > 0) {
      const lastInstance = selection.activeInstanceIds[selection.activeInstanceIds.length - 1];
      const match = lastInstance.match(/^m(\d+)-/);
      if (match) targetMatchId = parseInt(match[1], 10);
    } else if (selection.activeMatchIds.length > 0) {
      targetMatchId = selection.activeMatchIds[selection.activeMatchIds.length - 1];
    } else if (selection.activeGroupIds.length > 0) {
      // Find the first match containing the active group if no instance is explicitly selected
      const targetGroup = selection.activeGroupIds[selection.activeGroupIds.length - 1];
      const match = displayMatches.find(m => m.groups.some(g => g.group_id === targetGroup));
      if (match) targetMatchId = match.match_id;
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

      // Calculate exact Y offset manually bypassing querySelector (which fails on unmounted virtual nodes)
      setTimeout(() => {
        if (!scrollContainerRef.current) return;

        const { displayMatches: currentMatches, expandedMatches: currentExpanded } = stateRefs.current;
        const matchIndex = currentMatches.findIndex((m: any) => m.match_id === targetMatchId);

        if (matchIndex !== -1) {
           let targetY = 0;
           for (let i = 0; i < matchIndex; i++) {
              const m = currentMatches[i];
              // Ensure the targeted match is forced as expanded in our calculation
              const isExp = i === matchIndex ? true : (currentExpanded[`${prefix}-${m.match_id}`] ?? true);
              targetY += calculateItemHeight(m, isExp);
           }

           // Scroll into view manually
           scrollContainerRef.current.scrollTo({ top: Math.max(0, targetY - 20), behavior: 'smooth' });
        }
      }, 50);
    }
  }, [selection.activeMatchIds, selection.activeInstanceIds, selection.activeGroupIds, activeTab, displayMatches]);

  return (
    <div className="flex flex-col h-full w-full relative bg-ide-panel" onMouseLeave={() => { originalSelectionProps.handleHover(null, null, null); optimizedSelectionProps.handleHover(null, null, null); }}>
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

      <div className="flex-1 overflow-y-auto custom-scrollbar p-1 relative" ref={scrollContainerRef} onScroll={e => setScrollTop(e.currentTarget.scrollTop)}>
        {error && activeTab === 'original' ? (
          <InspectorErrorState error={error} />
        ) : (
          <div className="flex flex-col gap-1 w-full relative">
            <div className="flex flex-col gap-px w-full">
              {displayMatches.length === 0 ? (
                <div className="text-theme-muted/40 text-[11px] py-3 font-mono italic text-center border border-dashed border-theme-border/50 rounded-lg mt-1 w-full">
                  No matches found.
                </div>
              ) : (
                <VirtualInspectorList
                  matches={displayMatches}
                  prefix={activeTab === 'optimized' ? 'opt' : 'orig'}
                  expandedMatches={expandedMatches}
                  toggleExpand={toggleMatchExpand}
                  activeMatchSet={activeMatchSet}
                  activeGroupSet={activeGroupSet}
                  activeInstanceSet={activeInstanceSet}
                  hoveredMatchId={selection.hoveredMatchId}
                  hoveredGroupId={selection.hoveredGroupId}
                  hoveredInstanceId={selection.hoveredInstanceId}
                  handleSelection={selection.handleSelection}
                  handleHover={selection.handleHover}
                  scrollTop={scrollTop}
                  clientHeight={clientHeight}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};