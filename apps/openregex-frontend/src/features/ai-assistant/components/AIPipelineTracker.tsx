import React from 'react';
import {
  BrainCircuit,
  Check,
  ChevronRight,
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

const getStepClassName = (status: PipelineStepStatus): string => {
  if (status === 'ok' || status === 'done') {
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  }

  if (status === 'active') {
    return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
  }

  if (status === 'error') {
    return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
  }

  return 'bg-black/5 dark:bg-white/5 text-theme-muted border-theme-border';
};

const StepIcon: React.FC<{
  status: PipelineStepStatus;
  fallback: React.ReactNode;
}> = ({ status, fallback }) => {
  if (status === 'active') {
    return <Loader2 size={13} className="animate-spin" />;
  }

  if (status === 'ok' || status === 'done') {
    return <Check size={13} />;
  }

  if (status === 'error') {
    return <X size={13} />;
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
      icon: <BrainCircuit size={13} />,
    },
    {
      key: 'generation',
      label: 'Generate Regex',
      description: 'Candidate pattern',
      status: attempt.generation,
      icon: <Sparkles size={13} />,
    },
    {
      key: 'validation',
      label: 'Engine Test',
      description: 'Runtime validation',
      status: attempt.validation,
      icon: <TestTube2 size={13} />,
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

      <div className="flex items-stretch gap-1.5">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div
              className={`flex-1 min-w-0 rounded-lg border px-2 py-2 transition-colors ${getStepClassName(
                step.status
              )}`}
            >
              <div className="flex items-center gap-1.5">
                <StepIcon status={step.status} fallback={step.icon} />

                <span className="text-[9px] font-black uppercase tracking-wider truncate">
                  {step.label}
                </span>
              </div>

              {!inline && (
                <div className="mt-1 text-[9px] opacity-60 truncate">
                  {step.description}
                </div>
              )}
            </div>

            {index < steps.length - 1 && (
              <div className="flex items-center text-theme-muted opacity-40">
                <ChevronRight size={13} />
              </div>
            )}
          </React.Fragment>
        ))}
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
        <div className="mt-3 text-[10px] text-theme-muted italic leading-relaxed">
          {status}
        </div>
      )}
    </div>
  );
};