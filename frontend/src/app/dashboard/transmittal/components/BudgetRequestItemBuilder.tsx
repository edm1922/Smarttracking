import React from 'react';
import { ClipboardList, Trash2 } from 'lucide-react';
import { BudgetItem } from '../types';

interface BudgetRequestItemBuilderProps {
  items: BudgetItem[];
  addRow: (initialData?: Partial<BudgetItem>) => void;
  updateItem: (id: string, field: string, value: any) => void;
  removeItem: (id: string) => void;
  setItems: (items: BudgetItem[]) => void;
  onSave: () => void;
  editingId: string | null;
}

export const BudgetRequestItemBuilder: React.FC<BudgetRequestItemBuilderProps> = ({
  items,
  addRow,
  updateItem,
  removeItem,
  setItems,
  onSave,
  editingId,
}) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
          <ClipboardList className="mr-2 h-4 w-4" />
          Service / Labor Line Items
        </h3>
        <button 
          onClick={() => addRow()} 
          className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-lg transition-all"
        >
          + Add Line Item
        </button>
      </div>

      <div className="flex-1 overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-gray-100">
              <th className="pb-3 font-black uppercase w-8 text-center">No.</th>
              <th className="pb-3 font-black uppercase">Description</th>
              <th className="pb-3 font-black uppercase w-28">Vendor/Contractor</th>
              <th className="pb-3 font-black uppercase w-20 text-center">Start</th>
              <th className="pb-3 font-black uppercase w-20 text-center">End</th>
              <th className="pb-3 font-black uppercase w-20 text-center">Duration</th>
              <th className="pb-3 font-black uppercase w-28 text-right">Est. Cost</th>
              <th className="pb-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item, idx) => (
              <tr key={item.id} className="group hover:bg-gray-50/50 transition-colors">
                <td className="py-2 text-gray-400 font-bold text-center">{idx + 1}</td>
                <td className="py-2 px-2">
                  <input 
                    type="text" 
                    value={item.description || ''} 
                    onChange={e => updateItem(item.id, 'description', e.target.value)} 
                    className="w-full bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 p-1.5 rounded-lg transition-all font-bold text-gray-900" 
                    placeholder="Describe the service or labor..."
                  />
                  <input 
                    type="text" 
                    value={item.remarks || ''} 
                    onChange={e => updateItem(item.id, 'remarks', e.target.value)} 
                    className="w-full bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 px-1.5 pb-1 rounded-lg transition-all text-[10px] text-gray-400" 
                    placeholder="Remarks..."
                  />
                </td>
                <td className="py-2">
                  <input 
                    type="text" 
                    value={item.vendor || item.contractor || ''} 
                    onChange={e => updateItem(item.id, 'vendor', e.target.value)} 
                    className="w-full bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 p-1.5 rounded-lg transition-all font-medium text-gray-600" 
                    placeholder="Vendor/contractor"
                  />
                </td>
                <td className="py-2">
                  <input 
                    type="date" 
                    value={item.startDate || ''} 
                    onChange={e => updateItem(item.id, 'startDate', e.target.value)} 
                    className="w-full bg-transparent text-center outline-none focus:bg-white focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 p-1.5 rounded-lg transition-all text-xs text-gray-500" 
                  />
                </td>
                <td className="py-2">
                  <input 
                    type="date" 
                    value={item.endDate || ''} 
                    onChange={e => updateItem(item.id, 'endDate', e.target.value)} 
                    className="w-full bg-transparent text-center outline-none focus:bg-white focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 p-1.5 rounded-lg transition-all text-xs text-gray-500" 
                  />
                </td>
                <td className="py-2">
                  <input 
                    type="text" 
                    value={item.duration || ''} 
                    onChange={e => updateItem(item.id, 'duration', e.target.value)} 
                    className="w-full bg-transparent text-center outline-none focus:bg-white focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 p-1.5 rounded-lg transition-all font-medium text-gray-600" 
                    placeholder="e.g. 5 days"
                  />
                </td>
                <td className="py-2">
                  <div className="flex items-center justify-end">
                    <span className="text-gray-400 mr-1">₱</span>
                    <input 
                      type="number" 
                      value={isNaN(item.estimatedCost) ? '' : item.estimatedCost} 
                      onChange={e => updateItem(item.id, 'estimatedCost', parseFloat(e.target.value) || 0)} 
                      className="w-24 bg-transparent text-right outline-none focus:bg-white focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 p-1.5 rounded-lg transition-all font-mono" 
                    />
                  </div>
                </td>
                <td className="py-2 text-right">
                  <button 
                    onClick={() => removeItem(item.id)} 
                    className="text-gray-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center">
                      <ClipboardList className="h-6 w-6 text-gray-300" />
                    </div>
                    <div className="text-sm text-gray-400 font-medium italic">Click &quot;+ Add Line Item&quot; to start building your budget request.</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-xs font-black text-gray-400 uppercase tracking-widest">
          Total Estimated Amount: <span className="text-lg text-blue-600 ml-2">₱{items.reduce((acc, item) => acc + item.estimatedCost, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <button 
            onClick={() => setItems([])} 
            className="flex-1 md:flex-none px-6 py-2 text-xs font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors"
          >
            Clear All
          </button>
          <button 
            onClick={onSave} 
            className="flex-1 md:flex-none px-8 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all active:translate-y-0"
          >
            {editingId ? 'Update Budget Record' : 'Save to History'}
          </button>
        </div>
      </div>
    </div>
  );
};
