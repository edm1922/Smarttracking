import React from 'react';
import { 
  Search, ChevronDown, ChevronUp, Box, MapPin, 
  Clock, User, ArrowUpRight, LayoutGrid, Package, Info
} from 'lucide-react';

interface UnitTrackingInventoryProps {
  inventory: any[];
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  expandedProduct: string | null;
  setExpandedProduct: (id: string | null) => void;
  productFilters: any;
  toggleFilter: (pName: string, key: string, val: string) => void;
  getFilteredQty: (p: any) => number;
  invPage: number;
  setInvPage: (page: number) => void;
  invTotal: number;
  pageSize: number;
}

export const UnitTrackingInventory: React.FC<UnitTrackingInventoryProps> = ({
  inventory,
  searchTerm,
  setSearchTerm,
  expandedProduct,
  setExpandedProduct,
  productFilters,
  toggleFilter,
  getFilteredQty,
  invPage,
  setInvPage,
  invTotal,
  pageSize,
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Search Bar */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-xl shadow-gray-200/50 no-print">
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="SEARCH INVENTORY BY PRODUCT NAME..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value.toUpperCase())}
            className="w-full bg-gray-50 border-2 border-transparent rounded-[2rem] pl-16 pr-8 py-6 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 gap-6">
        {inventory.map(product => {
          const isExpanded = expandedProduct === product.name;
          const filteredQty = getFilteredQty(product);
          const filters = productFilters[product.name] || {};

          return (
            <div key={product.name} className={`bg-white rounded-[2.5rem] border transition-all overflow-hidden ${
              isExpanded 
              ? 'border-primary shadow-2xl shadow-primary/10 ring-4 ring-primary/5' 
              : 'border-gray-100 hover:border-gray-200 shadow-xl shadow-gray-200/50'
            }`}>
              <div 
                onClick={() => setExpandedProduct(isExpanded ? null : product.name)}
                className="p-8 cursor-pointer flex items-center justify-between gap-6"
              >
                <div className="flex items-center gap-6">
                  <div className={`h-16 w-16 rounded-2xl flex items-center justify-center transition-all ${
                    isExpanded ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-gray-50 text-gray-400'
                  }`}>
                    <Package className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{product.name}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                      {product.items.length} Asset Identifiers • Total Batch Qty
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-10">
                  <div className="text-right">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Stock Level</p>
                    <div className="flex items-center gap-3 justify-end">
                      <span className={`text-2xl font-black ${product.totalQty <= (product.threshold || 50) ? 'text-red-500' : 'text-gray-900'}`}>
                        {filteredQty}
                      </span>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-lg">
                        {product.unit || 'Units'}
                      </span>
                    </div>
                  </div>
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all ${
                    isExpanded ? 'bg-primary/5 text-primary rotate-180' : 'bg-gray-50 text-gray-300'
                  }`}>
                    <ChevronDown className="h-6 w-6" />
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 p-8 space-y-10 animate-in slide-in-from-top-4 duration-500">
                  {/* Dynamic Spec Filter Tags */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <LayoutGrid className="h-3 w-3" /> Filter by Specifications
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(product.specs || {}).map(([key, values]: [string, any]) => (
                        <div key={key} className="flex flex-wrap gap-2 items-center">
                          <span className="text-[9px] font-black text-gray-300 uppercase tracking-tighter mr-1">{key}:</span>
                          {Array.from(values as Set<string>).map(val => (
                            <button
                              key={val}
                              onClick={(e) => { e.stopPropagation(); toggleFilter(product.name, key, val); }}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                                filters[key] === val
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      ))}
                      {Object.keys(filters).length > 0 && (
                        <button 
                          onClick={() => toggleFilter(product.name, '', '')}
                          className="px-4 py-2 rounded-xl text-[10px] font-black text-red-500 bg-red-50 hover:bg-red-100 transition-all uppercase"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Asset List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {product.items
                      .filter((item: any) => {
                        return Object.entries(filters).every(([fKey, fVal]) => {
                          return item.fieldValues.some((fv: any) => {
                            if (fv.name !== fKey) return false;
                            const v = fv.value;
                            if (v && typeof v === 'object' && v.useUnitQty) return String(v.main || '') === fVal;
                            return String(v) === fVal;
                          });
                        });
                      })
                      .map((item: any) => (
                      <div key={item.slug} className="bg-gray-50/50 border border-gray-100 rounded-[2rem] p-6 hover:bg-white hover:shadow-xl hover:shadow-gray-200/50 transition-all group border-l-4 border-l-primary/10 hover:border-l-primary">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100">
                              <Box className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-gray-900 font-mono tracking-tight">{item.slug}</p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Asset Hash</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-gray-900 leading-none">{item.qty}</p>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{item.unit}</p>
                          </div>
                        </div>

                        <div className="space-y-2 mb-6">
                          {item.fieldValues.map((fv: any) => {
                            const val = fv.value;
                            const displayVal = val && typeof val === 'object' ? (val.main ?? val.qty) : val;
                            if (!displayVal) return null;
                            return (
                              <div key={fv.fieldId} className="flex justify-between items-center text-[10px]">
                                <span className="font-bold text-gray-400 uppercase tracking-tighter">{fv.name}</span>
                                <span className="font-black text-gray-900 uppercase tracking-tight">{displayVal}</span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="pt-4 border-t border-gray-100/50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-gray-300" />
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Updated {new Date(item.updatedAt).toLocaleDateString()}</span>
                          </div>
                          <button className="h-8 w-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-300 hover:text-primary hover:border-primary transition-all shadow-sm">
                            <ArrowUpRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {invTotal > pageSize && (
        <div className="flex justify-center pt-10">
          <div className="bg-white px-6 py-3 rounded-full border border-gray-100 shadow-xl shadow-gray-200/50 flex gap-2">
            {Array.from({ length: Math.ceil(invTotal / pageSize) }).map((_, i) => (
              <button
                key={i}
                onClick={() => setInvPage(i + 1)}
                className={`h-10 w-10 rounded-xl text-[10px] font-black transition-all ${
                  invPage === i + 1 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
