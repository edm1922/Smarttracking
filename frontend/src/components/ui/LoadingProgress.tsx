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

interface CircularLoadingProps extends LoadingProgressProps {
  size?: number;
  strokeWidth?: number;
  fullPage?: boolean;
}

export function CircularLoading({ 
  steps, 
  title = 'Processing',
  size = 120,
  strokeWidth = 10,
  minDisplayTime = 1500,
  fullPage = false
}: CircularLoadingProps) {
  const [visible, setVisible] = useState(true);
  const [startTime] = useState(Date.now());

  const completedCount = steps.filter(s => s.done).length;
  const totalCount = steps.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) : 0;
  const isComplete = completedCount === totalCount && totalCount > 0;
  const currentStep = steps.find(s => !s.done) || steps[steps.length - 1];

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress * circumference);

  useEffect(() => {
    if (isComplete) {
      const elapsed = Date.now() - startTime;
      const timer = setTimeout(() => {
        setVisible(false);
      }, Math.max(0, minDisplayTime - elapsed));
      return () => clearTimeout(timer);
    }
  }, [isComplete, minDisplayTime, startTime]);

  if (!visible) return null;

  return (
    <div className={`z-[100] flex flex-col items-center justify-center bg-gray-50/40 backdrop-blur-sm animate-in fade-in duration-500 ${
      fullPage ? 'fixed inset-0' : 'absolute inset-0 rounded-[2.5rem]'
    }`}>
      <div className="relative flex items-center justify-center scale-75 md:scale-100">
        {/* Track */}
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200"
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            style={{ 
              strokeDashoffset: offset,
              transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' 
            }}
            strokeLinecap="round"
            className="text-primary"
          />
        </svg>
        
        {/* Center Content */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-gray-900 leading-none">
            {Math.round(progress * 100)}%
          </span>
        </div>
      </div>

      <div className="mt-8 text-center space-y-2 max-w-xs px-4">
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest animate-pulse">
          {title}
        </h3>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight h-4">
          {currentStep?.label}
        </p>
      </div>

      {/* Decorative dots for extra flair */}
      <div className="absolute bottom-12 flex gap-2">
        {steps.map((s, i) => (
          <div 
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
              s.done ? 'bg-primary scale-125' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
}