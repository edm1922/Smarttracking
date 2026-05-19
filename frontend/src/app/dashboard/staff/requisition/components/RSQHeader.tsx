import React from 'react';
import { Printer, ClipboardList } from 'lucide-react';

interface RSQHeaderProps {
  onPrintBlank: () => void;
}

export const RSQHeader: React.FC<RSQHeaderProps> = ({ onPrintBlank }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
      <div>
        <div className="flex items-center gap-4 mb-2">
          <div className="h-12 w-12 bg-gradient-to-br from-primary to-blue-500 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary/30 transform transition-transform hover:scale-105 duration-300">
            <ClipboardList className="h-6 w-6" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Staff Requisition Portal</h1>
        </div>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest ml-1">
          RSQ • Material Issuance & Resource Supply Queue
        </p>
      </div>

      <div className="flex gap-4 no-print">
        <button 
          onClick={onPrintBlank}
          className="px-7 py-3.5 bg-gradient-to-r from-gray-900 to-black text-white rounded-2xl text-[10px] font-extrabold uppercase tracking-widest transition-all duration-300 ease-out shadow-lg shadow-gray-900/20 hover:shadow-2xl hover:shadow-gray-900/40 flex items-center gap-2 hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-px active:scale-100 focus:outline-none focus:ring-4 focus:ring-gray-900/30"
        >
          <Printer className="h-4 w-4" /> Blank Form
        </button>
      </div>
    </div>
  );
};
