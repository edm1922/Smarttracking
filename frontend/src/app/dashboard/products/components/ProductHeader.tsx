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
          <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Master Inventory</h1>
        </div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
          Enterprise Stock Control & Logistics
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
          <span className="text-primary italic">Live Catalog</span>
        </p>
      </div>

      <div className="flex items-center gap-4 no-print">
        <button
          onClick={onOpenLogModal}
          className="flex items-center gap-2 px-6 py-4 bg-white border border-gray-100 rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 hover:shadow-xl hover:shadow-gray-200/50 transition-all group"
        >
          <History className="h-4 w-4 group-hover:rotate-[-45deg] transition-transform" />
          Stock Logs
        </button>
        <button
          onClick={onOpenReleaseModal}
          className="flex items-center gap-2 px-6 py-4 bg-[#50C878] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-green-200/50 hover:scale-105 active:scale-95 transition-all group"
        >
          <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          Release Request
        </button>
        <button
          onClick={onOpenProductModal}
          className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>
      </div>
    </div>
  );
}
