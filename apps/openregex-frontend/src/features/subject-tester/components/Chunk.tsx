import React, { useRef, useState, useEffect, memo, useMemo } from 'react';
import { getGroupColorClasses } from '../../../shared/utils/colors';
import { Segment, renderTextWithTooltips } from '../utils/segment.utils';
import { MATCH_COLOR } from './SubjectEditor/constants';

interface ChunkProps {
  segments: Segment[];
  selectionState: any;
  rootRef: React.RefObject<HTMLDivElement>;
}

export const Chunk = memo(({ segments, selectionState, rootRef }: ChunkProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, { root: rootRef.current, rootMargin: '600px' });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [rootRef]);

  const chunkData = useMemo(() => {
    const mIds = new Set<number>();
    const gIds = new Set<number>();
    const iIds = new Set<string>();
    segments.forEach(seg => {
      seg.markers.forEach(m => {
        mIds.add(m.matchId);
        if (m.groupId !== undefined) gIds.add(m.groupId);
        if (m.instanceId) iIds.add(m.instanceId);
      });
    });
    return {
      matches: Array.from(mIds).join(' '),
      groups: Array.from(gIds).join(' '),
      instances: Array.from(iIds).join(' ')
    };
  }, [segments]);

  if (!isVisible) {
    return (
      <span
        ref={ref}
        data-chunk-matches={chunkData.matches}
        data-chunk-groups={chunkData.groups}
        data-chunk-instances={chunkData.instances}
      >
        {segments.map(s => s.textSlice).join('')}
      </span>
    );
  }

  const { activeMatchSet, activeGroupSet, activeInstanceSet, hoveredMatchId, hoveredGroupId, hoveredInstanceId, hasAnySelection } = selectionState;

  return (
    <span
      ref={ref}
      data-chunk-matches={chunkData.matches}
      data-chunk-groups={chunkData.groups}
      data-chunk-instances={chunkData.instances}
    >
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
          colorClasses = (isActive || isHover) ? MATCH_COLOR.active : MATCH_COLOR.base;
          if (isDimmed) colorClasses += ' opacity-35 saturate-[0.7]';
        } else {
          colorClasses = getGroupColorClasses(topMarker.groupId!, isActive || isHover, isDimmed);
        }

        // Attach all potential nested IDs for the exactSelector to find them via CSS ~=
        const matchIds = Array.from(new Set(seg.markers.map(m => m.matchId))).join(' ');
        const groupIds = Array.from(new Set(seg.markers.map(m => m.groupId).filter(Boolean))).join(' ');
        const instanceIds = Array.from(new Set(seg.markers.map(m => m.instanceId).filter(Boolean))).join(' ');

        return (
          <span
            key={i}
            data-match-id={topMarker.matchId}
            data-group-id={topMarker.groupId}
            data-instance-id={topMarker.instanceId}
            data-match-ids={matchIds}
            data-group-ids={groupIds}
            data-instance-ids={instanceIds}
            className={`relative rounded-sm transition-colors duration-150 cursor-pointer ${colorClasses} ${layerClass}`}
          >
            {renderTextWithTooltips(seg.textSlice)}
          </span>
        );
      })}
    </span>
  );
});