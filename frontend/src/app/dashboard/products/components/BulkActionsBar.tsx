'use client';

import { Plus, X } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onTransmittal: () => void;
  onPR: () => void;
  onDelete: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onClear,
  onTransmittal,
  onPR,
  onDelete
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-lg flex items-center space-x-8 animate-in fade-in slide-in-from-bottom-4">
      <span className="text-sm font-bold border-r border-gray-700 pr-8">{selectedCount} items selected</span>
      <div className="flex items-center space-x-4">
        <button 
          onClick={onTransmittal}
          className="flex items-center text-sm font-bold hover:text-primary transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" /> Create Transmittal
        </button>
        <button 
          onClick={onPR}
          className="flex items-center text-sm font-bold text-primary/90 hover:text-primary transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" /> Create PR
        </button>
        <button 
          onClick={onDelete}
          className="flex items-center text-sm font-bold text-red-300 hover:text-red-200 transition-colors"
        >
          <X className="h-4 w-4 mr-2" /> Delete Selected
        </button>
      </div>
      <button onClick={onClear} className="text-gray-500 hover:text-white"><X className="h-5 w-5" /></button>
    </div>
  );
}
