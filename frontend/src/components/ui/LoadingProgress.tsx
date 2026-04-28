import React, { useEffect, useState } from 'react';
import { Check, Loader2, Radio } from 'lucide-react';

export interface LoadingStep {
  id: string;
  label: string;
  done: boolean;
  error?: string;
}

interface LoadingProgressProps {
  steps: LoadingStep[];
  title?: string;
  showPercentage?: boolean;
  autoHideDelay?: number;
  minDisplayTime?: number;
}

export function LoadingProgress({ 
  steps, 
  title = 'Loading...',
  showPercentage = true,
  autoHideDelay = 5000,
  minDisplayTime = 3000
}: LoadingProgressProps) {
  const [visible, setVisible] = useState(true);
  const [justCompleted, setJustCompleted] = useState(false);
  const [startTime] = useState(Date.now());

  const completedCount = steps.filter(s => s.done).length;
  const totalCount = steps.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isComplete = completedCount === totalCount && totalCount > 0;
  const elapsedTime = Date.now() - startTime;

  useEffect(() => {
    if (isComplete) {
      setJustCompleted(true);
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
      const timer = setTimeout(() => {
        setVisible(false);
      }, remainingTime + autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [isComplete, autoHideDelay, minDisplayTime, elapsedTime]);

  if (!visible) return null;

  return (
    <div className="w-full space-y-4 p-6 bg-white rounded-2xl border border-gray-100 shadow-lg animate-in fade-in slide-in-from-top-2">
      {title && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isComplete ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <Radio className="h-5 w-5 text-orange-500 animate-pulse" />
            )}
            <span className="text-sm font-bold text-gray-900">{title}</span>
          </div>
          {showPercentage && (
            <span className={`text-lg font-black tracking-tighter ${
              isComplete ? 'text-green-600' : 'text-orange-600'
            }`}>
              {isComplete ? '100%' : `${progress}%`}
              {!isComplete && elapsedTime > 2000 && (
                <span className="text-[10px] text-gray-400 ml-1">
                  ({Math.round(elapsedTime / 1000)}s)
                </span>
              )}
            </span>
          )}
        </div>
      )}

      {/* Progress Bar */}
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ease-out ${
            isComplete ? 'bg-green-500' : 'bg-gradient-to-r from-orange-400 to-orange-600'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps Checklist */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div 
            key={step.id} 
            className={`flex items-center gap-3 text-sm ${
              step.done ? 'text-green-600' : step.error ? 'text-red-500' : 'text-gray-500'
            }`}
          >
            {step.done ? (
              <Check className="h-4 w-4" />
            ) : step.error ? (
              <span className="h-4 w-4 text-red-500">✕</span>
            ) : (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            <span className={step.done ? 'line-through' : ''}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {isComplete && justCompleted && (
        <div className="text-center text-xs font-medium text-green-600 animate-in fade-in">
          Loaded successfully!
        </div>
      )}
    </div>
  );
}

/** Hook for managing loading state */
export function useLoadingSteps(initialSteps: string[]) {
  const [steps, setSteps] = useState<LoadingStep[]>(
    initialSteps.map(id => ({ id, label: id, done: false }))
  );

  const setStepDone = (id: string) => {
    setSteps(prev => prev.map(s => 
      s.id === id ? { ...s, done: true } : s
    ));
  };

  const setStepError = (id: string, error: string) => {
    setSteps(prev => prev.map(s => 
      s.id === id ? { ...s, done: false, error } : s
    ));
  };

  const setStepLabel = (id: string, label: string) => {
    setSteps(prev => prev.map(s => 
      s.id === id ? { ...s, label } : s
    ));
  };

  const reset = () => {
    setSteps(initialSteps.map(id => ({ id, label: id, done: false })));
  };

  return { steps, setStepDone, setStepError, setStepLabel, reset };
}