import React, { useState, useEffect } from 'react';
import { Search, Box, ChevronRight, Info, ArrowUpDown, ArrowUpWideNarrow, ArrowDownWideNarrow, Warehouse, Bell, X, ArrowRightFromLine, ArrowLeftFromLine } from 'lucide-react';
import { Product } from './RSQTypes';
import api from '@/lib/api';

const sortOptions = [
  { value: 'name-asc', label: 'A-Z', icon: ArrowUpWideNarrow },
  { value: 'name-desc', label: 'Z-A', icon: ArrowDownWideNarrow },
  { value: 'stock-high', label: 'High Stock', icon: Warehouse },
  { value: 'stock-low', label: 'Low Stock', icon: ArrowUpDown },
];

interface Notification {
  id: string;
  type: string;
  productId: string;
  productName: string;
  quantity: number;
  message: string;
  durationHours: number;
  createdAt: string;
  expiresAt: string;
}

interface RSQItemExplorerProps {
  productSearch: string;
  setProductSearch: (val: string) => void;
  displayProducts: Product[];
  setViewItem: (item: Product | null) => void;
  sortBy: string;
  setSortBy: (val: string) => void;
}

export const RSQItemExplorer: React.FC<RSQItemExplorerProps> = ({
  productSearch,
  setProductSearch,
  displayProducts,
  setViewItem,
  sortBy,
  setSortBy,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/stock-notifications/active');
      setNotifications(res.data || []);
    } catch {}
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col h-full transition-all duration-500">
      <div className="p-6 border-b border-gray-100 space-y-4">
        <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-widest flex items-center">
          <div className="mr-3 p-1.5 bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-lg">
            <Box className="h-5 w-5 text-blue-600" />
          </div>
          Inventory Explorer
        </h2>
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="SEARCH PRODUCTS OR SKU..."
            value={productSearch}
            onChange={e => setProductSearch(e.target.value.toUpperCase())}
            className="w-full bg-gray-50/50 border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-xs font-semibold text-gray-900 outline-none hover:border-gray-300 hover:bg-white focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 placeholder:text-gray-400"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {sortOptions.map(opt => {
            const Icon = opt.icon;
            const active = sortBy === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  active
                    ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-3 w-3" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar max-h-[85vh] space-y-3">
        {notifications.length > 0 && (
          <div className="space-y-2 mb-4">
            {notifications.map(n => {
              const isIn = n.type === 'STOCK_IN';
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 p-4 rounded-2xl border shadow-sm animate-in slide-in-from-top-2 ${
                    isIn
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isIn ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {isIn ? <ArrowRightFromLine className="h-4 w-4" /> : <ArrowLeftFromLine className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-gray-900 uppercase tracking-wide">{n.productName}</p>
                    <p className="text-[9px] font-bold mt-0.5">{n.message}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isIn ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {isIn ? 'STOCK IN' : 'STOCK OUT'}
                      </span>
                      <span className="text-[8px] font-medium text-gray-400">
                        {Math.ceil((new Date(n.expiresAt).getTime() - Date.now()) / 3600000)}h remaining
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => dismissNotification(n.id)}
                    className="p-1 text-gray-400 hover:text-gray-700 transition-colors shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {(() => {
            const notifiedIds = new Set(notifications.map(n => n.productId));
            const notified = displayProducts.filter(p => notifiedIds.has(p.id));
            const rest = displayProducts.filter(p => !notifiedIds.has(p.id));
            return [...notified, ...rest];
          })().map((product) => {
            const isNotified = notifications.some(n => n.productId === product.id);
            const notification = notifications.find(n => n.productId === product.id);
            return (
            <div 
              key={product.id}
              className={`group rounded-2xl p-4 flex items-center justify-between transition-all duration-300 ease-out ${
                isNotified
                  ? 'bg-gradient-to-r from-amber-50 to-orange-50/70 border-2 border-amber-300 shadow-lg shadow-amber-200/40 scale-[1.02]'
                  : 'bg-white border border-gray-100 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 hover:scale-[1.01]'
              }`}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center overflow-hidden transition-all ${
                  isNotified
                    ? 'bg-amber-100 border-2 border-amber-300'
                    : 'bg-gray-50 border border-gray-100 group-hover:bg-primary/5 group-hover:border-primary/10'
                }`}>
                  {product.imageUrl ? (
                    <img src={product.imageUrl} className="w-full h-full object-cover" alt={product.name} />
                  ) : (
                    <Box className={`h-6 w-6 ${isNotified ? 'text-amber-500' : 'text-gray-200 group-hover:text-primary'} transition-colors`} />
                  )}
                </div>
                <div className="flex-1 min-w-0 pr-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide line-clamp-1">{product.name}</h4>
                    {isNotified && (
                      <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[8px] font-black uppercase tracking-wider">
                        <Bell className="h-3 w-3" />
                        Alert
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide truncate max-w-[250px]">{product.description || 'NO DESCRIPTION'}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${
                      (product.totalStock || 0) > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {product.totalStock} {product.unit || 'PCS'}
                    </span>
                    {isNotified && notification && (
                      <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        notification.type === 'STOCK_IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {notification.type === 'STOCK_IN' ? 'STOCK IN' : 'STOCK OUT'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setViewItem(product)}
                className={`p-3 rounded-xl transition-all ${
                  isNotified ? 'text-amber-500 hover:bg-amber-100' : 'text-gray-300 hover:text-primary hover:bg-primary/5'
                }`}
                title="View Details"
              >
                <Info className="h-5 w-5" />
              </button>
            </div>
          );
          })}

          {displayProducts.length === 0 && notifications.length === 0 && (
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
