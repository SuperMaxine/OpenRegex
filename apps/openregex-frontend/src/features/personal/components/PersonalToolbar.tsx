import React from 'react';
import { Search } from 'lucide-react';

export interface PersonalToolbarProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  groupBy: 'none' | 'engine' | 'tags';
  setGroupBy: (val: 'none' | 'engine' | 'tags') => void;
}

export const PersonalToolbar: React.FC<PersonalToolbarProps> = ({
  searchQuery,
  setSearchQuery,
  groupBy,
  setGroupBy
}) => {
  return (
    <div className="flex items-center justify-between px-6 py-2 bg-ide-bg border-y border-theme-border shrink-0">
      <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 px-2 py-1.5 rounded-lg border border-theme-border w-64">
        <Search size={14} className="text-theme-muted shrink-0" />
        <input
          type="text"
          placeholder="Search saved regex..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-transparent border-none outline-none text-xs text-theme-text w-full"
        />
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-theme-muted font-bold">Group by:</span>
        <select
          value={groupBy}
          onChange={e => setGroupBy(e.target.value as any)}
          className="bg-black/5 dark:bg-[#121216] border border-theme-border rounded-lg px-2 py-1.5 outline-none text-theme-text cursor-pointer"
        >
          <option value="none" className="dark:bg-[#121216]">None</option>
          <option value="engine" className="dark:bg-[#121216]">Engine</option>
          <option value="tags" className="dark:bg-[#121216]">Tags</option>
        </select>
      </div>
    </div>
  );
};