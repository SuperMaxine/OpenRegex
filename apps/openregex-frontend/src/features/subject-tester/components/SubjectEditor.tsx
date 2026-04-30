import React, { useRef, useEffect } from 'react';
import { MatchGroup } from '../../../core/types';
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
          <span key={idx} title={charStr} className="cursor-help border-b border-dotted border-theme-muted hover:bg-theme-border transition-colors">
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

const getInstanceId = (matchId: number, group: MatchGroup) => `m${matchId}-g${group.group_id}-${group.start}`;

const getNestedChildren = (group: MatchGroup): MatchGroup[] => {
  const groupWithChildren = group as MatchGroup & { children?: MatchGroup[] };
  return Array.isArray(groupWithChildren.children) ? groupWithChildren.children : [];
};

const isGroupActive = (
  group: MatchGroup,
  matchId: number,
  activeGroupIds: number[],
  activeInstanceIds: string[]
) => {
  const instanceId = getInstanceId(matchId, group);
  return activeInstanceIds.length > 0 ? activeInstanceIds.includes(instanceId) : activeGroupIds.includes(group.group_id);
};

const isGroupHovered = (
  group: MatchGroup,
  matchId: number,
  hoveredGroupId: number | null,
  hoveredInstanceId: string | null
) => {
  const instanceId = getInstanceId(matchId, group);
  return hoveredInstanceId ? hoveredInstanceId === instanceId : hoveredGroupId === group.group_id;
};

const hasDescendantState = (
  children: MatchGroup[],
  predicate: (group: MatchGroup) => boolean
): boolean => {
  return children.some(child => predicate(child) || hasDescendantState(getNestedChildren(child), predicate));
};

const getGroupLayerClass = (
  isHovered: boolean,
  hasHoveredDescendant: boolean,
  isEffectivelyActive: boolean,
  hasActiveDescendant: boolean,
  isDimmed: boolean
) => {
  if (isHovered) return '!z-50';
  if (hasHoveredDescendant) return '!z-40';
  if (isEffectivelyActive) return 'z-40';
  if (hasActiveDescendant) return 'z-30';
  if (isDimmed) return 'z-0';
  return 'z-10 hover:z-20';
};

const MatchNode = ({
  text, start, end, groups, matchId, activeGroupIds, activeInstanceIds, hasAnySelection, hoveredGroupId, hoveredInstanceId
}: {
  text: string, start: number, end: number, groups: MatchGroup[], matchId: number, activeGroupIds: number[], activeInstanceIds: string[], hasAnySelection: boolean, hoveredGroupId: number | null, hoveredInstanceId: string | null
}) => {
  if (groups.length === 0) return <span>{renderTextWithTooltips(text.slice(start, end))}</span>;

  const topLevel: (MatchGroup & { children: MatchGroup[] })[] = [];
  let currentGroups = [...groups].sort((a, b) => a.start - b.start || b.end - a.end);

  while (currentGroups.length > 0) {
    const g = currentGroups.shift()!;
    const children = currentGroups.filter(c => c.start >= g.start && c.end <= g.end);
    currentGroups = currentGroups.filter(c => !(c.start >= g.start && c.end <= g.end));
    topLevel.push({ ...g, children });
  }

  let lastIdx = start;
  const elements = [];

  topLevel.forEach((g, i) => {
    if (g.start > lastIdx) elements.push(<span key={`text-${i}`}>{renderTextWithTooltips(text.slice(lastIdx, g.start))}</span>);

    const instanceId = getInstanceId(matchId, g);
    const isEffectivelyActive = isGroupActive(g, matchId, activeGroupIds, activeInstanceIds);
    const isHovered = isGroupHovered(g, matchId, hoveredGroupId, hoveredInstanceId);
    const hasActiveDescendant = hasDescendantState(g.children, child => isGroupActive(child, matchId, activeGroupIds, activeInstanceIds));
    const hasHoveredDescendant = hasDescendantState(g.children, child => isGroupHovered(child, matchId, hoveredGroupId, hoveredInstanceId));

    const isDimmed = hasAnySelection && !isEffectivelyActive && !hasActiveDescendant && !isHovered && !hasHoveredDescendant;
    const classes = getGroupColorClasses(g.group_id, isEffectivelyActive || isHovered, isDimmed);
    const layerClass = getGroupLayerClass(isHovered, hasHoveredDescendant, isEffectivelyActive, hasActiveDescendant, isDimmed);

    elements.push(
      <span key={`group-${g.group_id}-${g.start}`} data-match-id={matchId} data-group-id={g.group_id} data-instance-id={instanceId} className={`relative transition-all duration-300 rounded-sm cursor-pointer ${layerClass} ${classes}`}>
        <MatchNode text={text} start={g.start} end={g.end} groups={g.children} matchId={matchId} activeGroupIds={activeGroupIds} activeInstanceIds={activeInstanceIds} hasAnySelection={hasAnySelection} hoveredGroupId={hoveredGroupId} hoveredInstanceId={hoveredInstanceId} />
      </span>
    );
    lastIdx = g.end;
  });

  if (lastIdx < end) elements.push(<span key={`text-end`}>{renderTextWithTooltips(text.slice(lastIdx, end))}</span>);
  return <>{elements}</>;
};

