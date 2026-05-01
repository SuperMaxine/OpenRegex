import React, { useRef, useEffect, useMemo, useState, memo } from 'react';
import { Map } from 'lucide-react';
import { MatchItem } from '../../../core/types';
import { getGroupColorClasses } from '../../../shared/utils/colors';
import { useRegexStore } from '../../../core/store/useRegexStore';
import { useSelectionStore } from '../../../core/store/useSelectionStore';
import { useOptimizedSelectionStore } from '../../../core/store/useOptimizedSelectionStore';
import { useLLMStore } from '../../../core/store/useLLMStore';

const renderTextWithTooltips = (textContent: string) => {
  if (!textContent) return null;
  const parts = textContent.split(/((?:\\u[0-9A-Fa-f]{4})+)/);
  return parts.map((part, idx) => {
    if (/^(?:\\u[0-9A-Fa-f]{4})+$/.test(part)) {
      try {
        const hexes = part.match(/[0-9A-Fa-f]{4}/g) || [];
        const chars = hexes.map(h => parseInt(h, 16));
        const charStr = String.fromCharCode(...chars);
        return (
          <span
            key={idx}
            title={charStr}
            className="cursor-help border-b border-dotted border-theme-muted hover:bg-theme-border transition-colors"
          >
            {part}
          </span>
        );
      } catch {
        return <span key={idx}>{part}</span>;
      }
    }
    return <span key={idx}>{part}</span>;
  });
};

interface SpanMarker {
  type: 'match' | 'group';
  start: number;
  end: number;
  matchId: number;
  groupId?: number;
  instanceId?: string;
}

interface Segment {
  start: number;
  end: number;
  textSlice: string;
  markers: SpanMarker[];
}

const buildSegments = (text: string, matches: MatchItem[]): Segment[] => {
  const boundaries = new Set<number>([0, text.length]);
  const markers: SpanMarker[] = [];

  matches.forEach(m => {
    boundaries.add(m.start);
    boundaries.add(m.end);
    markers.push({ type: 'match', start: m.start, end: m.end, matchId: m.match_id });

    m.groups.forEach(g => {
      boundaries.add(g.start);
      boundaries.add(g.end);
      markers.push({
        type: 'group',
        start: g.start,
        end: g.end,
        matchId: m.match_id,
        groupId: g.group_id,
        instanceId: `m${m.match_id}-g${g.group_id}-${g.start}`,
      });
    });
  });

  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);
  const segments: Segment[] = [];

  for (let i = 0; i < sortedBoundaries.length - 1; i++) {
    const start = sortedBoundaries[i];
    const end = sortedBoundaries[i + 1];
    if (start === end) continue;

    const coveringMarkers = markers.filter(m => m.start <= start && m.end >= end);
    coveringMarkers.sort((a, b) => (a.end - a.start) - (b.end - b.start));

    segments.push({
      start,
      end,
      textSlice: text.slice(start, end),
      markers: coveringMarkers
    });
  }

  return segments;
};

const matchColor = {
  base: 'bg-emerald-500/15 ring-1 ring-inset ring-emerald-400/40 text-emerald-900 dark:bg-[#34D399]/15 dark:ring-[#34D399]/30 dark:text-[#34D399] box-decoration-clone',
  active: 'bg-emerald-500/40 ring-2 ring-inset ring-emerald-500 text-emerald-950 dark:bg-[#34D399]/30 dark:ring-[#34D399]/60 dark:text-[#FFFFFF] dark:shadow-[0_0_8px_rgba(52,211,153,0.4)] z-10 relative box-decoration-clone'
};

