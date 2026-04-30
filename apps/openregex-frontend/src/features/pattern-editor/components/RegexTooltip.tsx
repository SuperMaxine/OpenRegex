import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface RegexTooltipProps {
  targetRef: React.RefObject<HTMLElement | null>;
  token: string;
  description: string;
  isVisible: boolean;
}

export const RegexTooltip: React.FC<RegexTooltipProps> = ({
  targetRef,
  token,
  description,
  isVisible
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({ opacity: 0, pointerEvents: 'none' });

  useEffect(() => {
    if (isVisible && description && targetRef.current) {
      const updatePos = () => {
        if (!targetRef.current || !tooltipRef.current) return;

        const targetRect = targetRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();

        // Position above the token with slightly more gap
        let top = targetRect.top - tooltipRect.height - 8;
        let left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);

        // Boundary constraint: Top of window
        if (top < 8) {
          top = targetRect.bottom + 8;
        }

        // Boundary constraint: Horizontal edges
        if (left < 8) {
          left = 8;
        } else if (left + tooltipRect.width > window.innerWidth - 8) {
          left = window.innerWidth - tooltipRect.width - 8;
        }

        setTooltipStyle({
          top: `${top}px`,
          left: `${left}px`,
          opacity: 1,
          transition: 'opacity 150ms ease-in-out',
          position: 'fixed',
          zIndex: 99999,
          pointerEvents: 'none'
        });
      };

      setTooltipStyle({
        top: '0px',
        left: '0px',
        opacity: 0,
        position: 'fixed',
        zIndex: -1,
        pointerEvents: 'none'
      });

      const timer = requestAnimationFrame(() => {
        updatePos();
      });

      window.addEventListener('resize', updatePos);
      document.addEventListener('scroll', updatePos, true);

      return () => {
        cancelAnimationFrame(timer);
        window.removeEventListener('resize', updatePos);
        document.removeEventListener('scroll', updatePos, true);
      };
    } else {
      setTooltipStyle({ opacity: 0, pointerEvents: 'none' });
    }
  }, [isVisible, description, targetRef]);

  if (!isVisible || !description || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={tooltipRef}
      style={tooltipStyle}
      // Increased blur, lowered bg opacity, and frosted borders
      className="flex items-stretch bg-white/30 dark:bg-[#121216]/40 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.15)] rounded-lg overflow-hidden w-max max-w-[320px]"
    >
      <span className="flex items-center justify-center bg-white/40 dark:bg-black/30 text-theme-primary font-mono font-black px-3 py-2 border-r border-white/40 dark:border-white/5 text-[12px] shrink-0 whitespace-nowrap drop-shadow-sm">
        {token}
      </span>
      <span className="flex items-center text-theme-text px-3 py-2 text-[11.5px] font-medium leading-relaxed whitespace-normal text-left drop-shadow-sm">
        {description}
      </span>
    </div>,
    document.body
  );
};