import { useEffect, useRef } from 'react';

export const useScrollToSelection = (
  overlayRef: React.RefObject<HTMLDivElement>,
  textareaRef: React.RefObject<HTMLTextAreaElement> | undefined,
  activeMatchIds: number[],
  activeGroupIds: number[],
  activeInstanceIds: string[],
  selectionSource: string | null
) => {
  const scrollTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!overlayRef.current) return;

    // Only automatically scroll if the selection originated from the Inspector
    if (selectionSource !== 'inspector') return;

    let exactSelector: string | null = null;
    let chunkSelector: string | null = null;
    let currentTargetId: string | null = null;

    if (activeInstanceIds.length > 0) {
      const id = activeInstanceIds[activeInstanceIds.length - 1];
      exactSelector = `[data-instance-ids~="${id}"]`;
      chunkSelector = `[data-chunk-instances~="${id}"]`;
      currentTargetId = `instance-${id}`;
    } else if (activeGroupIds.length > 0) {
      const id = activeGroupIds[activeGroupIds.length - 1];
      exactSelector = `[data-group-ids~="${id}"]`;
      chunkSelector = `[data-chunk-groups~="${id}"]`;
      currentTargetId = `group-${id}`;
    } else if (activeMatchIds.length > 0) {
      const id = activeMatchIds[activeMatchIds.length - 1];
      exactSelector = `[data-match-ids~="${id}"]`;
      chunkSelector = `[data-chunk-matches~="${id}"]`;
      currentTargetId = `match-${id}`;
    }

    if (exactSelector && chunkSelector && currentTargetId) {
      scrollTargetRef.current = currentTargetId;

      const getAbsoluteOffsetTop = (el: HTMLElement, container: HTMLElement) => {
        let top = el.offsetTop;
        let curr = el.offsetParent as HTMLElement | null;
        while (curr && curr !== container && container.contains(curr)) {
          top += curr.offsetTop;
          curr = curr.offsetParent as HTMLElement | null;
        }
        return top;
      };

      const scrollToElement = (el: HTMLElement, container: HTMLElement) => {
        const elTop = getAbsoluteOffsetTop(el, container);
        const rects = el.getClientRects();
        const firstLineHeight = rects.length > 0 ? rects[0].height : 20;

        const targetScroll = elTop - (container.clientHeight / 2) + (firstLineHeight / 2);

        // We use 'auto' (instant) instead of 'smooth' to explicitly prevent the
        // textarea <-> overlay bidirectional scroll-sync loop from cancelling
        // the smooth scroll mid-animation (which causes the "just a few px" bug).
        container.scrollTo({ top: Math.max(0, targetScroll), behavior: 'auto' });
      };

      const container = overlayRef.current;
      let intervalId: ReturnType<typeof setInterval>;
      let attempts = 0;

      const tryScroll = (): boolean => {
        // Abort if the user selected a different item while we were polling
        if (scrollTargetRef.current !== currentTargetId) {
          return true; // Stop polling
        }

        const exactEl = container.querySelector(exactSelector!) as HTMLElement;
        if (exactEl) {
          scrollToElement(exactEl, container);
          return true; // Success, stop polling
        } else {
          // Force immediate un-animated scroll to the virtualized chunk to trigger IntersectionObserver
          const chunkEl = container.querySelector(chunkSelector!) as HTMLElement;
          if (chunkEl) {
            scrollToElement(chunkEl, container);
          }

          attempts++;
          if (attempts > 30) { // Timeout after 1.5s
            return true; // Give up, stop polling
          }
          return false; // Keep polling
        }
      };

      // Execute immediately, fallback to interval polling if exact element is virtualized
      if (!tryScroll()) {
        intervalId = setInterval(() => {
          if (tryScroll()) {
            clearInterval(intervalId);
          }
        }, 50);
      }

      return () => {
        if (intervalId) clearInterval(intervalId);
      };
    }
  }, [activeMatchIds, activeGroupIds, activeInstanceIds, overlayRef, selectionSource]);

  // Sync overlay scroll back to textarea to ensure smooth scrolling alignment
  useEffect(() => {
    if (!overlayRef.current || !textareaRef?.current) return;
    const overlay = overlayRef.current;
    const textarea = textareaRef.current;

    const handleOverlayScroll = () => {
      if (textarea.scrollTop !== overlay.scrollTop) {
        textarea.scrollTop = overlay.scrollTop;
      }
      if (textarea.scrollLeft !== overlay.scrollLeft) {
        textarea.scrollLeft = overlay.scrollLeft;
      }
    };

    overlay.addEventListener('scroll', handleOverlayScroll, { passive: true });
    return () => overlay.removeEventListener('scroll', handleOverlayScroll);
  }, [overlayRef, textareaRef]);
};