const Chunk = memo(({ segments, selectionState, rootRef }: { segments: Segment[], selectionState: any, rootRef: React.RefObject<HTMLDivElement> }) => {
  const [isVisible, setIsVisible] = useState(true);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, { root: rootRef.current, rootMargin: '600px' });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [rootRef]);

  if (!isVisible) {
    return <span ref={ref}>{segments.map(s => s.textSlice).join('')}</span>;
  }

  const { activeMatchSet, activeGroupSet, activeInstanceSet, hoveredMatchId, hoveredGroupId, hoveredInstanceId, hasAnySelection } = selectionState;

  return (
    <span ref={ref}>
      {segments.map((seg, i) => {
        if (seg.markers.length === 0) {
          return <span key={i}>{renderTextWithTooltips(seg.textSlice)}</span>;
        }

        const topHoveredMarker = seg.markers.find(m =>
          m.type === 'group'
            ? (hoveredInstanceId ? hoveredInstanceId === m.instanceId : hoveredGroupId === m.groupId)
            : (hoveredMatchId === m.matchId && hoveredGroupId === null)
        );

        const topActiveMarker = seg.markers.find(m =>
          m.type === 'group'
            ? (activeInstanceSet.size > 0 ? activeInstanceSet.has(m.instanceId!) : activeGroupSet.has(m.groupId!))
            : activeMatchSet.has(m.matchId)
        );

        const topMarker = topHoveredMarker || topActiveMarker || seg.markers[0];
        const isActive = !!topActiveMarker;
        const isHover = !!topHoveredMarker;
        const isDimmed = hasAnySelection && !isActive && !isHover;

        let colorClasses = '';
        let layerClass = isHover ? '!z-50' : (isActive ? 'z-40' : (isDimmed ? 'z-0' : 'z-10 hover:z-20'));

        if (topMarker.type === 'match') {
          colorClasses = (isActive || isHover) ? matchColor.active : matchColor.base;
          if (isDimmed) colorClasses += ' opacity-35 saturate-[0.7]';
        } else {
          colorClasses = getGroupColorClasses(topMarker.groupId!, isActive || isHover, isDimmed);
        }

        return (
          <span
            key={i}
            data-match-id={topMarker.matchId}
            data-group-id={topMarker.groupId}
            data-instance-id={topMarker.instanceId}
            className={`relative rounded-sm transition-colors duration-150 cursor-pointer ${colorClasses} ${layerClass}`}
          >
            {renderTextWithTooltips(seg.textSlice)}
          </span>
        );
      })}
    </span>
  );
});

