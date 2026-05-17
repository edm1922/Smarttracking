import React from 'react';
import { Search, Box, ChevronRight, Plus, Info } from 'lucide-react';
import { Product } from './RSQTypes';

interface RSQItemExplorerProps {
  productSearch: string;
  setProductSearch: (val: string) => void;
  displayProducts: Product[];
  addItemToCart: (product: Product, available: number) => void;
  setViewItem: (item: Product | null) => void;
}

export const RSQItemExplorer: React.FC<RSQItemExplorerProps> = ({
  productSearch,
  setProductSearch,
  displayProducts,
  addItemToCart,
  setViewItem,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col h-full transition-all duration-500">
      <div className="p-8 border-b border-gray-100 space-y-6">
        <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-widest flex items-center">
          <div className="mr-3 p-1.5 bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-lg">
            <Box className="h-5 w-5 text-blue-600" />
          </div>
          Inventory Explorer
        </h2>
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="SEARCH PRODUCTS OR SKU..."
            value={productSearch}
            onChange={e => setProductSearch(e.target.value.toUpperCase())}
            className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl pl-14 pr-8 py-4 text-xs font-semibold text-gray-900 outline-none hover:border-gray-300 hover:bg-white focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar max-h-[85vh]">
        <div className="grid grid-cols-1 gap-3">
          {displayProducts.map((product) => (
            <div 
              key={product.id} 
              className="group bg-white border border-gray-100 rounded-2xl p-4 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] flex items-center justify-between"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="h-14 w-14 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100 group-hover:bg-primary/5 group-hover:border-primary/10 transition-all">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} className="w-full h-full object-cover" alt={product.name} />
                  ) : (
                    <Box className="h-6 w-6 text-gray-200 group-hover:text-primary transition-colors" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide line-clamp-1 group-hover:text-primary transition-colors">{product.name}</h4>
                  <p className="text-[9px] font-bold text-gray-500 mt-0.5 uppercase tracking-wide truncate max-w-[250px]">{product.description || 'NO DESCRIPTION'}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${
                      (product.totalStock || 0) > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {product.totalStock} {product.unit || 'PCS'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setViewItem(product)}
                  className="p-3 text-gray-300 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                  title="View Details"
                >
                  <Info className="h-5 w-5" />
                </button>
                <button 
                  onClick={() => addItemToCart(product, product.totalStock || 0)}
                  disabled={(product.totalStock || 0) <= 0}
                  className="h-10 w-10 bg-gradient-to-br from-gray-900 to-black text-white rounded-xl flex items-center justify-center shadow-lg shadow-gray-900/20 hover:shadow-xl hover:shadow-gray-900/40 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.05] active:translate-y-px active:scale-100 outline-none focus:ring-4 focus:ring-gray-900/30 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0 disabled:shadow-none"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}

          {displayProducts.length === 0 && (
            <div className="py-20 text-center space-y-4">
              <div className="h-16 w-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto text-gray-300">
                <Search className="h-6 w-6" />
              </div>
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider italic">No matching products found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
