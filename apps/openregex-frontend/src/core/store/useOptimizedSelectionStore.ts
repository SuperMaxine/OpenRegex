import { create } from 'zustand';
import { SelectionSource } from './useSelectionStore';

interface SelectionState {
  activeMatchIds: number[];
  activeGroupIds: number[];
  activeInstanceIds: string[];
  activeToken: string | null;
  activeTokenIndex: number | null;
  hoveredMatchId: number | null;
  hoveredGroupId: number | null;
  hoveredInstanceId: string | null;
  hoveredToken: string | null;
  hoveredTokenIndex: number | null;
  selectionSource: SelectionSource;
  handleSelection: (matchId: number | null, groupId: number | null, instanceId: string | null, multi?: boolean, token?: string | null, tokenIndex?: number | null, source?: SelectionSource) => void;
  handleHover: (matchId: number | null, groupId: number | null, instanceId: string | null, token?: string | null, tokenIndex?: number | null) => void;
  handleClearSelection: () => void;
}

export const useOptimizedSelectionStore = create<SelectionState>((set) => ({
  activeMatchIds: [],
  activeGroupIds: [],
  activeInstanceIds: [],
  activeToken: null,
  activeTokenIndex: null,
  hoveredMatchId: null,
  hoveredGroupId: null,
  hoveredInstanceId: null,
  hoveredToken: null,
  hoveredTokenIndex: null,
  selectionSource: null,

  handleSelection: (matchId, groupId, instanceId, multi = false, token = null, tokenIndex = null, source = null) => set((state) => {
    if (!multi) {
      const isSameToken = matchId === null && groupId === null && instanceId === null && token !== null && state.activeToken === token && state.activeTokenIndex === tokenIndex;

      return {
        activeMatchIds: matchId !== null ? [matchId] : [],
        activeGroupIds: groupId !== null ? [groupId] : [],
        activeInstanceIds: instanceId !== null ? [instanceId] : [],
        activeToken: isSameToken ? null : token,
        activeTokenIndex: isSameToken ? null : tokenIndex,
        selectionSource: source
      };
    }

    return {
      activeMatchIds: matchId !== null
        ? (state.activeMatchIds.includes(matchId) ? state.activeMatchIds.filter(id => id !== matchId) : [...state.activeMatchIds, matchId])
        : state.activeMatchIds,
      activeGroupIds: groupId !== null
        ? (state.activeGroupIds.includes(groupId) ? state.activeGroupIds.filter(id => id !== groupId) : [...state.activeGroupIds, groupId])
        : state.activeGroupIds,
      activeInstanceIds: instanceId !== null
        ? (state.activeInstanceIds.includes(instanceId) ? state.activeInstanceIds.filter(id => id !== instanceId) : [...state.activeInstanceIds, instanceId])
        : state.activeInstanceIds,
      activeToken: token !== null
        ? (state.activeToken === token && state.activeTokenIndex === tokenIndex ? null : token)
        : state.activeToken,
      activeTokenIndex: tokenIndex !== null
        ? (state.activeTokenIndex === tokenIndex && state.activeToken === token ? null : tokenIndex)
        : state.activeTokenIndex,
      selectionSource: source
    };
  }),

  handleHover: (matchId, groupId, instanceId, token = null, tokenIndex = null) => set({
    hoveredMatchId: matchId,
    hoveredGroupId: groupId,
    hoveredInstanceId: instanceId,
    hoveredToken: token,
    hoveredTokenIndex: tokenIndex
  }),

  handleClearSelection: () => set({
    activeMatchIds: [],
    activeGroupIds: [],
    activeInstanceIds: [],
    activeToken: null,
    activeTokenIndex: null,
    selectionSource: null
  })
}));

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      useOptimizedSelectionStore.getState().handleClearSelection();
    }
  });
}