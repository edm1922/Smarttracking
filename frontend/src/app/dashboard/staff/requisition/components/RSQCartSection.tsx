import React from 'react';
import { ShoppingBag, Trash2, User, ChevronRight, Send, AlertTriangle } from 'lucide-react';
import { SelectedItem, Employee } from './RSQTypes';

interface RSQCartSectionProps {
  selectedItems: SelectedItem[];
  employees: Employee[];
  updateCartItemQuantity: (productId: string, empName: string, qty: number) => void;
  removeCartItem: (productId: string) => void;
  handleOpenSubmitModal: () => void;
  isSubmitting: boolean;
}

export const RSQCartSection: React.FC<RSQCartSectionProps> = ({
  selectedItems,
  employees,
  updateCartItemQuantity,
  removeCartItem,
  handleOpenSubmitModal,
  isSubmitting,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col transition-all duration-500">
      <div className="bg-gradient-to-r from-gray-900 to-black px-8 py-6 flex items-center justify-between">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
          <ShoppingBag className="mr-3 h-5 w-5" />
          Selected Materials
        </h2>
        <span className="text-[10px] font-medium text-white/60 uppercase tracking-widest">
          {selectedItems.length} Products • {employees.length} Employees
        </span>
      </div>

      <div className="flex-1 overflow-x-auto custom-scrollbar min-h-[400px]">
        {selectedItems.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-white z-10">Product Description</th>
                {employees.map(emp => (
                  <th key={emp.name} className="px-8 py-6 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider border-l border-gray-50 min-w-[150px]">
                    <div className="flex flex-col items-center">
                      <span className="text-gray-900 font-semibold">{emp.name}</span>
                      <span className="opacity-70 font-medium">{emp.position}</span>
                    </div>
                  </th>
                ))}
                <th className="px-8 py-6 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider border-l border-gray-50">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {selectedItems.map((item) => (
                <tr key={item.productId} className="hover:bg-blue-50/30 transition-colors group duration-300">
                  <td className="px-8 py-6 sticky left-0 bg-white z-10 shadow-[4px_0_10px_rgba(0,0,0,0.02)] group-hover:bg-blue-50/30 transition-colors duration-300">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-900 uppercase tracking-wide line-clamp-1">{item.productName}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-500 tracking-wide uppercase truncate max-w-[200px]">{item.description || 'No Description'}</span>
                        <span className="text-[9px] font-black text-primary/60 bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">Stock: {item.maxQuantity}</span>
                      </div>
                    </div>
                  </td>
                  {employees.map(emp => (
                    <td key={emp.name} className="px-8 py-6 text-center border-l border-gray-50">
                      <div className="flex items-center justify-center gap-3">
                        <input 
                          type="number" 
                          min="0"
                          value={item.quantities[emp.name] || 0}
                          onChange={(e) => updateCartItemQuantity(item.productId, emp.name, parseInt(e.target.value) || 0)}
                          className={`w-20 bg-gray-50/50 border rounded-xl text-center py-2 text-xs font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all ${
                            (item.quantities[emp.name] || 0) > 0 ? 'bg-white border-primary text-primary shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        />
                      </div>
                    </td>
                  ))}
                  <td className="px-8 py-6 text-right border-l border-gray-50">
                    <button 
                      onClick={() => removeCartItem(item.productId)}
                      className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-100">
                <td className="px-8 py-5 text-[10px] font-bold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50">Total per Employee</td>
                {employees.map(emp => {
                  const total = selectedItems.reduce((sum, item) => sum + (item.quantities[emp.name] || 0), 0);
                  return (
                    <td key={emp.name} className="px-8 py-5 text-center text-xs font-extrabold text-blue-600 border-l border-gray-100">
                      {total} Items
                    </td>
                  );
                })}
                <td className="bg-gray-50 border-l border-gray-100"></td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 space-y-6">
            <div className="h-24 w-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl flex items-center justify-center border-2 border-dashed border-gray-200 shadow-inner">
              <ShoppingBag className="h-10 w-10 text-gray-300 group-hover:text-primary transition-colors" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">No materials selected</p>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide italic max-w-xs mx-auto">
                Tag employees first then select products from the inventory sidebar to build your requisition list.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 bg-gradient-to-r from-gray-900 to-black border-t border-gray-800">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
              <Send className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">Final Step: Submission</p>
              <p className="text-[10px] font-medium text-white/60 uppercase tracking-wide">Please review all quantities before proceeding</p>
            </div>
          </div>
          <button
            onClick={handleOpenSubmitModal}
            disabled={selectedItems.length === 0 || employees.length === 0 || isSubmitting}
            className="w-full md:w-auto px-12 py-5 bg-gradient-to-r from-primary to-blue-500 text-white rounded-2xl text-xs font-extrabold uppercase tracking-widest shadow-xl shadow-primary/30 transition-all duration-300 ease-out hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-px active:scale-100 outline-none focus:ring-4 focus:ring-primary/40 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0 disabled:shadow-none"
          >
            Review & Finalize
          </button>
        </div>
      </div>
    </div>
  );
};
