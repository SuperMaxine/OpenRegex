import React, { useRef, useEffect } from 'react';
import { MatchItem } from '../../../core/types';

interface DocumentMinimapProps {
  isMinimapOpen: boolean;
  text: string;
  matches: MatchItem[];
  overlayRef: React.RefObject<HTMLDivElement>;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  activeMatchSet?: Set<number>;
  activeGroupSet?: Set<number>;
  activeInstanceSet?: Set<string>;
}

export const DocumentMinimap: React.FC<DocumentMinimapProps> = ({
  isMinimapOpen,
  text,
  matches,
  overlayRef,
  textareaRef,
  activeMatchSet,
  activeGroupSet,
  activeInstanceSet
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
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

      const lineStarts: number[] = [];
      let curr = 0;
      for (const line of lines) {
        lineStarts.push(curr);
        curr += line.length + 1; // +1 for the \n
      }

      const getLineIndex = (charIndex: number) => {
        for (let i = 0; i < lineStarts.length; i++) {
          if (i === lineStarts.length - 1) return i;
          if (charIndex >= lineStarts[i] && charIndex < lineStarts[i + 1]) return i;
        }
        return 0;
      };

      // 1. Draw text representation (subtle grey lines)
      ctx.fillStyle = 'rgba(120, 120, 120, 0.25)';
      lines.forEach((line, i) => {
        const lw = Math.min(canvas.width - 4, (line.length / 80) * (canvas.width - 4));
        if (lw > 0) {
          ctx.fillRect(2, i * lineHeight, lw, Math.max(1, lineHeight - 0.5));
        }
      });

      // 2. Draw match highlights (emerald green, matching the editor)
      ctx.fillStyle = 'rgba(52, 211, 153, 0.6)';
      matches.forEach(m => {
        const startLine = getLineIndex(m.start);
        const endLine = getLineIndex(m.end);

        for (let i = startLine; i <= endLine; i++) {
          const lineStartIdx = lineStarts[i];
          const lineLen = lines[i].length;

          const matchStartInLine = Math.max(0, m.start - lineStartIdx);
          const matchEndInLine = Math.min(lineLen, m.end - lineStartIdx);

          if (matchStartInLine < matchEndInLine) {
            const startX = 2 + (matchStartInLine / 80) * (canvas.width - 4);
            const w = ((matchEndInLine - matchStartInLine) / 80) * (canvas.width - 4);
            ctx.fillRect(startX, i * lineHeight, Math.max(2, w), Math.max(1, lineHeight));
          } else if (matchStartInLine === matchEndInLine && m.start === m.end) {
            // Zero-length match (e.g., boundary matches)
            const startX = 2 + (matchStartInLine / 80) * (canvas.width - 4);
            ctx.fillRect(startX, i * lineHeight, 2, Math.max(1, lineHeight));
          }
        }
      });

      // 3. Draw active selections (bright cyan)
      if (activeMatchSet?.size || activeGroupSet?.size || activeInstanceSet?.size) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.95)';
        matches.forEach(m => {
          const isMatchActive = activeMatchSet?.has(m.match_id);
          const activeGroups = m.groups.filter(g =>
            (activeInstanceSet && activeInstanceSet.size > 0)
              ? activeInstanceSet.has(`m${m.match_id}-g${g.group_id}-${g.start}`)
              : activeGroupSet?.has(g.group_id)
          );

          if (isMatchActive || activeGroups.length > 0) {
            const segmentsToDraw = isMatchActive ? [{ start: m.start, end: m.end }] : activeGroups;

            segmentsToDraw.forEach(seg => {
              const startLine = getLineIndex(seg.start);
              const endLine = getLineIndex(seg.end);

              for (let i = startLine; i <= endLine; i++) {
                const lineStartIdx = lineStarts[i];
                const lineLen = lines[i].length;
                const matchStartInLine = Math.max(0, seg.start - lineStartIdx);
                const matchEndInLine = Math.min(lineLen, seg.end - lineStartIdx);

                if (matchStartInLine < matchEndInLine) {
                  const startX = 2 + (matchStartInLine / 80) * (canvas.width - 4);
                  const w = ((matchEndInLine - matchStartInLine) / 80) * (canvas.width - 4);
                  // Draw slightly taller and wider for emphasis
                  ctx.fillRect(startX - 1, (i * lineHeight) - 0.5, Math.max(3, w + 2), Math.max(2, lineHeight + 1));
                } else if (matchStartInLine === matchEndInLine && seg.start === seg.end) {
                  const startX = 2 + (matchStartInLine / 80) * (canvas.width - 4);
                  ctx.fillRect(startX - 1, (i * lineHeight) - 0.5, 4, Math.max(2, lineHeight + 1));
                }
              }
            });
          }
        });
      }

      // 4. Draw viewport bounding box
      const scrollRatio = container.scrollTop / container.scrollHeight;
      const viewportRatio = container.clientHeight / container.scrollHeight;
      const viewY = scrollRatio * canvas.height;
      const viewH = Math.max(10, viewportRatio * canvas.height);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(0, viewY, canvas.width, viewH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, viewY + 0.5, canvas.width - 1, viewH - 1);

      // 5. Draw exact current line indicator (Cursor position)
      if (textareaRef?.current) {
        const cursorIdx = textareaRef.current.selectionStart;
        if (typeof cursorIdx === 'number') {
          const currentLine = getLineIndex(cursorIdx);
          const cursorY = currentLine * lineHeight;

          // Vibrant theme-primary color to easily spot the current line
          ctx.fillStyle = 'rgba(236, 72, 153, 0.85)';

          // Horizontal line spanning the minimap
          ctx.fillRect(0, cursorY, canvas.width, Math.max(1.5, lineHeight));

          // Small pointer arrow on the left edge for extra visibility
          ctx.beginPath();
          ctx.moveTo(0, cursorY - 2);
          ctx.lineTo(4, cursorY + (lineHeight / 2));
          ctx.lineTo(0, cursorY + lineHeight + 2);
          ctx.fill();
        }
      }
    };

    let rafId: number;
    const handleUpdate = () => {
      if (isMinimapOpen) rafId = requestAnimationFrame(updateMinimap);
    };

    updateMinimap();
    window.addEventListener('resize', updateMinimap);

    const overlay = overlayRef.current;
    if (overlay) overlay.addEventListener('scroll', handleUpdate, { passive: true });

    const textarea = textareaRef?.current;
    if (textarea) {
      textarea.addEventListener('click', handleUpdate, { passive: true });
      textarea.addEventListener('keyup', handleUpdate, { passive: true });
      textarea.addEventListener('focus', handleUpdate, { passive: true });
    }

    return () => {
      window.removeEventListener('resize', updateMinimap);
      if (overlay) overlay.removeEventListener('scroll', handleUpdate);
      if (textarea) {
        textarea.removeEventListener('click', handleUpdate);
        textarea.removeEventListener('keyup', handleUpdate);
        textarea.removeEventListener('focus', handleUpdate);
      }
      cancelAnimationFrame(rafId);
    };
  }, [isMinimapOpen, text, matches, overlayRef, textareaRef, activeMatchSet, activeGroupSet, activeInstanceSet]);

  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !overlayRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const ratio = y / rect.height;
    overlayRef.current.scrollTop = ratio * overlayRef.current.scrollHeight - (overlayRef.current.clientHeight / 2);
  };

  if (!isMinimapOpen) return null;

  return (
    <div className="absolute right-4 top-4 w-16 h-[calc(100%-2rem)] bg-[#1e1e24]/80 dark:bg-[#0a0a0c]/80 backdrop-blur-md border border-theme-border rounded-lg shadow-xl overflow-hidden z-[100]">
      <canvas
        ref={canvasRef}
        onClick={handleMinimapClick}
        className="w-full h-full cursor-pointer"
      />
    </div>
  );
};