import React from 'react';
import { LucideIcon, Database } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ 
  icon: Icon = Database, 
  title, 
  description, 
  action 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl" />
        <div className="relative bg-white h-20 w-20 rounded-3xl shadow-xl shadow-gray-200/50 flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform">
          <Icon className="h-10 w-10 text-primary/40" />
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">
        {title}
      </h3>
      <p className="text-sm text-gray-500 max-w-sm mb-8 leading-relaxed font-medium">
        {description}
      </p>
      
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center px-6 py-3 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
