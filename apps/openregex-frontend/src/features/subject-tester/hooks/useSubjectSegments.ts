import { useMemo } from 'react';
import { MatchItem } from '../../../core/types';
import { buildSegments } from '../utils/segment.utils';
import { CHUNK_SIZE } from '../components/SubjectEditor/constants';

export const useSubjectSegments = (text: string, matches: MatchItem[]) => {
  const segments = useMemo(() => buildSegments(text, matches), [text, matches]);
  const chunks = useMemo(() => {
    const result = [];
    for (let i = 0; i < segments.length; i += CHUNK_SIZE) {
      result.push(segments.slice(i, i + CHUNK_SIZE));
    }
    return result;
  }, [segments]);

  return { segments, chunks };
};