export const SubjectEditor: React.FC = () => {
  const text = useRegexStore(state => state.text);
  const setText = useRegexStore(state => state.setText);
  const matches = useRegexStore(state => state.matches);
  const optimizedMatches = useRegexStore(state => state.optimizedMatches);
  const optimizationProposal = useLLMStore(state => state.optimizationProposal);

  const [isMinimapOpen, setIsMinimapOpen] = useState(false);

  const activeMatchIds = useSelectionStore(s => s.activeMatchIds);
  const activeGroupIds = useSelectionStore(s => s.activeGroupIds);
  const activeInstanceIds = useSelectionStore(s => s.activeInstanceIds);
  const hoveredMatchId = useSelectionStore(s => s.hoveredMatchId);
  const hoveredGroupId = useSelectionStore(s => s.hoveredGroupId);
  const hoveredInstanceId = useSelectionStore(s => s.hoveredInstanceId);
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

  const optActiveMatchIds = useOptimizedSelectionStore(s => s.activeMatchIds);
  const optActiveGroupIds = useOptimizedSelectionStore(s => s.activeGroupIds);
  const optActiveInstanceIds = useOptimizedSelectionStore(s => s.activeInstanceIds);
  const optHoveredMatchId = useOptimizedSelectionStore(s => s.hoveredMatchId);
  const optHoveredGroupId = useOptimizedSelectionStore(s => s.hoveredGroupId);
  const optHoveredInstanceId = useOptimizedSelectionStore(s => s.hoveredInstanceId);
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

  const segments = useMemo(() => buildSegments(text, matches), [text, matches]);
  const optSegments = useMemo(() => buildSegments(text, optimizedMatches), [text, optimizedMatches]);

  const CHUNK_SIZE = 60;
  const chunks = useMemo(() => {
    const result = [];
    for (let i = 0; i < segments.length; i += CHUNK_SIZE) result.push(segments.slice(i, i + CHUNK_SIZE));
    return result;
  }, [segments]);

  const optChunks = useMemo(() => {
    const result = [];
    for (let i = 0; i < optSegments.length; i += CHUNK_SIZE) result.push(optSegments.slice(i, i + CHUNK_SIZE));
    return result;
  }, [optSegments]);

  const sharedClasses = "font-mono text-sm leading-snug p-3 m-0 border-none outline-none whitespace-pre-wrap break-all box-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [font-variant-ligatures:none]";

  const overlayRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const optOverlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const lastHoverRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  const scheduleHover = (mId: number | null, gId: number | null, iId: string | null) => {
    const nextKey = `${mId}-${gId}-${iId}`;
    if (lastHoverRef.current === nextKey) return;
    lastHoverRef.current = nextKey;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => handleHover(mId, gId, iId));
  };

  const optLastHoverRef = useRef<string | null>(null);
  const optRafRef = useRef<number | null>(null);

  const scheduleOptHover = (mId: number | null, gId: number | null, iId: string | null) => {
    const nextKey = `${mId}-${gId}-${iId}`;
    if (optLastHoverRef.current === nextKey) return;
    optLastHoverRef.current = nextKey;
    if (optRafRef.current) cancelAnimationFrame(optRafRef.current);
    optRafRef.current = requestAnimationFrame(() => optHandleHover(mId, gId, iId));
  };

  useEffect(() => {
    if (/[^\x00-\x7F]/.test(text)) {
      const escaped = text.replace(/[^\x00-\x7F]/g, char => `\\u${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`);
      setText(escaped);
    }
  }, [text, setText]);

  const updateMinimap = () => {
    if (!isMinimapOpen || !canvasRef.current || !overlayRef.current) return;
    const canvas = canvasRef.current;
    const container = overlayRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (text.length === 0) return;

    const lines = text.split('\n');
    const totalLines = Math.max(1, lines.length);
    const lineHeight = canvas.height / totalLines;

    ctx.fillStyle = 'rgba(150, 150, 150, 0.2)';
    lines.forEach((line, i) => {
      const lw = Math.min(canvas.width - 4, (line.length / 80) * canvas.width);
      ctx.fillRect(2, i * lineHeight, lw, Math.max(1, lineHeight - 0.5));
    });

    ctx.fillStyle = 'rgba(236, 72, 153, 0.7)';
    matches.forEach(m => {
      const startLine = text.substring(0, m.start).split('\n').length - 1;
      const endLine = text.substring(0, m.end).split('\n').length - 1;
      for (let i = startLine; i <= endLine; i++) {
        ctx.fillRect(0, i * lineHeight, canvas.width, Math.max(1, lineHeight));
      }
    });

    const scrollRatio = container.scrollTop / container.scrollHeight;
    const viewportRatio = container.clientHeight / container.scrollHeight;
    const viewY = scrollRatio * canvas.height;
    const viewH = Math.max(10, viewportRatio * canvas.height);

    ctx.fillStyle = 'rgba(100, 150, 255, 0.3)';
    ctx.fillRect(0, viewY, canvas.width, viewH);
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.8)';
    ctx.strokeRect(0, viewY, canvas.width, viewH);
  };

  useEffect(() => {
    updateMinimap();
    window.addEventListener('resize', updateMinimap);
    return () => window.removeEventListener('resize', updateMinimap);
  }, [isMinimapOpen, text, matches]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement | HTMLDivElement>) => {
    if (overlayRef.current) {
      overlayRef.current.scrollTop = e.currentTarget.scrollTop;
      overlayRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
    if (isMinimapOpen) {
      requestAnimationFrame(updateMinimap);
    }
  };

  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !overlayRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const ratio = y / rect.height;
    overlayRef.current.scrollTop = ratio * overlayRef.current.scrollHeight - (overlayRef.current.clientHeight / 2);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!overlayRef.current) return;
    try {
      if (textareaRef.current) textareaRef.current.style.pointerEvents = 'none';
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;

      if (el) {
        const targetEl = el.closest('[data-match-id], [data-group-id], [data-instance-id]');
        if (targetEl) {
          const groupId = targetEl.getAttribute('data-group-id');
          const instanceId = targetEl.getAttribute('data-instance-id');
          const matchId = groupId ? null : targetEl.getAttribute('data-match-id');

          if (matchId || groupId || instanceId) {
            scheduleHover(matchId ? Number(matchId) : null, groupId ? Number(groupId) : null, instanceId || null);
            return;
          }
        }
      }
      scheduleHover(null, null, null);
    } finally {
      if (textareaRef.current) textareaRef.current.style.pointerEvents = 'auto';
    }
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLTextAreaElement | HTMLDivElement>) => {
    const target = e.currentTarget as HTMLTextAreaElement;
    if (target.selectionStart !== target.selectionEnd) {
        handleSelection(null, null, null, false);
        return;
    }

    if (!overlayRef.current) return;
    try {
      if (textareaRef.current) textareaRef.current.style.pointerEvents = 'none';
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;

      if (el) {
        const targetEl = el.closest('[data-match-id], [data-group-id], [data-instance-id]');
        if (targetEl) {
          const groupId = targetEl.getAttribute('data-group-id');
          const instanceId = targetEl.getAttribute('data-instance-id');
          const matchId = groupId ? null : targetEl.getAttribute('data-match-id');

          if (matchId || groupId || instanceId) {
            handleSelection(matchId ? Number(matchId) : null, groupId ? Number(groupId) : null, instanceId || null, e.ctrlKey || e.metaKey);
            return;
          }
        }
      }
      handleSelection(null, null, null, false);
    } finally {
      if (textareaRef.current) textareaRef.current.style.pointerEvents = 'auto';
    }
  };

  const handleOptMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!optOverlayRef.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;

    if (el) {
      const targetEl = el.closest('[data-match-id], [data-group-id], [data-instance-id]');
      if (targetEl) {
        const groupId = targetEl.getAttribute('data-group-id');
        const instanceId = targetEl.getAttribute('data-instance-id');
        const matchId = groupId ? null : targetEl.getAttribute('data-match-id');
        if (matchId || groupId || instanceId) {
          scheduleOptHover(matchId ? Number(matchId) : null, groupId ? Number(groupId) : null, instanceId || null);
          return;
        }
      }
    }
    scheduleOptHover(null, null, null);
  };

  const handleOptClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!optOverlayRef.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;

    if (el) {
      const targetEl = el.closest('[data-match-id], [data-group-id], [data-instance-id]');
      if (targetEl) {
        const groupId = targetEl.getAttribute('data-group-id');
        const instanceId = targetEl.getAttribute('data-instance-id');
        const matchId = groupId ? null : targetEl.getAttribute('data-match-id');
        if (matchId || groupId || instanceId) {
          optHandleSelection(matchId ? Number(matchId) : null, groupId ? Number(groupId) : null, instanceId || null, e.ctrlKey || e.metaKey);
          return;
        }
      }
    }
    optHandleSelection(null, null, null, false);
  };

  return (
    <div className="flex flex-col h-full w-full bg-ide-panel">
      <div className="component-header">
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
               <label className="component-label m-0">Subject String</label>
               {optimizationProposal && <span className="text-[9px] font-black uppercase text-theme-muted/50 tracking-wider bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full border border-theme-border shadow-sm">Split View</span>}
            </div>
            <span className="text-[9px] font-mono text-theme-muted/60 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded border border-black/5 dark:border-white/5 ml-2 hidden md:inline-block">
               Ctrl/Cmd + Click to multi-select
            </span>
        </div>
        <button
          onClick={() => setIsMinimapOpen(!isMinimapOpen)}
          className={`p-1.5 rounded-md transition-colors border ${isMinimapOpen ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30' : 'text-theme-muted border-transparent hover:border-ide-border hover:bg-black/5 dark:hover:bg-white/5'}`}
          title="Toggle Document Minimap"
        >
          <Map size={14} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="relative flex-1 min-h-[80px]" onMouseMove={handleMouseMove} onMouseLeave={() => scheduleHover(null, null, null)}>
          <div ref={overlayRef} onScroll={handleScroll} className={`absolute inset-0 overflow-y-auto z-0 isolate pointer-events-auto text-ide-text ${sharedClasses}`}>
            {chunks.map((chunkSegments, idx) => (
              <Chunk key={idx} segments={chunkSegments} selectionState={selectionState} rootRef={overlayRef} />
            ))}
            {text.endsWith('\n') && <br />}
          </div>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => {
              const val = e.target.value.replace(/\r/g, '');
              const escaped = val.replace(/[^\x00-\x7F]/g, char => `\\u${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`);
              setText(escaped);
            }}
            onScroll={handleScroll}
            onClick={handleEditorClick}
            placeholder="Enter text to match against..."
            spellCheck={false}
            className={`absolute inset-0 w-full h-full bg-transparent text-ide-text resize-none placeholder-ide-dim overflow-y-auto z-10 pointer-events-auto ${sharedClasses} ${matches.length > 0 ? 'text-transparent caret-theme-text' : ''}`}
          />
        </div>

        {isMinimapOpen && (
          <div className="absolute right-4 top-4 w-16 h-[calc(100%-2rem)] bg-theme-surface/80 backdrop-blur-md border border-theme-border rounded-lg shadow-lg overflow-hidden z-[100]">
            <canvas
               ref={canvasRef}
               onClick={handleMinimapClick}
               className="w-full h-full cursor-pointer"
            />
          </div>
        )}

        {optimizationProposal && (
            <div className="flex flex-col flex-1 min-h-[80px] border-t border-purple-500/20 bg-purple-500/5 z-10 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
                <div className="flex items-center px-3 py-1 bg-purple-500/10 border-b border-purple-500/10 shrink-0">
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                        Optimized Matches ({optimizedMatches.length})
                    </span>
                </div>
                <div className="relative flex-1" onMouseMove={handleOptMouseMove} onClick={handleOptClick} onMouseLeave={() => scheduleOptHover(null, null, null)}>
                    <div ref={optOverlayRef} className={`absolute inset-0 overflow-y-auto z-0 isolate pointer-events-auto text-ide-text cursor-default ${sharedClasses}`}>
                        {optChunks.map((chunkSegments, idx) => (
                          <Chunk key={`opt-${idx}`} segments={chunkSegments} selectionState={optSelectionState} rootRef={optOverlayRef} />
                        ))}
                        {text.endsWith('\n') && <br />}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};