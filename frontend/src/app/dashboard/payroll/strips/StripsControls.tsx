'use client';

import React from 'react';
import { Printer, ExternalLink } from 'lucide-react';

export default function StripsControls() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex items-center gap-3">
      <button 
        onClick={handlePrint}
        className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-black transition-all active:scale-95 shadow-xl shadow-gray-900/20"
      >
        <Printer className="h-4 w-4" />
        Print Sheet
      </button>
    </div>
  );
}
