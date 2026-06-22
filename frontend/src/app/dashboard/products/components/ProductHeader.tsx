'use client';

import { Plus, History, ArrowUpRight, Box } from 'lucide-react';

interface ProductHeaderProps {
  onOpenProductModal: () => void;
  onOpenLogModal: () => void;
  onOpenReleaseModal: () => void;
}

export function ProductHeader({
  onOpenProductModal,
  onOpenLogModal,
  onOpenReleaseModal
}: ProductHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-4">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Box className="h-6 w-6" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight uppercase">Master Inventory</h1>
        </div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-2">
          Enterprise Stock Control & Logistics
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
          <span className="text-primary italic font-medium">Live Catalog</span>
        </p>
      </div>

      <div className="flex items-center gap-4 no-print">
        <button
          onClick={onOpenLogModal}
          className="flex items-center gap-2 px-6 py-4 bg-white border border-gray-100 rounded-2xl text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-900 hover:shadow-md hover:shadow-gray-200/50 transition-all group"
        >
          <History className="h-4 w-4 group-hover:rotate-[-45deg] transition-transform" />
          Stock Logs
        </button>
        <button
          onClick={onOpenReleaseModal}
          className="flex items-center gap-2 px-6 py-4 bg-primary text-white rounded-2xl text-xs font-semibold uppercase tracking-wider shadow-md hover:shadow-lg hover:bg-primary-dark transition-all group"
        >
          <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          Release Request
        </button>
        <button
          onClick={onOpenProductModal}
          className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl text-xs font-semibold uppercase tracking-wider shadow-md hover:shadow-lg hover:bg-primary-dark transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>
      </div>
    </div>
  );
}
