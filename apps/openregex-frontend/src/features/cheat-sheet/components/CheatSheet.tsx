import React from 'react';
import { useRegexStore } from '../../../core/store/useRegexStore';
import { useSelectionStore } from '../../../core/store/useSelectionStore';
import { isCheatSheetItemHovered } from '../../../shared/utils/hoverMatcher';

export const CheatSheet: React.FC = () => {
  const { engines, selectedEngineId } = useRegexStore();
  const { hoveredToken, activeToken, handleSelection, handleHover } = useSelectionStore();

  const activeEngine = engines.find(e => e.engine_id === selectedEngineId);
  if (!activeEngine) return null;

  return (
    <div className="w-full bg-black/5 dark:bg-black/20 rounded-[16px] p-2 overflow-y-auto max-h-[350px] h-full custom-scrollbar relative">
      {activeEngine.engine_cheat_sheet && activeEngine.engine_cheat_sheet.length > 0 ? (
        <div className="columns-1 md:columns-2 xl:columns-3 gap-4">
          {activeEngine.engine_cheat_sheet.map((category) => (
            <div key={category.category} className="break-inside-avoid mb-1.5 flex flex-col relative">
              <h3 className="flex items-center text-[9px] font-black text-theme-muted uppercase tracking-widest mb-1 border-b border-black/10 dark:border-white/10 pb-0.5 py-0.5">
                <span className="text-theme-primary mr-1.5 opacity-80">//</span>
                {category.category}
              </h3>
              <div className="grid grid-cols-[max-content_1fr] gap-x-2 gap-y-0 items-baseline">
                {category.items?.map((item: any, idx: number) => {

                  const isHovered = isCheatSheetItemHovered(hoveredToken, item.character);
                  const isActive = isCheatSheetItemHovered(activeToken, item.character);
                  const isHighlighted = isHovered || isActive;

                  const handleInteract = () => handleSelection(null, null, null, false, isActive ? null : item.character);
                  const handleEnter = () => handleHover(null, null, null, item.character);
                  const handleLeave = () => handleHover(null, null, null, null);

                  return (
                    <React.Fragment key={idx}>
                      <span
                        onClick={handleInteract} onMouseEnter={handleEnter} onMouseLeave={handleLeave}
                        className={`px-1 py-px rounded text-[8.5px] font-mono whitespace-nowrap justify-self-end text-right shadow-sm my-0.5 transition-all duration-200 cursor-pointer ${
                        isHighlighted 
                          ? 'z-10 bg-theme-primary/20 !text-theme-primary ring-1 ring-theme-primary/50 font-black dark:bg-theme-primary/15 dark:!text-theme-primary dark:ring-1 dark:ring-theme-primary/40 dark:font-bold' 
                          : 'text-theme-primary bg-theme-primary/10 font-bold hover:bg-theme-primary/15'
                      }`}>
                        {item.character}
                      </span>
                      <span
                        onClick={handleInteract} onMouseEnter={handleEnter} onMouseLeave={handleLeave}
                        className={`text-[8.5px] leading-tight transition-colors cursor-pointer ${
                        isHighlighted 
                          ? '!text-theme-primary font-bold dark:font-medium' 
                          : 'text-theme-text/80 font-medium hover:text-theme-text'
                      }`}>
                        {item.description}
                      </span>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-theme-muted font-mono italic text-center py-2">
          No cheat sheet available for this engine.
        </div>
      )}
    </div>
  );
};