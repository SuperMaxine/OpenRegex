import React, { useRef } from 'react';
import { MatchGroup } from '../../../core/types';
import { getGroupColorClasses } from '../../../shared/utils/colors';
import { useRegexStore } from '../../../core/store/useRegexStore';
import { useOptimizedSelectionStore } from '../../../core/store/useOptimizedSelectionStore';

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
    if (g.start > lastIdx) {
      elements.push(<span key={`text-${i}`}>{renderTextWithTooltips(text.slice(lastIdx, g.start))}</span>);
    }

    const instanceId = getInstanceId(matchId, g);
    const isEffectivelyActive = isGroupActive(g, matchId, activeGroupIds, activeInstanceIds);
    const isHovered = isGroupHovered(g, matchId, hoveredGroupId, hoveredInstanceId);
    const hasActiveDescendant = hasDescendantState(g.children, child => isGroupActive(child, matchId, activeGroupIds, activeInstanceIds));
    const hasHoveredDescendant = hasDescendantState(g.children, child => isGroupHovered(child, matchId, hoveredGroupId, hoveredInstanceId));

    const isDimmed = hasAnySelection && !isEffectivelyActive && !hasActiveDescendant && !isHovered && !hasHoveredDescendant;
    const classes = getGroupColorClasses(g.group_id, isEffectivelyActive || isHovered, isDimmed);
    const layerClass = getGroupLayerClass(isHovered, hasHoveredDescendant, isEffectivelyActive, hasActiveDescendant, isDimmed);

    elements.push(
      <span
        key={`group-${g.group_id}-${g.start}`}
        data-match-id={matchId}
        data-group-id={g.group_id}
        data-instance-id={instanceId}
        className={`relative transition-all duration-300 rounded-sm cursor-pointer ${layerClass} ${classes}`}
      >
        <MatchNode
          text={text} start={g.start} end={g.end} groups={g.children} matchId={matchId}
          activeGroupIds={activeGroupIds} activeInstanceIds={activeInstanceIds} hasAnySelection={hasAnySelection}
          hoveredGroupId={hoveredGroupId} hoveredInstanceId={hoveredInstanceId}
        />
      </span>
    );
    lastIdx = g.end;
  });

  if (lastIdx < end) {
    elements.push(<span key={`text-end`}>{renderTextWithTooltips(text.slice(lastIdx, end))}</span>);
  }

  return <>{elements}</>;
};

const matchColor = {
  base: 'bg-emerald-500/15 ring-1 ring-inset ring-emerald-400/40 text-emerald-900 dark:bg-[#34D399]/15 dark:ring-[#34D399]/30 dark:text-[#34D399] box-decoration-clone',
  active: 'bg-emerald-500/40 ring-2 ring-inset ring-emerald-500 text-emerald-950 dark:bg-[#34D399]/30 dark:ring-[#34D399]/60 dark:text-[#FFFFFF] dark:shadow-[0_0_8px_rgba(52,211,153,0.4)] z-10 relative box-decoration-clone'
};

