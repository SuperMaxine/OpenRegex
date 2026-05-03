import React from 'react';
import {
  BrainCircuit,
  Check,
  Loader2,
  Sparkles,
  TestTube2,
  X,
} from 'lucide-react';
import {
  PipelineAttempt,
  PipelineStepStatus,
} from '../../../core/store/useLLMStore';

interface AIPipelineTrackerProps {
  attempts: PipelineAttempt[];
  status?: string | null;
  isRunning?: boolean;
  inline?: boolean;
}

interface StepView {
  key: 'thinking' | 'generation' | 'validation';
  label: string;
  description: string;
  status: PipelineStepStatus;
  icon: React.ReactNode;
}

const getStepStyle = (status: PipelineStepStatus) => {
  if (status === 'ok' || status === 'done') {
    return {
      dot: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500/40 ring-[4px] ring-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400 font-black',
      line: 'bg-emerald-500/40'
    };
  }
  if (status === 'active') {
    return {
      dot: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-2 border-purple-500/50 ring-[4px] ring-purple-500/30',
      text: 'text-purple-600 dark:text-purple-400 font-black',
      line: 'bg-purple-500/50'
    };
  }
  if (status === 'error') {
    return {
      dot: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-2 border-rose-500/50 ring-[4px] ring-rose-500/20',
      text: 'text-rose-600 dark:text-rose-400 font-black',
      line: 'bg-rose-500/40'
    };
  }
  return {
    dot: 'bg-black/5 dark:bg-white/5 text-theme-muted border-2 border-black/10 dark:border-white/10 ring-[4px] ring-black/5 dark:ring-white/5',
    text: 'text-theme-muted font-bold',
    line: 'bg-black/5 dark:bg-white/10'
  };
};

const StepIcon: React.FC<{
  status: PipelineStepStatus;
  fallback: React.ReactNode;
}> = ({ status, fallback }) => {
  if (status === 'active') {
    return <Loader2 size={15} className="animate-spin" />;
  }

  if (status === 'ok' || status === 'done') {
    return <Check size={15} strokeWidth={3} />;
  }

  if (status === 'error') {
    return <X size={15} strokeWidth={3} />;
  }

  return <>{fallback}</>;
};

const AttemptView: React.FC<{
  attempt: PipelineAttempt;
  inline?: boolean;
}> = ({ attempt, inline = false }) => {
  const steps: StepView[] = [
    {
      key: 'thinking',
      label: 'AI Thinking',
      description: 'Intent and context',
      status: attempt.thinking,
      icon: <BrainCircuit size={15} />,
    },
    {
      key: 'generation',
      label: 'Generate',
      description: 'Candidate pattern',
      status: attempt.generation,
      icon: <Sparkles size={15} />,
    },
    {
      key: 'validation',
      label: 'Engine Test',
      description: 'Runtime validation',
      status: attempt.validation,
      icon: <TestTube2 size={15} />,
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      {!inline && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-theme-muted">
            Attempt {attempt.attempt}
          </span>

          {attempt.intent && (
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">
              {attempt.intent}
            </span>
          )}
        </div>
      )}

      {/* Node System Layout */}
      <div className="relative flex items-start justify-between w-full mt-4 mb-3 px-2">
        {steps.map((step, index) => {
          const style = getStepStyle(step.status);

          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center flex-1 gap-2">
              {/* Connecting Line (drawn from current node to previous) */}
              {index > 0 && (
                <div
                  className={`absolute top-[16px] right-[calc(50%+24px)] w-[calc(100%-48px)] h-[2px] rounded-full transition-colors duration-500 ${style.line}`}
                />
              )}

              {/* Node Dot with Double Rings */}
              <div className={`w-[34px] h-[34px] rounded-full flex items-center justify-center transition-all duration-300 ${style.dot}`}>
                <StepIcon status={step.status} fallback={step.icon} />
              </div>

              {/* Text Label */}
              <div className="flex flex-col items-center text-center px-1">
                <span className={`text-[9px] uppercase tracking-wider transition-colors duration-300 ${style.text}`}>
                  {step.label}
                </span>
                {!inline && (
                  <span className="text-[8px] opacity-60 text-theme-muted mt-0.5 leading-tight hidden sm:block">
                    {step.description}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {attempt.error && (
        <div className="text-[10px] leading-relaxed text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2">
          {attempt.error}
        </div>
      )}

      {attempt.regex && attempt.validation === 'error' && (
        <div className="text-[10px] font-mono break-all bg-black/10 dark:bg-white/10 rounded-lg p-2 text-theme-muted">
          {attempt.regex}
        </div>
      )}
    </div>
  );
};

export const AIPipelineTracker: React.FC<AIPipelineTrackerProps> = ({
  attempts,
  status,
  isRunning,
  inline = false,
}) => {
  if (attempts.length === 0) return null;

  return (
    <div
      className={`shrink-0 border-theme-border overflow-hidden ${
        inline
          ? 'mt-3 pt-3 border-t border-black/10 dark:border-white/10'
          : 'bg-black/5 dark:bg-white/5 border-b p-4 shadow-sm z-10'
      }`}
    >
      {!inline && (
        <div className="flex items-center justify-between border-b border-theme-border pb-2 mb-3">
          <span className="text-[10px] font-bold text-theme-muted uppercase tracking-widest">
            AI Pipeline Execution
          </span>

          {isRunning ? (
            <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-purple-500">
              <Loader2 size={12} className="animate-spin" />
              Running
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-500">
              <Check size={12} />
              Complete
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {attempts.map((attempt) => (
          <AttemptView
            key={attempt.attempt}
            attempt={attempt}
            inline={inline}
          />
        ))}
      </div>

      {!inline && status && (
        <div className="mt-3 text-[10px] text-theme-muted italic leading-relaxed text-center">
          {status}
        </div>
      )}
    </div>
  );
};