import React from 'react';
import { Trash2, MessageSquareDashed } from 'lucide-react';
import { useLLMStore } from '../../../core/store/useLLMStore';

export const AISessionHistory: React.FC = () => {
  const sessions = useLLMStore(state => state.sessions || []);
  const activeSessionId = useLLMStore(state => state.activeSessionId);
  const loadSession = useLLMStore(state => state.loadSession);
  const deleteSession = useLLMStore(state => state.deleteSession);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-2">
      {sessions.length === 0 && (
        <div className="flex flex-col flex-1 items-center justify-center text-theme-muted opacity-60">
          <MessageSquareDashed size={40} className="mb-4 opacity-50" />
          <span className="text-xs font-medium italic text-center">No chat history available.</span>
        </div>
      )}
      {[...sessions]
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((session) => (
          <div
            key={session.id}
            onClick={() => loadSession(session.id)}
            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors group ${
              session.id === activeSessionId
                ? 'bg-purple-500/10 border-purple-500/30'
                : 'bg-black/5 dark:bg-white/5 border-transparent hover:border-theme-border'
            }`}
          >
            <div className="flex flex-col min-w-0 pr-3 flex-1">
              <span className="text-xs font-bold text-theme-text truncate leading-tight mb-0.5">
                {session.preview || 'Empty Chat'}
              </span>
              <span className="text-[10px] text-theme-muted font-mono opacity-80">
                {new Date(session.createdAt).toLocaleString()}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteSession(session.id);
              }}
              className="p-1.5 text-theme-muted opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-all shrink-0"
              title="Delete Session"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
    </div>
  );
};