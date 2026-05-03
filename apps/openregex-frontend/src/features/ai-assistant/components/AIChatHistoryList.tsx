import React, { useEffect, useRef } from 'react';
import { useLLMStore } from '../../../core/store/useLLMStore';
import { AIChatMessageBubble } from './AIChatMessageBubble';
import { AIPipelineTracker } from './AIPipelineTracker';
import { MessageSquareDashed } from 'lucide-react';

export const AIChatHistoryList: React.FC = () => {
  const sessions = useLLMStore(state => state.sessions || []);
  const activeSessionId = useLLMStore(state => state.activeSessionId);
  const chatHistory = sessions.find(s => s.id === activeSessionId)?.messages || [];

  const pipelineAttempts = useLLMStore(state => state.pipelineAttempts);
  const pipelineStatus = useLLMStore(state => state.pipelineStatus);
  const isOptimizing = useLLMStore(state => state.isOptimizing);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const isRunning = !!pipelineStatus || isOptimizing;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, pipelineAttempts, pipelineStatus]);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col p-4 gap-4">
      {chatHistory.length === 0 && (
        <div className="flex flex-col flex-1 items-center justify-center text-theme-muted opacity-60">
          <MessageSquareDashed size={40} className="mb-4 opacity-50" />
          <span className="text-xs font-medium italic text-center">Start describing the regex you need.</span>
        </div>
      )}

      {chatHistory.map((msg, idx) => (
        <AIChatMessageBubble key={idx} msg={msg} />
      ))}

      {/* Render the actively running pipeline at the bottom of the chat */}
      {isRunning && pipelineAttempts.length > 0 && (
          <AIPipelineTracker attempts={pipelineAttempts} status={pipelineStatus} isRunning={true} />
      )}

      <div ref={chatEndRef} />
    </div>
  );
};