import React from 'react';
import { Trash2 } from 'lucide-react';

interface PRHistoryLogProps {
  prHistory: any[];
  loadPrFromHistory: (pr: any) => void;
  appendPrItems: (pr: any) => void;
  deletePr: (id: string) => void;
}

export const PRHistoryLog: React.FC<PRHistoryLogProps> = ({
  prHistory,
  loadPrFromHistory,
  appendPrItems,
  deletePr,
}) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
          PR History Log
        </h3>
        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
          {prHistory.length} records
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {prHistory.map(pr => (
          <div
            key={pr.id}
            className="flex flex-col p-5 rounded-2xl border border-gray-100 bg-gray-50/50 hover:border-blue-200 hover:bg-blue-50/30 transition-all text-left group shadow-sm"
          >
            <div className="flex justify-between items-start w-full mb-3">
              <div className="flex flex-col">
                <span className="text-base font-black text-gray-900 group-hover:text-blue-700 transition-colors tracking-tight">
                  {pr.prNo}
                </span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                  {new Date(pr.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <span className="text-[10px] font-black text-blue-600 bg-blue-100/50 px-2 py-0.5 rounded-lg border border-blue-200/50">
                {pr.items.length} items
              </span>
            </div>
            
            <div className="space-y-1 mb-4">
              <div className="text-[11px] text-gray-700 font-bold uppercase tracking-tight flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-2"></span>
                {pr.department || 'N/A'}
              </div>
              <div className="text-[11px] text-gray-500 font-medium flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mr-2"></span>
                {pr.endUser || 'N/A'}
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200/50 flex justify-between gap-2">
              <button 
                onClick={() => loadPrFromHistory(pr)} 
                className="text-[10px] font-black text-gray-600 hover:text-blue-600 flex-1 text-center bg-white border border-gray-200 hover:border-blue-200 rounded-xl py-2 uppercase tracking-widest transition-all hover:shadow-md"
              >
                Load / Edit
              </button>
              <button 
                onClick={() => appendPrItems(pr)} 
                className="text-[10px] font-black text-gray-600 hover:text-green-600 flex-1 text-center bg-white border border-gray-200 hover:border-green-200 rounded-xl py-2 uppercase tracking-widest transition-all hover:shadow-md"
              >
                Copy
              </button>
              <button 
                onClick={() => deletePr(pr.id)} 
                className="text-gray-300 hover:text-red-600 p-2 bg-white border border-gray-200 hover:border-red-200 rounded-xl transition-all hover:shadow-md" 
                title="Delete PR"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {prHistory.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400 italic text-sm">
            No history found. Save a PR to see it here.
          </div>
        )}
      </div>
    </div>
  );
};
