import React, { useRef, useMemo, useEffect } from 'react';
import { useRegexStore } from '../../../core/store/useRegexStore';
import { useOptimizedSelectionStore } from '../../../core/store/useOptimizedSelectionStore';
import { useSubjectSegments } from '../hooks/useSubjectSegments';
import { useSubjectInteractions } from '../hooks/useSubjectInteractions';
import { useScrollToSelection } from '../hooks/useScrollToSelection';
import { Chunk } from './Chunk';
import { SHARED_SUBJECT_CLASSES, SHARED_GUTTER_CLASSES } from './SubjectEditor/constants';

export const OptimizedSubjectEditor: React.FC = () => {
  const text = useRegexStore(state => state.text);
  const optimizedMatches = useRegexStore(state => state.optimizedMatches);

  const activeMatchIds = useOptimizedSelectionStore(s => s.activeMatchIds);
  const activeGroupIds = useOptimizedSelectionStore(s => s.activeGroupIds);
  const activeInstanceIds = useOptimizedSelectionStore(s => s.activeInstanceIds);
  const hoveredMatchId = useOptimizedSelectionStore(s => s.hoveredMatchId);
  const hoveredGroupId = useOptimizedSelectionStore(s => s.hoveredGroupId);
  const hoveredInstanceId = useOptimizedSelectionStore(s => s.hoveredInstanceId);
  const selectionSource = useOptimizedSelectionStore(s => s.selectionSource);
  const handleSelection = useOptimizedSelectionStore(s => s.handleSelection);
  const handleHover = useOptimizedSelectionStore(s => s.handleHover);

  const activeMatchSet = useMemo(() => new Set(activeMatchIds), [activeMatchIds]);
  const activeGroupSet = useMemo(() => new Set(activeGroupIds), [activeGroupIds]);
  const activeInstanceSet = useMemo(() => new Set(activeInstanceIds), [activeInstanceIds]);
  const hasAnySelection = activeMatchSet.size > 0 || activeGroupSet.size > 0 || activeInstanceSet.size > 0;

  const selectionState = useMemo(() => ({
    activeMatchSet, activeGroupSet, activeInstanceSet,
    hoveredMatchId, hoveredGroupId, hoveredInstanceId, hasAnySelection
  }), [activeMatchSet, activeGroupSet, activeInstanceSet, hoveredMatchId, hoveredGroupId, hoveredInstanceId, hasAnySelection]);

  const { chunks } = useSubjectSegments(text, optimizedMatches);
  const overlayRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const { onMouseMove, onClick, onMouseLeave } = useSubjectInteractions(handleHover, handleSelection, overlayRef);

  useScrollToSelection(overlayRef, undefined, activeMatchIds, activeGroupIds, activeInstanceIds, selectionSource);

  useEffect(() => {
    const overlay = overlayRef.current;
    const gutter = gutterRef.current;
    if (!overlay || !gutter) return;

    const syncGutter = () => { gutter.scrollTop = overlay.scrollTop; };
    overlay.addEventListener('scroll', syncGutter, { passive: true });
    return () => overlay.removeEventListener('scroll', syncGutter);
  }, [overlayRef]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const lineCount = text.split('\n').length;
  const linesStr = Array.from({ length: Math.max(1, lineCount) }, (_, i) => i + 1).join('\n');

  return (
    <div className="flex flex-col h-full w-full cursor-default" onMouseLeave={onMouseLeave} onMouseMove={onMouseMove} onClick={onClick}>
      <div className="relative w-full h-full flex bg-transparent">
        <div
          ref={gutterRef}
          className={`w-12 shrink-0 bg-black/5 dark:bg-white/5 border-r border-ide-border text-theme-muted/50 text-right overflow-hidden ${SHARED_GUTTER_CLASSES}`}
        >
          {linesStr}
          {text.endsWith('\n') && <br/>}
        </div>

        <div className="relative flex-1 min-w-0">
          <div ref={overlayRef} onScroll={handleScroll} className={`absolute inset-0 w-full h-full overflow-auto text-ide-text z-0 isolate pointer-events-auto custom-scrollbar ${SHARED_SUBJECT_CLASSES}`}>
            {chunks.map((chunkSegments, idx) => (
              <Chunk key={idx} segments={chunkSegments} selectionState={selectionState} rootRef={overlayRef} />
            ))}
            {text.endsWith('\n') && <br />}
          </div>
        </div>
      </div>
    </div>
  );
};