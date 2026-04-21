import { useLLMStore } from '../../../core/store/useLLMStore';
import { useRegexStore } from '../../../core/store/useRegexStore';

export const useRegexOptimization = () => {
  const selectedEngineId = useRegexStore(state => state.selectedEngineId);
  const text = useRegexStore(state => state.text);
  const regex = useRegexStore(state => state.regex);
  const activeFlags = useRegexStore(state => state.activeFlags);

  const handleOptimize = async () => {
    if (!regex) return;

    useLLMStore.getState().setAiSidebarOpen(true);
    useLLMStore.getState().addChatMessage({
        role: 'user',
        content: `Please optimize this regex for ${selectedEngineId}:\n${regex}`
    });
    useLLMStore.getState().setIsOptimizing(true);
    useLLMStore.getState().setOptimizationProposal(null);
    useLLMStore.getState().setOptimizationViewMode('original');
    useLLMStore.getState().initPipeline();
    useLLMStore.getState().setPipelineStatus('Initializing Optimization Pipeline...');

    const ctrl = new AbortController();
    useLLMStore.getState().setAbortController(ctrl);

    try {
      const res = await fetch('/api/llm/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine_id: selectedEngineId, text, regex, flags: activeFlags }),
        signal: ctrl.signal
      });
      if (!res.ok) throw new Error(res.statusText);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
           if (line.startsWith('data: ')) {
               try {
                   const data = JSON.parse(line.slice(6));
                   if (data.type === 'status') {
                       useLLMStore.getState().setPipelineStatus(data.message);
                       if (data.step && data.attempt) {
                           useLLMStore.getState().updatePipelineStep(
                               data.attempt,
                               data.step,
                               data.details,
                               data.regex || data.optimized_regex,
                               data.flags,
                               data.explanation,
                               data.raw
                           );
                       }
                   } else if (data.type === 'result') {
                       if (data.success) {
                           if (data.attempt) useLLMStore.getState().updatePipelineStep(data.attempt, 'success');
                           useLLMStore.getState().addChatMessage({
                               role: 'assistant',
                               content: `**Optimization Complete**\n\n${data.explanation}`,
                               regex: data.optimized_regex,
                               flags: data.flags,
                               pipelineAttempts: useLLMStore.getState().pipelineAttempts
                           });
                       } else {
                           if (data.attempt) useLLMStore.getState().updatePipelineStep(data.attempt, 'error', data.details || data.error);
                           useLLMStore.getState().addChatMessage({
                               role: 'assistant',
                               content: `Optimization Failed: ${data.error}`,
                               pipelineAttempts: useLLMStore.getState().pipelineAttempts
                           });
                           console.error(data.error);
                       }
                   } else if (data.type === 'error') {
                       useLLMStore.getState().addChatMessage({ role: 'assistant', content: `Pipeline Error: ${data.message}` });
                       console.error(data.message);
                   }
               } catch (e) {
                   console.error("Failed to parse optimization SSE chunk:", e);
               }
           }
        }
      }

    } catch (e: any) {
      if (e.name === 'AbortError') {
          useLLMStore.getState().addChatMessage({ role: 'assistant', content: `Optimization cancelled by user.` });
      } else {
          console.error(e);
          useLLMStore.getState().addChatMessage({ role: 'assistant', content: `Network Error: Could not reach optimization service.` });
      }
    } finally {
      useLLMStore.getState().setIsOptimizing(false);
      useLLMStore.getState().setPipelineStatus(null);
      useLLMStore.getState().setAbortController(null);
    }
  };

  return { handleOptimize };
};