import React from 'react';
import { Logo } from '../../shared/ui/Logo';
import { EnginePanel } from '../../features/engine-selector';
import { BookText, Bookmark } from 'lucide-react';
import { useUIStore } from '../../core/store/useUIStore';
import { useTheme } from '../../shared/hooks/useTheme';

export const Header: React.FC = () => {
  const { isCheatSheetOpen, toggleCheatSheet, isPersonalOpen, togglePersonal } = useUIStore();

  // Initialize and enforce dark mode class on the document root
  useTheme();

  return (
    <header className="flex flex-col md:flex-row justify-between items-center md:items-stretch z-30 h-auto md:h-[80px] relative gap-3 md:gap-4 w-full pb-1 md:pb-0">

      <div className="w-full md:w-auto md:flex-1 flex justify-center md:justify-start h-auto min-h-[64px] md:min-h-0 md:h-full order-2 md:order-1 relative z-50">
        <div className="glass-panel rounded-[24px] px-5 py-2.5 md:py-2 flex items-center justify-center shadow-lg border-theme-border h-full w-full md:w-auto">
          <EnginePanel />
        </div>
      </div>

      <div className="w-full md:w-auto flex-none flex items-center justify-center h-[56px] md:h-full order-1 md:order-2">
        <div className="glass-panel rounded-[28px] px-10 flex items-center justify-center shadow-xl border-theme-border h-full w-full md:w-auto">
          <a
            href="https://openregex.com"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-transform hover:scale-105"
          >
            <Logo
              variant="horizontal"
              nameHeight={32}
              size={32}
              className="drop-shadow-2xl"
            />
          </a>
        </div>
      </div>

      <div className="w-full md:w-auto md:flex-1 flex justify-center md:justify-end h-[64px] md:h-full order-3 md:order-3">
        {/* Removed nested dark pill. Buttons sit directly on the glass-panel for a unified theme. */}
        <div className="glass-panel rounded-[24px] p-1.5 flex items-center justify-center gap-1 shadow-lg border-theme-border h-full w-full md:w-auto">

          <button
            onClick={toggleCheatSheet}
            title="Cheat Sheet"
            className={`flex items-center gap-2 px-4 py-2 h-full text-[10px] font-bold uppercase tracking-widest rounded-[18px] transition-all duration-300 ${
              isCheatSheetOpen 
              ? 'bg-theme-primary/10 text-theme-primary shadow-sm' 
              : 'text-theme-muted hover:text-theme-text hover:bg-white/5'
            }`}
          >
            <BookText size={15} className={isCheatSheetOpen ? "opacity-100" : "opacity-70"} />
            Cheat Sheet
          </button>

          <div className="w-px h-5 bg-theme-border opacity-60 mx-0.5" />

          <button
            onClick={togglePersonal}
            title="Personal Regex"
            className={`flex items-center gap-2 px-4 py-2 h-full text-[10px] font-bold uppercase tracking-widest rounded-[18px] transition-all duration-300 ${
              isPersonalOpen 
              ? 'bg-indigo-500/10 text-indigo-400 shadow-sm' 
              : 'text-theme-muted hover:text-theme-text hover:bg-white/5'
            }`}
          >
            <Bookmark size={15} className={isPersonalOpen ? "opacity-100" : "opacity-70"} />
            Personal
          </button>

        </div>
      </div>

    </header>
  );
};