import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { CopyButton } from './CopyButton';
import { getInspectorColor } from '../../../shared/utils/colors';
import { MatchItem } from '../../../core/types';

interface InspectorMatchItemProps {
  match: MatchItem;
  index: number;
  uniqueId: string;
  prefix: string;
  activeSelection: any;
  isExpanded: boolean;
  toggleExpand: (id: string) => void;
}

const matchColor = {
  base: 'bg-emerald-500/15 ring-1 ring-inset ring-emerald-400/40 text-emerald-900 dark:bg-[#34D399]/15 dark:ring-[#34D399]/30 dark:text-[#34D399] box-decoration-clone',
  active: 'bg-emerald-500/40 ring-2 ring-inset ring-emerald-500 text-emerald-950 dark:bg-[#34D399]/30 dark:ring-[#34D399]/60 dark:text-[#FFFFFF] dark:shadow-[0_0_8px_rgba(52,211,153,0.4)] z-10 relative box-decoration-clone'
};

export const InspectorMatchItem: React.FC<InspectorMatchItemProps> = ({
  match: m,
  index,
  uniqueId,
  prefix,
  activeSelection,
  isExpanded,
  toggleExpand
}) => {
  const isMatchActive = activeSelection.activeMatchIds.includes(m.match_id);
  const isMatchHovered = activeSelection.hoveredMatchId === m.match_id && activeSelection.hoveredGroupId === null;

  return (
    <div
      data-inspector-match-id={m.match_id}
      onClick={(e) => activeSelection.handleSelection(m.match_id, null, null, e.ctrlKey || e.metaKey)}
      onMouseOver={(e) => { e.stopPropagation(); activeSelection.handleHover(m.match_id, null, null); }}
      onMouseOut={(e) => { e.stopPropagation(); activeSelection.handleHover(null, null, null); }}
      className={`select-none rounded-md p-0.5 transition-all duration-150 cursor-pointer border-l-2 mb-px
        ${isMatchActive 
          ? 'border-l-emerald-500/80 bg-black/5 dark:bg-white/10 shadow-sm' 
          : (isMatchHovered 
            ? 'border-l-emerald-500/50 bg-black/5 dark:bg-white/5 border-y border-r border-black/5 dark:border-white/5' 
            : 'border-l-transparent border border-transparent hover:bg-black/[0.02] dark:hover:bg-white/[0.02] hover:border-black/5 dark:hover:border-white/5')
        }`}
    >
      <div className="flex items-center justify-between gap-1 mb-0.5">
        <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); toggleExpand(uniqueId); }} className="text-theme-muted hover:text-theme-text transition-colors p-px">
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            <span className={`${prefix === 'opt' ? 'text-purple-600 dark:text-purple-400 bg-purple-500/10' : 'text-theme-primary/80 bg-theme-primary/10'} text-[9px] font-bold uppercase tracking-tight px-1 py-px rounded`}>Match {index}</span>
            <span className="text-theme-muted/70 font-mono text-[9px] bg-black/10 dark:bg-black/30 px-1 py-px rounded">
            {m.start}:{m.end}
            </span>
        </div>
        <div className="shrink-0">
            <CopyButton text={m.full_match} />
        </div>
      </div>

      <div className="font-mono text-[11px] flex-1 leading-tight break-all pl-5">
          <span className={`px-1 py-[1px] rounded cursor-text select-text inline-block transition-all duration-300 ${isMatchActive || isMatchHovered ? matchColor.active : matchColor.base}`}>
          {m.full_match}
          </span>
      </div>

      {isExpanded && m.groups.length > 0 && (
        <div className="mt-0.5 pl-5">
           <table className="w-full text-left border-collapse rounded overflow-hidden border border-black/5 dark:border-white/5 bg-black/5 dark:bg-black/20">
            <thead className="bg-black/5 dark:bg-white/5 text-[8px] text-theme-muted/80 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-1 py-px w-auto">Grp</th>
                <th className="px-1 py-px w-auto">Name</th>
                <th className="px-1 py-px w-full">Content</th>
              </tr>
            </thead>
            <tbody>
                {m.groups.map((g: any) => {
                const instanceId = `m${m.match_id}-g${g.group_id}-${g.start}`;
                const isGroupActive = activeSelection.activeGroupIds.includes(g.group_id);
                const isInstanceActive = activeSelection.activeInstanceIds.includes(instanceId);
                const isEffectivelyActive = activeSelection.activeInstanceIds.length > 0 ? isInstanceActive : isGroupActive;
                const isGroupHovered = (activeSelection.hoveredInstanceId === instanceId) || (activeSelection.hoveredGroupId === g.group_id && activeSelection.hoveredInstanceId === null);
                const c = getInspectorColor(g.group_id);

                return (
                  <tr
                    key={instanceId}
                    data-inspector-instance-id={instanceId}
                    data-inspector-group-id={g.group_id}
                    className={`select-none cursor-pointer transition-colors border-t border-black/5 dark:border-white/5 ${isEffectivelyActive ? 'bg-black/10 dark:bg-white/10' : (isGroupHovered ? 'bg-black/5 dark:bg-white/5' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]')}`}
                    onClick={(e) => { e.stopPropagation(); activeSelection.handleSelection(null, g.group_id, instanceId, e.ctrlKey || e.metaKey); }}
                    onMouseOver={(e) => { e.stopPropagation(); activeSelection.handleHover(m.match_id, g.group_id, instanceId); }}
                    onMouseOut={(e) => { e.stopPropagation(); activeSelection.handleHover(null, null, null); }}
                  >
                    <td className="px-1 py-px whitespace-nowrap align-middle">
                      <div className="flex items-center gap-1 font-mono text-[8.5px]">
                        <span className={`px-1 py-[1px] rounded text-center min-w-[16px] font-black ${c.base}`}>
                          {g.group_id}
                        </span>
                      </div>
                    </td>
                    <td className="px-1 py-px whitespace-nowrap align-middle">
                      {g.name ? (
                        <span className={`${prefix === 'opt' ? 'text-purple-600/80 bg-purple-500/10' : 'text-theme-primary/80 bg-theme-primary/10'} text-[8.5px] font-bold px-1 py-[1px] rounded`}>
                          {g.name}
                        </span>
                      ) : (
                        <span className="text-[9px] text-theme-muted/30 italic">-</span>
                      )}
                    </td>
                    <td className="px-1 py-px font-mono text-[10px] break-all leading-tight">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`px-1 py-[1px] rounded cursor-text select-text inline-block transition-all duration-300 ${isEffectivelyActive || isGroupHovered ? c.active : c.base}`}>
                          {g.content}
                        </span>
                        <CopyButton text={g.content} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};