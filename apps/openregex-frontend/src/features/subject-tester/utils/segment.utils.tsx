import { MatchItem } from '../../../core/types';

export const renderTextWithTooltips = (textContent: string) => {
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

export interface SpanMarker {
  type: 'match' | 'group';
  start: number;
  end: number;
  matchId: number;
  groupId?: number;
  instanceId?: string;
}

export interface Segment {
  start: number;
  end: number;
  textSlice: string;
  markers: SpanMarker[];
}

export const buildSegments = (text: string, matches: MatchItem[]): Segment[] => {
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