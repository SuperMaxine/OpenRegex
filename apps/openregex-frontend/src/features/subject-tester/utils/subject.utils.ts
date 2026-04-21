import { MatchItem } from '../../../core/types';

/**
 * Maps Python code-point indices to JavaScript UTF-16 code-unit indices.
 * Resolves highlighting offsets caused by surrogate pairs (like emojis).
 */
export const mapPythonIndicesToJs = (text: string, matches: MatchItem[]): MatchItem[] => {
  if (!matches.length || !text) return matches;
  const indexMap = new Map<number, number>();
  let pyIdx = 0;
  let jsIdx = 0;
  while (jsIdx <= text.length) {
    indexMap.set(pyIdx, jsIdx);
    if (jsIdx < text.length) {
      const charCode = text.charCodeAt(jsIdx);
      if (charCode >= 0xD800 && charCode <= 0xDBFF) {
        jsIdx += 2;
      } else {
        jsIdx += 1;
      }
      pyIdx += 1;
    } else {
      break;
    }
  }

  return matches.map(m => ({
    ...m,
    start: indexMap.get(m.start) ?? m.start,
    end: indexMap.get(m.end) ?? m.end,
    groups: m.groups.map(g => ({
      ...g,
      start: indexMap.get(g.start) ?? g.start,
      end: indexMap.get(g.end) ?? g.end,
    }))
  }));
};