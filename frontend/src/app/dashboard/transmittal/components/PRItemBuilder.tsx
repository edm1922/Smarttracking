import React from 'react';
import { ClipboardList, Trash2, Search, Package } from 'lucide-react';
import { PRItem } from '../types';
import api from '@/lib/api';

interface PRItemBuilderProps {
  prItems: PRItem[];
  addPrRow: (initialData?: Partial<PRItem>) => void;
  updatePrItem: (id: string, field: string, value: any) => void;
  removePrItem: (id: string) => void;
  setPrItems: (items: PRItem[]) => void;
  savePR: () => void;
  editingPrId: string | null;
}

export const PRItemBuilder: React.FC<PRItemBuilderProps> = ({
  prItems,
  addPrRow,
  updatePrItem,
  removePrItem,
  setPrItems,
  savePR,
  editingPrId,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);

  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.get('/products', { params: { search: searchQuery, take: 8 } });
        const items = res.data.data || res.data;
        setSearchResults(items);
        setShowDropdown(items.length > 0);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getTotalStock = (p: any) =>
    (p.stocks || []).reduce((sum: number, s: any) => sum + s.quantity, 0);

  const selectProduct = (product: any) => {
    const totalStock = getTotalStock(product);
    addPrRow({
      name: product.name,
      description: product.description || '',
      unit: product.unit,
      estimatedCost: product.price || 0,
      currentStock: totalStock,
    });
    setSearchQuery('');
    setShowDropdown(false);
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
          <ClipboardList className="mr-2 h-4 w-4" />
          Item Builder
        </h3>
        <button 
          onClick={() => addPrRow()} 
          className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-lg transition-all"
        >
          + Add Custom Row
        </button>
      </div>

      <div className="relative mb-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-blue-500/30 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-gray-300"
            placeholder="Search inventory items to add..."
          />
          {searchLoading && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {showDropdown && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-xl shadow-gray-200/50 max-h-60 overflow-y-auto custom-scrollbar">
            {searchResults.map((product: any) => {
              const totalStock = getTotalStock(product);
              return (
                <button
                  key={product.id}
                  type="button"
                  onMouseDown={() => selectProduct(product)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-50 last:border-b-0"
                >
                  <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                    <Package className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900 truncate">{product.name}</div>
                    <div className="text-[10px] text-gray-400 truncate">{product.description || product.sku}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-gray-900">{totalStock}</div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">in stock</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-gray-100">
              <th className="pb-3 font-black uppercase w-12 text-center">No.</th>
              <th className="pb-3 font-black uppercase">Description</th>
              <th className="pb-3 font-black uppercase w-16 text-center">Stock</th>
              <th className="pb-3 font-black uppercase w-20 text-center">Unit</th>
              <th className="pb-3 font-black uppercase w-20 text-center">Qty</th>
              <th className="pb-3 font-black uppercase w-32 text-right">Est. Cost</th>
              <th className="pb-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {prItems.map((item, idx) => (
              <tr key={item.id} className="group hover:bg-gray-50/50 transition-colors">
                <td className="py-3 text-gray-400 font-bold text-center">{idx + 1}</td>
                <td className="py-3 px-2">
                  <input 
                    type="text" 
                    value={item.name || ''} 
                    onChange={e => updatePrItem(item.id, 'name', e.target.value)} 
                    className="w-full bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 p-2 rounded-lg transition-all font-bold text-gray-900" 
                    placeholder="Item name..."
                  />
                  <input 
                    type="text" 
                    value={item.description || ''} 
                    onChange={e => updatePrItem(item.id, 'description', e.target.value)} 
                    className="w-full bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 px-2 pb-1 rounded-lg transition-all text-[10px] text-gray-400" 
                    placeholder="Description..."
                  />
                </td>
                <td className="py-3 text-center">
                  <span className="text-sm font-black text-gray-700">{item.currentStock ?? 0}</span>
                </td>
                <td className="py-3">
                  <input 
                    type="text" 
                    value={item.unit || ''} 
                    onChange={e => updatePrItem(item.id, 'unit', e.target.value)} 
                    className="w-full bg-transparent text-center outline-none focus:bg-white focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 p-2 rounded-lg transition-all font-medium text-gray-500" 
                  />
                </td>
                <td className="py-3">
                  <input 
                    type="number" 
                    value={isNaN(item.quantity) ? '' : item.quantity} 
                    onChange={e => updatePrItem(item.id, 'quantity', parseInt(e.target.value) || 0)} 
                    className="w-full bg-transparent text-center font-black outline-none focus:bg-white focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 p-2 rounded-lg transition-all text-blue-600" 
                  />
                </td>
                <td className="py-3">
                  <div className="flex items-center justify-end">
                    <span className="text-gray-400 mr-1">₱</span>
                    <input 
                      type="number" 
                      value={isNaN(item.estimatedCost) ? '' : item.estimatedCost} 
                      onChange={e => updatePrItem(item.id, 'estimatedCost', parseFloat(e.target.value) || 0)} 
                      className="w-24 bg-transparent text-right outline-none focus:bg-white focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 p-2 rounded-lg transition-all font-mono" 
                    />
                  </div>
                </td>
                <td className="py-3 text-right">
                  <button 
                    onClick={() => removePrItem(item.id)} 
                    className="text-gray-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {prItems.length === 0 && (
              <tr>
                <td colSpan={7} className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center">
                      <ClipboardList className="h-6 w-6 text-gray-300" />
                    </div>
                    <div className="text-sm text-gray-400 font-medium italic">Search inventory above or click "+ Add Custom Row" to start.</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-xs font-black text-gray-400 uppercase tracking-widest">
          Total Amount: <span className="text-lg text-blue-600 ml-2">₱{prItems.reduce((acc, item) => acc + (item.quantity * item.estimatedCost), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <button 
            onClick={() => setPrItems([])} 
            className="flex-1 md:flex-none px-6 py-2 text-xs font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors"
          >
            Clear All
          </button>
          <button 
            onClick={savePR} 
            className="flex-1 md:flex-none px-8 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all active:translate-y-0"
          >
            {editingPrId ? 'Update PR Record' : 'Save to History'}
          </button>
        </div>
      </div>
    </div>
  );
};
