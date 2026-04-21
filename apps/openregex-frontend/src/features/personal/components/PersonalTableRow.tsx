import React, { useState } from 'react';
import { X, Play, Link, Trash2, Check, Plus } from 'lucide-react';
import { PersonalItem } from '../../../core/store/useStorageStore';

export interface PersonalTableRowProps {
  item: PersonalItem;
  handleLoad: (item: PersonalItem) => void;
  handleCopyLink: (item: PersonalItem) => void;
  removePersonal: (id: string) => void;
  updatePersonalItem: (id: string, updates: Partial<PersonalItem>) => void;
  copiedId: string | null;
}

export const PersonalTableRow: React.FC<PersonalTableRowProps> = ({
  item,
  handleLoad,
  handleCopyLink,
  removePersonal,
  updatePersonalItem,
  copiedId
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(item.name || '');

  const [isEditingTag, setIsEditingTag] = useState(false);
  const [tagValue, setTagValue] = useState('');

  const saveName = () => {
    updatePersonalItem(item.id, { name: nameValue.trim() });
    setIsEditingName(false);
  };

  const saveTag = () => {
    if (tagValue.trim()) {
      const newTags = Array.from(new Set([...(item.tags || []), tagValue.trim()]));
      updatePersonalItem(item.id, { tags: newTags });
    }
    setIsEditingTag(false);
    setTagValue('');
  };

  const removeTag = (tagToRemove: string) => {
    updatePersonalItem(item.id, { tags: item.tags?.filter(t => t !== tagToRemove) || [] });
  };

  return (
    <tr className="border-b border-theme-border/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
      <td
        className="px-4 py-3 text-xs font-bold text-theme-text whitespace-nowrap cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        onClick={() => {
          setIsEditingName(true);
          setNameValue(item.name || '');
        }}
        title="Click to edit name"
      >
        {isEditingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={saveName}
            onKeyDown={e => e.key === 'Enter' && saveName()}
            className="bg-white dark:bg-[#1a1a20] border border-theme-primary/50 rounded px-1.5 py-0.5 text-xs text-theme-text w-full outline-none focus:ring-1 focus:ring-theme-primary/50"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          item.name || <span className="text-theme-muted italic font-normal">Unnamed</span>
        )}
      </td>

      <td className="px-4 py-3 max-w-[150px]">
        <div className="flex flex-wrap gap-1.5 items-center">
          {item.tags?.map(tag => (
             <span key={tag} className="text-[9px] font-bold bg-theme-primary/10 text-theme-primary border border-theme-primary/20 px-1.5 py-0.5 rounded flex items-center gap-1 group/tag">
               {tag}
               <X size={10} className="cursor-pointer opacity-0 group-hover/tag:opacity-100 hover:text-rose-500 transition-opacity" onClick={(e) => { e.stopPropagation(); removeTag(tag); }} />
             </span>
          ))}
          {isEditingTag ? (
             <input
              autoFocus
              value={tagValue}
              onChange={e => setTagValue(e.target.value)}
              onBlur={saveTag}
              onKeyDown={e => e.key === 'Enter' && saveTag()}
              className="bg-white dark:bg-[#1a1a20] border border-theme-primary/50 rounded px-1.5 py-0.5 text-[10px] text-theme-text w-16 outline-none focus:ring-1 focus:ring-theme-primary/50"
              placeholder="Tag..."
              onClick={e => e.stopPropagation()}
             />
          ) : (
             <button onClick={(e) => { e.stopPropagation(); setIsEditingTag(true); }} className="text-theme-muted hover:text-theme-primary p-0.5 bg-black/5 dark:bg-white/5 hover:bg-theme-primary/10 rounded transition-colors" title="Add Tag">
               <Plus size={12} strokeWidth={3} />
             </button>
          )}
        </div>
      </td>

      <td className="px-4 py-3 text-[10px] font-mono text-indigo-500 whitespace-nowrap">
        {item.engineLabel}
      </td>
      <td className="px-4 py-3">
        <div className="text-[11px] font-mono text-theme-text bg-black/5 dark:bg-white/5 px-2 py-1 rounded max-w-[200px] truncate" title={item.regex}>
          {item.regex}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-[10px] font-mono text-theme-muted truncate max-w-[200px]" title={item.text}>
          {item.text.replace(/\n/g, '\\n')}
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded">
          {item.matchCount}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleLoad(item)}
            className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-theme-primary/10 text-theme-primary hover:bg-theme-primary/20 rounded transition-colors"
            title="Load into Editor"
          >
            <Play size={12} /> Load
          </button>
          <button
            onClick={() => handleCopyLink(item)}
            className="p-1.5 text-theme-muted hover:text-indigo-500 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
            title="Copy Share Link"
          >
            {copiedId === item.id ? <Check size={14} className="text-emerald-500" /> : <Link size={14} />}
          </button>
          <button
            onClick={() => removePersonal(item.id)}
            className="p-1.5 text-theme-muted hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
};