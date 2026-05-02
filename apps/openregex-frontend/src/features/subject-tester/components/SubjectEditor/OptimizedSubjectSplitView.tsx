import React, { useRef, useEffect } from 'react';
import { Chunk } from '../Chunk';
import { SHARED_SUBJECT_CLASSES, SHARED_GUTTER_CLASSES } from './constants';
import { Segment } from '../../utils/segment.utils';

interface OptimizedSubjectSplitViewProps {
  text: string;
  optimizedMatchesCount: number;
  optChunks: Segment[][];
  optSelectionState: any;
  optOverlayRef: React.RefObject<HTMLDivElement>;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave: () => void;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const OptimizedSubjectSplitView: React.FC<OptimizedSubjectSplitViewProps> = ({
  text, optimizedMatchesCount, optChunks, optSelectionState, optOverlayRef, onMouseMove, onMouseLeave, onClick
}) => {
  const gutterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const overlay = optOverlayRef.current;
    const gutter = gutterRef.current;
    if (!overlay || !gutter) return;

    const syncGutter = () => { gutter.scrollTop = overlay.scrollTop; };
    overlay.addEventListener('scroll', syncGutter, { passive: true });
    return () => overlay.removeEventListener('scroll', syncGutter);
  }, [optOverlayRef]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const lineCount = text.split('\n').length;
  const linesStr = Array.from({ length: Math.max(1, lineCount) }, (_, i) => i + 1).join('\n');

  return (
    <div className="flex flex-col flex-1 min-h-[80px] border-t border-purple-500/20 bg-purple-500/5 z-10 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
      <div className="flex items-center px-3 py-1 bg-purple-500/10 border-b border-purple-500/10 shrink-0">
        <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
          Optimized Matches ({optimizedMatchesCount})
        </span>
      </div>
      <div className="relative flex-1 flex min-h-0" onMouseMove={onMouseMove} onClick={onClick} onMouseLeave={onMouseLeave}>
        <div
          ref={gutterRef}
          className={`w-12 shrink-0 bg-black/5 dark:bg-white/5 border-r border-ide-border text-purple-500/50 text-right overflow-hidden ${SHARED_GUTTER_CLASSES}`}
        >
          {linesStr}
          {text.endsWith('\n') && <br/>}
        </div>

        <div className="relative flex-1 min-w-0">
          <div ref={optOverlayRef} onScroll={handleScroll} className={`absolute inset-0 overflow-auto z-0 isolate pointer-events-auto text-ide-text cursor-default custom-scrollbar ${SHARED_SUBJECT_CLASSES}`}>
            {optChunks.map((chunkSegments, idx) => (
              <Chunk key={`opt-${idx}`} segments={chunkSegments} selectionState={optSelectionState} rootRef={optOverlayRef} />
            ))}
            {text.endsWith('\n') && <br />}
          </div>
        </div>
      </div>
    </div>
  );
};