export const OptimizedSubjectEditor: React.FC = () => {
  const text = useRegexStore(state => state.text);
  const optimizedMatches = useRegexStore(state => state.optimizedMatches);

  const activeMatchIds = useOptimizedSelectionStore(state => state.activeMatchIds);
  const activeGroupIds = useOptimizedSelectionStore(state => state.activeGroupIds);
  const activeInstanceIds = useOptimizedSelectionStore(state => state.activeInstanceIds);
  const hoveredMatchId = useOptimizedSelectionStore(state => state.hoveredMatchId);
  const hoveredGroupId = useOptimizedSelectionStore(state => state.hoveredGroupId);
  const hoveredInstanceId = useOptimizedSelectionStore(state => state.hoveredInstanceId);
  const handleSelection = useOptimizedSelectionStore(state => state.handleSelection);
  const handleHover = useOptimizedSelectionStore(state => state.handleHover);

  const sharedClasses = "font-mono text-sm leading-snug p-4 m-0 border-none outline-none whitespace-pre-wrap break-all box-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [font-variant-ligatures:none]";

  const overlayRef = useRef<HTMLDivElement>(null);
  const displayMatches = optimizedMatches;
  const hasAnySelection = activeMatchIds.length > 0 || activeGroupIds.length > 0 || activeInstanceIds.length > 0;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!overlayRef.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;

    if (el) {
      const targetEl = el.closest('[data-match-id], [data-group-id], [data-instance-id]');

      if (targetEl) {
        const groupId = targetEl.getAttribute('data-group-id');
        const instanceId = targetEl.getAttribute('data-instance-id');
        const matchId = groupId ? null : targetEl.getAttribute('data-match-id');

        if (matchId || groupId || instanceId) {
          handleHover(
            matchId ? Number(matchId) : null,
            groupId ? Number(groupId) : null,
            instanceId || null
          );
          return;
        }
      }
    }
    handleHover(null, null, null);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!overlayRef.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;

    if (el) {
      const targetEl = el.closest('[data-match-id], [data-group-id], [data-instance-id]');

      if (targetEl) {
        const groupId = targetEl.getAttribute('data-group-id');
        const instanceId = targetEl.getAttribute('data-instance-id');
        const matchId = groupId ? null : targetEl.getAttribute('data-match-id');

        if (matchId || groupId || instanceId) {
          handleSelection(
            matchId ? Number(matchId) : null,
            groupId ? Number(groupId) : null,
            instanceId || null,
            e.ctrlKey || e.metaKey
          );
          return;
        }
      }
    }
    handleSelection(null, null, null, false);
  };

  return (
    <div
      className="flex flex-col h-full w-full cursor-default"
      onMouseLeave={() => handleHover(null, null, null)}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      <div className="relative w-full h-full flex-1 bg-transparent">
        <div
          ref={overlayRef}
          className={`absolute inset-0 w-full h-full overflow-y-auto text-ide-text z-0 isolate pointer-events-auto ${sharedClasses}`}
        >
          {displayMatches.length > 0 && (
            <>{
              (() => {
                let lastIdx = 0;
                const elements = [];
                [...displayMatches].sort((a, b) => a.start - b.start).forEach((m, i) => {
                  if (m.start > lastIdx) elements.push(<span key={`text-${i}`}>{renderTextWithTooltips(text.slice(lastIdx, m.start))}</span>);

                  const isMatchActive = activeMatchIds.includes(m.match_id);
                  const isMatchHovered = hoveredMatchId === m.match_id && hoveredGroupId === null;

                  const isRelatedGroupActive = m.groups.some(g => {
                    if (activeInstanceIds.length > 0) return activeInstanceIds.includes(`m${m.match_id}-g${g.group_id}-${g.start}`);
                    return activeGroupIds.includes(g.group_id);
                  });

                  const isRelatedGroupHovered = m.groups.some(g => {
                    if (hoveredInstanceId) return hoveredInstanceId === `m${m.match_id}-g${g.group_id}-${g.start}`;
                    return hoveredGroupId === g.group_id;
                  });

                  const isEffectivelyDimmed = hasAnySelection && !isMatchActive && !isRelatedGroupActive && !isMatchHovered && !isRelatedGroupHovered;
                  const layerClass = isMatchHovered ? '!z-50' : (isRelatedGroupHovered ? '!z-40' : (isMatchActive ? 'z-40' : (isRelatedGroupActive ? 'z-30' : (isEffectivelyDimmed ? 'z-0' : 'z-10 hover:z-20'))));

                  const matchBaseClass = isMatchActive || isMatchHovered ? matchColor.active : matchColor.base;
                  const dimEffect = isEffectivelyDimmed ? 'opacity-35 saturate-[0.7]' : 'opacity-100';

                  elements.push(
                    <span
                      key={`match-${m.match_id}`}
                      data-match-id={m.match_id}
                      className={`relative rounded-sm transition-all duration-300 cursor-pointer ${matchBaseClass} ${layerClass} ${dimEffect}`}
                    >
                      <MatchNode
                        text={text} start={m.start} end={m.end} groups={m.groups} matchId={m.match_id}
                        activeGroupIds={activeGroupIds} activeInstanceIds={activeInstanceIds}
                        hasAnySelection={hasAnySelection} hoveredGroupId={hoveredGroupId} hoveredInstanceId={hoveredInstanceId}
                      />
                    </span>
                  );
                  lastIdx = m.end;
                });
                if (lastIdx < text.length) elements.push(<span key={`text-end`}>{renderTextWithTooltips(text.slice(lastIdx))}</span>);
                if (text.endsWith('\n')) elements.push(<br key="trailing-br" />);
                return elements;
              })()
            }</>
          )}
          {displayMatches.length === 0 && <span>{text}</span>}
        </div>
      </div>
    </div>
  );
};