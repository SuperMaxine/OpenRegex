import { useRef, useCallback } from 'react';

export const useSubjectInteractions = (
  handleHover: any,
  handleSelection: any,
  overlayRef: React.RefObject<HTMLDivElement>,
  textareaRef?: React.RefObject<HTMLTextAreaElement>
) => {
  const lastHoverRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  const scheduleHover = useCallback((mId: number | null, gId: number | null, iId: string | null) => {
    const nextKey = `${mId}-${gId}-${iId}`;
    if (lastHoverRef.current === nextKey) return;
    lastHoverRef.current = nextKey;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => handleHover(mId, gId, iId));
  }, [handleHover]);

  const withPointerEventsCheck = useCallback((callback: () => void) => {
    if (textareaRef?.current) textareaRef.current.style.pointerEvents = 'none';
    try {
      callback();
    } finally {
      if (textareaRef?.current) textareaRef.current.style.pointerEvents = 'auto';
    }
  }, [textareaRef]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!overlayRef.current) return;
    withPointerEventsCheck(() => {
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
    });
  }, [overlayRef, scheduleHover, withPointerEventsCheck]);

  const onClick = useCallback((e: React.MouseEvent<HTMLDivElement | HTMLTextAreaElement>) => {
    const target = e.currentTarget as HTMLTextAreaElement;
    if (target.tagName === 'TEXTAREA' && target.selectionStart !== target.selectionEnd) {
      handleSelection(null, null, null, false, null, null, 'subject');
      return;
    }

    if (!overlayRef.current) return;
    withPointerEventsCheck(() => {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
      if (el) {
        const targetEl = el.closest('[data-match-id], [data-group-id], [data-instance-id]');
        if (targetEl) {
          const groupId = targetEl.getAttribute('data-group-id');
          const instanceId = targetEl.getAttribute('data-instance-id');
          const matchId = groupId ? null : targetEl.getAttribute('data-match-id');
          if (matchId || groupId || instanceId) {
            handleSelection(matchId ? Number(matchId) : null, groupId ? Number(groupId) : null, instanceId || null, e.ctrlKey || e.metaKey, null, null, 'subject');
            return;
          }
        }
      }
      handleSelection(null, null, null, false, null, null, 'subject');
    });
  }, [overlayRef, handleSelection, withPointerEventsCheck]);

  const onMouseLeave = useCallback(() => {
    scheduleHover(null, null, null);
  }, [scheduleHover]);

  return { onMouseMove, onClick, onMouseLeave };
};