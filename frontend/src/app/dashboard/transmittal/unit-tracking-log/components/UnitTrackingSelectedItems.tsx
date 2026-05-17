import React from 'react';
import { Trash2, Box, ClipboardList } from 'lucide-react';

interface UnitTrackingSelectedItemsProps {
  selectedItems: any[];
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
}

export const UnitTrackingSelectedItems: React.FC<UnitTrackingSelectedItemsProps> = ({
  selectedItems,
  removeItem,
  updateQuantity,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden flex flex-col">
      <div className="bg-gray-900 px-8 py-5 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center">
          <ClipboardList className="mr-3 h-4 w-4" />
          Items for Transmittal
        </h3>
        <span className="text-[9px] font-black text-white/40 bg-white/5 px-3 py-1 rounded-full uppercase tracking-widest border border-white/10">
          {selectedItems.length} Entries Ready
        </span>
      </div>
      
      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-50 text-left">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Asset ID & Description</th>
              <th className="px-8 py-5 text-center text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Quantity</th>
              <th className="px-8 py-5 text-right text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {selectedItems.map((item, idx) => (
              <tr key={item.id} className="hover:bg-gray-50/30 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-gray-900 font-mono tracking-tight group-hover:text-primary transition-colors uppercase">{item.assetId}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1">{item.name}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center justify-center gap-3">
                    <input 
                      type="number" 
                      value={isNaN(item.quantity) ? '' : item.quantity} 
                      onChange={e => updateQuantity(item.id, parseInt(e.target.value) || 0)} 
                      className="w-20 bg-gray-50 border-2 border-transparent rounded-xl px-3 py-2 text-xs font-black text-center outline-none focus:bg-white focus:border-primary transition-all" 
                    />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{item.unit}</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <button 
                    onClick={() => removeItem(item.id)} 
                    className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
            {selectedItems.length === 0 && (
              <tr>
                <td colSpan={3} className="px-8 py-24 text-center space-y-4">
                  <div className="h-20 w-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mx-auto border-2 border-dashed border-gray-100">
                    <Box className="h-8 w-8 text-gray-200" />
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Your list is empty. Select items from history.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
