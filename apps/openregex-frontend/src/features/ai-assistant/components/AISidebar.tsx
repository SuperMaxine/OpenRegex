import React from 'react';
import { AISidebarHeader } from './AISidebarHeader';
import { AIChatHistoryList } from './AIChatHistoryList';
import { AIInputArea } from './AIInputArea';
import { AISessionHistory } from './AISessionHistory';
import { useLLMStore } from '../../../core/store/useLLMStore';

export const AISidebar: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const isAiHistoryOpen = useLLMStore(state => state.isAiHistoryOpen);

  return (
    <div className="flex flex-col h-full w-full bg-theme-base/90 dark:bg-[#121216]/90 backdrop-blur-xl relative">
      <AISidebarHeader onClose={onClose} />
      {isAiHistoryOpen ? (
        <AISessionHistory />
      ) : (
        <>
          <AIChatHistoryList />
          <AIInputArea />
        </>
      )}
    </div>
  );
};