import React from 'react';
import { History, Download, Copy, Trash2, RefreshCw } from 'lucide-react';

interface BudgetRequestHistoryProps {
  history: any[];
  loadFromHistory: (item: any) => void;
  appendItems: (item: any) => void;
  deleteItem: (id: string) => void;
  updateHistory: (item: any) => void;
}

export const BudgetRequestHistory: React.FC<BudgetRequestHistoryProps> = ({
  history,
  loadFromHistory,
  appendItems,
  deleteItem,
  updateHistory,
}) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
        <History className="mr-2 h-4 w-4" />
        Budget Request History
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar">
        {history.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <div className="h-10 w-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <History className="h-5 w-5 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400 font-medium italic">No history found. Save a budget request to see it here.</p>
          </div>
        ) : (
          history.map((item) => (
            <div key={item.id} className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all bg-gray-50/30">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-sm font-black text-blue-600 font-mono">{item.bgtNo}</span>
                  <div className="text-[10px] font-bold text-gray-400 mt-0.5">{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                  item.category === 'SERVICE' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {item.category || 'MIXED'}
                </span>
              </div>
              <div className="text-xs font-bold text-gray-600 truncate">{item.department} — {item.endUser}</div>
              <div className="text-[10px] text-gray-400 mt-1">
                {(item.items || []).length} line items
              </div>
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => loadFromHistory(item)}
                  className="flex-1 text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 hover:bg-blue-100 px-2 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1"
                  title="Load / Edit"
                >
                  <Download className="h-3 w-3" /> Load
                </button>
                <button
                  onClick={() => appendItems(item)}
                  className="flex-1 text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-100 hover:bg-gray-200 px-2 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1"
                  title="Copy items"
                >
                  <Copy className="h-3 w-3" /> Copy
                </button>
                <button
                  onClick={() => updateHistory(item)}
                  className="flex-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 hover:bg-emerald-100 px-2 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1"
                  title="Update this record with current form data"
                >
                  <RefreshCw className="h-3 w-3" /> Update
                </button>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
