import React, { useRef, useMemo } from 'react';
import { useRegexStore } from '../../../../core/store/useRegexStore';
import { useSelectionStore } from '../../../../core/store/useSelectionStore';
import { useOptimizedSelectionStore } from '../../../../core/store/useOptimizedSelectionStore';
import { useLLMStore } from '../../../../core/store/useLLMStore';
import { useUIStore } from '../../../../core/store/useUIStore';
import { useSubjectSegments } from '../../hooks/useSubjectSegments';
import { useSubjectInteractions } from '../../hooks/useSubjectInteractions';
import { useScrollToSelection } from '../../hooks/useScrollToSelection';
import { SubjectEditorHeader } from './SubjectEditorHeader';
import { SubjectInputArea } from './SubjectInputArea';
import { OptimizedSubjectSplitView } from './OptimizedSubjectSplitView';
import { DocumentMinimap } from '../DocumentMinimap';

export const SubjectEditor: React.FC = () => {
  const text = useRegexStore(state => state.text);
  const setText = useRegexStore(state => state.setText);
  const matches = useRegexStore(state => state.matches);
  const optimizedMatches = useRegexStore(state => state.optimizedMatches);
  const optimizationProposal = useLLMStore(state => state.optimizationProposal);

  const isMinimapOpen = useUIStore(state => state.isMinimapOpen);
  const setIsMinimapOpen = useUIStore(state => state.setIsMinimapOpen);

  // --- Original Selection State ---
  const activeMatchIds = useSelectionStore(s => s.activeMatchIds);
  const activeGroupIds = useSelectionStore(s => s.activeGroupIds);
  const activeInstanceIds = useSelectionStore(s => s.activeInstanceIds);
  const hoveredMatchId = useSelectionStore(s => s.hoveredMatchId);
  const hoveredGroupId = useSelectionStore(s => s.hoveredGroupId);
  const hoveredInstanceId = useSelectionStore(s => s.hoveredInstanceId);
  const selectionSource = useSelectionStore(s => s.selectionSource);
  const handleSelection = useSelectionStore(s => s.handleSelection);
  const handleHover = useSelectionStore(s => s.handleHover);

  const activeMatchSet = useMemo(() => new Set(activeMatchIds), [activeMatchIds]);
  const activeGroupSet = useMemo(() => new Set(activeGroupIds), [activeGroupIds]);
  const activeInstanceSet = useMemo(() => new Set(activeInstanceIds), [activeInstanceIds]);
  const hasAnySelection = activeMatchSet.size > 0 || activeGroupSet.size > 0 || activeInstanceSet.size > 0;

  const selectionState = useMemo(() => ({
    activeMatchSet, activeGroupSet, activeInstanceSet,
    hoveredMatchId, hoveredGroupId, hoveredInstanceId, hasAnySelection
  }), [activeMatchSet, activeGroupSet, activeInstanceSet, hoveredMatchId, hoveredGroupId, hoveredInstanceId, hasAnySelection]);

  // --- Optimized Selection State ---
  const optActiveMatchIds = useOptimizedSelectionStore(s => s.activeMatchIds);
  const optActiveGroupIds = useOptimizedSelectionStore(s => s.activeGroupIds);
  const optActiveInstanceIds = useOptimizedSelectionStore(s => s.activeInstanceIds);
  const optHoveredMatchId = useOptimizedSelectionStore(s => s.hoveredMatchId);
  const optHoveredGroupId = useOptimizedSelectionStore(s => s.hoveredGroupId);
  const optHoveredInstanceId = useOptimizedSelectionStore(s => s.hoveredInstanceId);
  const optSelectionSource = useOptimizedSelectionStore(s => s.selectionSource);
  const optHandleSelection = useOptimizedSelectionStore(s => s.handleSelection);
  const optHandleHover = useOptimizedSelectionStore(s => s.handleHover);

  const optActiveMatchSet = useMemo(() => new Set(optActiveMatchIds), [optActiveMatchIds]);
  const optActiveGroupSet = useMemo(() => new Set(optActiveGroupIds), [optActiveGroupIds]);
  const optActiveInstanceSet = useMemo(() => new Set(optActiveInstanceIds), [optActiveInstanceIds]);
  const optHasAnySelection = optActiveMatchSet.size > 0 || optActiveGroupSet.size > 0 || optActiveInstanceSet.size > 0;

  const optSelectionState = useMemo(() => ({
    activeMatchSet: optActiveMatchSet, activeGroupSet: optActiveGroupSet, activeInstanceSet: optActiveInstanceSet,
    hoveredMatchId: optHoveredMatchId, hoveredGroupId: optHoveredGroupId, hoveredInstanceId: optHoveredInstanceId, hasAnySelection: optHasAnySelection
  }), [optActiveMatchSet, optActiveGroupSet, optActiveInstanceSet, optHoveredMatchId, optHoveredGroupId, optHoveredInstanceId, optHasAnySelection]);

  // --- Chunks ---
  const { chunks } = useSubjectSegments(text, matches);
  const { chunks: optChunks } = useSubjectSegments(text, optimizedMatches);

  // --- Refs & Interactions ---
  const overlayRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const optOverlayRef = useRef<HTMLDivElement>(null);

  const { onMouseMove, onClick, onMouseLeave } = useSubjectInteractions(handleHover, handleSelection, overlayRef, textareaRef);
  const { onMouseMove: optOnMouseMove, onClick: optOnClick, onMouseLeave: optOnMouseLeave } = useSubjectInteractions(optHandleHover, optHandleSelection, optOverlayRef);

  useScrollToSelection(overlayRef, textareaRef, activeMatchIds, activeGroupIds, activeInstanceIds, selectionSource);
  useScrollToSelection(optOverlayRef, undefined, optActiveMatchIds, optActiveGroupIds, optActiveInstanceIds, optSelectionSource);

  return (
    <div className="flex flex-col h-full w-full bg-ide-panel">
      <SubjectEditorHeader
        isMinimapOpen={isMinimapOpen}
        setIsMinimapOpen={setIsMinimapOpen}
        hasOptimization={!!optimizationProposal}
      />

      <div className="flex-1 flex flex-col min-h-0 relative">
        <SubjectInputArea
          text={text}
          setText={setText}
          matchesCount={matches.length}
          chunks={chunks}
          selectionState={selectionState}
          overlayRef={overlayRef}
          textareaRef={textareaRef}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          onClick={onClick}
        />

        <DocumentMinimap
          isMinimapOpen={isMinimapOpen}
          text={text}
          matches={matches}
          overlayRef={overlayRef}
          textareaRef={textareaRef}
          activeMatchSet={activeMatchSet}
          activeGroupSet={activeGroupSet}
          activeInstanceSet={activeInstanceSet}
        />

        {optimizationProposal && (
          <OptimizedSubjectSplitView
            text={text}
            optimizedMatchesCount={optimizedMatches.length}
            optChunks={optChunks}
            optSelectionState={optSelectionState}
            optOverlayRef={optOverlayRef}
            onMouseMove={optOnMouseMove}
            onMouseLeave={optOnMouseLeave}
            onClick={optOnClick}
          />
        )}
      </div>
    </div>
  );
};