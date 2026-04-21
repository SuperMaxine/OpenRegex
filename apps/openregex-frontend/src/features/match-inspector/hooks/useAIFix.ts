import { useLLMStore } from '../../../core/store/useLLMStore';
import { useRegexStore } from '../../../core/store/useRegexStore';

export const useAIFix = () => {
    const { isAvailable: isAiAvailable, abortController } = useLLMStore();
    const error = useRegexStore(state => state.error);
    const isAiBusy = abortController !== null;

    const handleAIFix = async () => {
        if (!error || !isAiAvailable) return;

        const regexStore = useRegexStore.getState();

        if (useLLMStore.getState().abortController) return;

        useLLMStore.getState().setAiSidebarOpen(true);

        const userMsg = {
            role: 'user' as const,
            content: `My regex \`${regexStore.regex}\` failed with the following error:\n\n\`\`\`\n${error}\n\`\`\`\n\nPlease fix it.`
        };

        useLLMStore.getState().addChatMessage(userMsg);
        useLLMStore.getState().initPipeline();
        useLLMStore.getState().setPipelineStatus('Initializing Fix Request...');

        const ctrl = new AbortController();
        useLLMStore.getState().setAbortController(ctrl);

        try {
            const res = await fetch('/api/llm/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    engine_id: regexStore.selectedEngineId,
                    text: regexStore.text,
                    description: JSON.stringify([...useLLMStore.getState().chatHistory, userMsg]),
                    flags: regexStore.activeFlags
                }),
                signal: ctrl.signal
            });

            if (!res.ok) {
               useLLMStore.getState().addChatMessage({ role: 'assistant', content: `Network Error: ${res.statusText}` });
               return;
            }

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
                                    useLLMStore.getState().updatePipelineStep(data.attempt, data.step, data.details, data.regex, data.flags, data.explanation, data.raw);
                                }
                            } else if (data.type === 'result') {
                                if (data.success) {
                                    if (data.attempt) useLLMStore.getState().updatePipelineStep(data.attempt, 'success');
                                    useLLMStore.getState().addChatMessage({
                                        role: 'assistant',
                                        content: data.explanation,
                                        regex: data.generated_regex || data.optimized_regex,
                                        flags: data.flags,
                                        pipelineAttempts: useLLMStore.getState().pipelineAttempts
                                    });
                                } else {
                                    if (data.attempt) useLLMStore.getState().updatePipelineStep(data.attempt, 'error', data.details || data.error);
                                    useLLMStore.getState().addChatMessage({
                                        role: 'assistant',
                                        content: `Error: ${data.error}${data.details ? `\n\nDetails: ${data.details}` : ''}`,
                                        regex: data.generated_regex || data.optimized_regex,
                                        flags: data.flags,
                                        pipelineAttempts: useLLMStore.getState().pipelineAttempts
                                    });
                                }
                            } else if (data.type === 'error') {
                                useLLMStore.getState().addChatMessage({ role: 'assistant', content: `Pipeline Error: ${data.message}` });
                            }
                        } catch (e) {
                            console.error("Failed to parse SSE JSON:", e);
                        }
                    }
                }
            }
        } catch (e: any) {
            if (e.name === 'AbortError') {
                useLLMStore.getState().addChatMessage({ role: 'assistant', content: `Fix cancelled by user.` });
            } else {
                useLLMStore.getState().addChatMessage({ role: 'assistant', content: `Network Error: ${e.message}` });
            }
        } finally {
            useLLMStore.getState().setPipelineStatus(null);
            useLLMStore.getState().setAbortController(null);
        }
    };

    return { handleAIFix, isAiBusy, isAiAvailable };
};