const matchColor = {
  base: 'bg-emerald-500/15 ring-1 ring-inset ring-emerald-400/40 text-emerald-900 dark:bg-[#34D399]/15 dark:ring-[#34D399]/30 dark:text-[#34D399] box-decoration-clone',
  active: 'bg-emerald-500/40 ring-2 ring-inset ring-emerald-500 text-emerald-950 dark:bg-[#34D399]/30 dark:ring-[#34D399]/60 dark:text-[#FFFFFF] dark:shadow-[0_0_8px_rgba(52,211,153,0.4)] z-10 relative box-decoration-clone'
};

export const SubjectEditor: React.FC = () => {
  const text = useRegexStore(state => state.text);
  const setText = useRegexStore(state => state.setText);
  const matches = useRegexStore(state => state.matches);
  const optimizedMatches = useRegexStore(state => state.optimizedMatches);

  const originalSelection = useSelectionStore();
  const optimizedSelection = useOptimizedSelectionStore();

  const optimizationProposal = useLLMStore(state => state.optimizationProposal);

  const sharedClasses = "font-mono text-sm leading-snug p-3 m-0 border-none outline-none whitespace-pre-wrap break-all box-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [font-variant-ligatures:none]";

  const overlayRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const optOverlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (/[^\x00-\x7F]/.test(text)) {
      const escaped = text.replace(/[^\x00-\x7F]/g, char => `\\u${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`);
      setText(escaped);
    }
  }, [text, setText]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (overlayRef.current) {
      overlayRef.current.scrollTop = e.currentTarget.scrollTop;
      overlayRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
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
            originalSelection.handleHover(matchId ? Number(matchId) : null, groupId ? Number(groupId) : null, instanceId || null);
            return;
          }
        }
      }
      originalSelection.handleHover(null, null, null);
    } finally {
      if (textareaRef.current) textareaRef.current.style.pointerEvents = 'auto';
    }
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLTextAreaElement | HTMLDivElement>) => {
    const target = e.currentTarget as HTMLTextAreaElement;
    if (target.selectionStart !== target.selectionEnd) {
        originalSelection.handleSelection(null, null, null, false);
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
            originalSelection.handleSelection(matchId ? Number(matchId) : null, groupId ? Number(groupId) : null, instanceId || null, e.ctrlKey || e.metaKey);
            return;
          }
        }
      }
      originalSelection.handleSelection(null, null, null, false);
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
          optimizedSelection.handleHover(matchId ? Number(matchId) : null, groupId ? Number(groupId) : null, instanceId || null);
          return;
        }
      }
    }
    optimizedSelection.handleHover(null, null, null);
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
          optimizedSelection.handleSelection(matchId ? Number(matchId) : null, groupId ? Number(groupId) : null, instanceId || null, e.ctrlKey || e.metaKey);
          return;
        }
      }
    }
    optimizedSelection.handleSelection(null, null, null, false);
  };

  const renderMatchesOverlay = (matchesList: any[], sel: any) => {
    const hasAnySelection = sel.activeMatchIds.length > 0 || sel.activeGroupIds.length > 0 || sel.activeInstanceIds.length > 0;
    if (matchesList.length === 0) return null;

    let lastIdx = 0;
    const elements = [];

    [...matchesList].sort((a, b) => a.start - b.start).forEach((m, i) => {
        if (m.start > lastIdx) elements.push(<span key={`text-${i}`}>{renderTextWithTooltips(text.slice(lastIdx, m.start))}</span>);

        const isMatchActive = sel.activeMatchIds.includes(m.match_id);
        const isMatchHovered = sel.hoveredMatchId === m.match_id && sel.hoveredGroupId === null;

        const isRelatedGroupActive = m.groups.some((g: any) => {
            if (sel.activeInstanceIds.length > 0) return sel.activeInstanceIds.includes(`m${m.match_id}-g${g.group_id}-${g.start}`);
            return sel.activeGroupIds.includes(g.group_id);
        });

        const isRelatedGroupHovered = m.groups.some((g: any) => {
            if (sel.hoveredInstanceId) return sel.hoveredInstanceId === `m${m.match_id}-g${g.group_id}-${g.start}`;
            return sel.hoveredGroupId === g.group_id;
        });

        const isEffectivelyDimmed = hasAnySelection && !isMatchActive && !isRelatedGroupActive && !isMatchHovered && !isRelatedGroupHovered;
        const layerClass = isMatchHovered ? '!z-50' : (isRelatedGroupHovered ? '!z-40' : (isMatchActive ? 'z-40' : (isRelatedGroupActive ? 'z-30' : (isEffectivelyDimmed ? 'z-0' : 'z-10 hover:z-20'))));
        const matchBaseClass = isMatchActive || isMatchHovered ? matchColor.active : matchColor.base;
        const dimEffect = isEffectivelyDimmed ? 'opacity-35 saturate-[0.7]' : 'opacity-100';

        elements.push(
            <span key={`match-${m.match_id}`} data-match-id={m.match_id} className={`relative rounded-sm transition-all duration-300 cursor-pointer ${matchBaseClass} ${layerClass} ${dimEffect}`}>
            <MatchNode text={text} start={m.start} end={m.end} groups={m.groups} matchId={m.match_id} activeGroupIds={sel.activeGroupIds} activeInstanceIds={sel.activeInstanceIds} hasAnySelection={hasAnySelection} hoveredGroupId={sel.hoveredGroupId} hoveredInstanceId={sel.hoveredInstanceId} />
            </span>
        );
        lastIdx = m.end;
    });
    if (lastIdx < text.length) elements.push(<span key={`text-end`}>{renderTextWithTooltips(text.slice(lastIdx))}</span>);
    if (text.endsWith('\n')) elements.push(<br key="trailing-br" />);
    return elements;
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
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="relative flex-1 min-h-[80px]" onMouseMove={handleMouseMove} onMouseLeave={() => originalSelection.handleHover(null, null, null)}>
          <div ref={overlayRef} className={`absolute inset-0 overflow-y-auto z-0 isolate pointer-events-auto text-ide-text ${sharedClasses}`}>
            {renderMatchesOverlay(matches, originalSelection)}
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

        {optimizationProposal && (
            <div className="flex flex-col flex-1 min-h-[80px] border-t border-purple-500/20 bg-purple-500/5 z-10 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
                <div className="flex items-center px-3 py-1 bg-purple-500/10 border-b border-purple-500/10 shrink-0">
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                        Optimized Matches ({optimizedMatches.length})
                    </span>
                </div>
                <div className="relative flex-1" onMouseMove={handleOptMouseMove} onClick={handleOptClick} onMouseLeave={() => optimizedSelection.handleHover(null, null, null)}>
                    <div ref={optOverlayRef} className={`absolute inset-0 overflow-y-auto z-0 isolate pointer-events-auto text-ide-text cursor-default ${sharedClasses}`}>
                        {renderMatchesOverlay(optimizedMatches, optimizedSelection)}
                        {optimizedMatches.length === 0 && <span>{text}</span>}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};