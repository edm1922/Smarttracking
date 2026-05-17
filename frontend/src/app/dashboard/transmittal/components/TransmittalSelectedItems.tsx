import React from 'react';
import { Trash2 } from 'lucide-react';
import { TransmittalItem } from '../types';

interface TransmittalSelectedItemsProps {
  transmittalType: 'MATERIAL' | 'EMPLOYEE';
  selectedItems: TransmittalItem[];
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
}

export const TransmittalSelectedItems: React.FC<TransmittalSelectedItemsProps> = ({
  transmittalType,
  selectedItems,
  removeItem,
  updateQuantity,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">
          Selected Items for Transmittal
        </h3>
        <span className="text-[10px] font-black text-primary bg-primary/5 px-2.5 py-1 rounded-full border border-primary/10">
          {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      <div className="flex-1 overflow-x-auto custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50/50">
            {transmittalType === 'EMPLOYEE' ? (
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest w-12">No.</th>
                <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Requested by</th>
                <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Item requested</th>
                <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date requested</th>
                <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">Qty</th>
                <th className="px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest w-12">Action</th>
              </tr>
            ) : (
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock Item</th>
                <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Quantity</th>
                <th className="px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest w-12">Action</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {selectedItems.map((item, idx) => (
              <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                {transmittalType === 'EMPLOYEE' ? (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-500">{idx + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-primary">{item.requestedBy || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900 leading-tight">{item.name}</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-tighter mt-0.5 truncate max-w-[200px]">{item.description || 'No Description'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-gray-500">{item.dateRequested || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input 
                        type="number" 
                        value={isNaN(item.quantity) ? '' : item.quantity} 
                        onChange={e => updateQuantity(item.id, parseInt(e.target.value) || 0)} 
                        className="w-20 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-bold outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all" 
                      />
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900 leading-tight">{item.name}</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-tighter mt-0.5 truncate max-w-[200px]">{item.description || 'No Description'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input 
                        type="number" 
                        value={isNaN(item.quantity) ? '' : item.quantity} 
                        onChange={e => updateQuantity(item.id, parseInt(e.target.value) || 0)} 
                        className="w-24 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-bold outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all" 
                      />
                    </td>
                  </>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button 
                    onClick={() => removeItem(item.id)} 
                    className="text-gray-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all group"
                  >
                    <Trash2 className="h-4 w-4 transition-transform group-hover:scale-110" />
                  </button>
                </td>
              </tr>
            ))}
            {selectedItems.length === 0 && (
              <tr>
                <td colSpan={transmittalType === 'EMPLOYEE' ? 6 : 3} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center">
                      <Trash2 className="h-6 w-6 text-gray-300" />
                    </div>
                    <div className="text-sm text-gray-400 font-medium italic">No items selected. Start adding from the list above.</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
