import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowDownWideNarrow,
  ArrowLeftFromLine,
  ArrowRightFromLine,
  ArrowUpDown,
  ArrowUpWideNarrow,
  Bell,
  Box,
  PackagePlus,
  Search,
  Warehouse,
  X,
} from 'lucide-react';
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
  sortBy: string;
  setSortBy: (val: string) => void;
  onAddProduct: (product: Product) => void;
  canAddProducts: boolean;
  requestCountMap: Record<string, number>;
}

export const RSQItemExplorer: React.FC<RSQItemExplorerProps> = ({
  productSearch,
  setProductSearch,
  displayProducts,
  sortBy,
  setSortBy,
  onAddProduct,
  canAddProducts,
  requestCountMap,
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

  const prioritizedProducts = (() => {
    const notifiedIds = new Set(notifications.map(n => n.productId));
    const notified = displayProducts.filter(p => notifiedIds.has(p.id));
    const rest = displayProducts.filter(p => !notifiedIds.has(p.id));
    return [...notified, ...rest];
  })();

  return (
    <aside className="sticky top-4 rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-700">Step 3</p>
            <h2 className="text-lg font-semibold text-slate-950">Material Picker</h2>
            <p className="mt-1 text-sm text-slate-500">Search inventory, check stock, then add items to the requisition.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 tabular-nums">
            {displayProducts.length} found
          </span>
        </div>

        <div className="mt-4">
          <label htmlFor="rsq-product-search" className="mb-1.5 block text-sm font-semibold text-slate-800">Search Products</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              id="rsq-product-search"
              name="productSearch"
              type="search"
              autoComplete="off"
              placeholder="Product name or SKU"
              value={productSearch}
              onChange={e => setProductSearch(e.target.value.toUpperCase())}
              className="min-h-11 w-full rounded-md border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm font-medium text-slate-950 shadow-sm transition-colors placeholder:text-slate-400 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" aria-label="Sort products">
          {sortOptions.map(opt => {
            const Icon = opt.icon;
            const active = sortBy === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSortBy(opt.value)}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  active
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                aria-pressed={active}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {opt.label}
              </button>
            );
          })}
        </div>

        {!canAddProducts && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Add at least one employee before adding materials from this picker.</span>
          </div>
        )}
      </div>

      <div className="max-h-[calc(100dvh-18rem)] overflow-y-auto p-4 custom-scrollbar">
        {notifications.length > 0 && (
          <div className="mb-4 space-y-2" aria-label="Stock alerts">
            {notifications.map(n => {
              const isIn = n.type === 'STOCK_IN';
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 rounded-md border p-3 ${
                    isIn ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isIn ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {isIn ? <ArrowRightFromLine className="h-4 w-4" aria-hidden="true" /> : <ArrowLeftFromLine className="h-4 w-4" aria-hidden="true" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-950">{n.productName}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{n.message}</p>
                    <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${isIn ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {isIn ? 'Stock In' : 'Stock Out'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismissNotification(n.id)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    aria-label={`Dismiss ${n.productName} alert`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-3">
          {prioritizedProducts.map((product) => {
            const isNotified = notifications.some(n => n.productId === product.id);
            const notification = notifications.find(n => n.productId === product.id);
            const stock = product.totalStock || 0;
            const requestCount = requestCountMap[product.id] || 0;
            return (
              <div
                key={product.id}
                className={`rounded-md border bg-white p-3 shadow-sm transition-colors ${
                  isNotified ? 'border-amber-300 bg-amber-50' : 'border-slate-200 hover:border-blue-200'
                }`}
              >
                <div className="flex gap-3">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border ${isNotified ? 'border-amber-200 bg-amber-100' : 'border-slate-200 bg-slate-50'}`}>
                    {product.imageUrl ? (
                      <img src={product.imageUrl} width={56} height={56} className="h-full w-full object-cover" alt={product.name} loading="lazy" />
                    ) : (
                      <Box className="h-6 w-6 text-slate-300" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="min-w-0 break-words text-sm font-semibold text-slate-950">{product.name}</h3>
                      {isNotified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          <Bell className="h-3 w-3" aria-hidden="true" />
                          Alert
                        </span>
                      )}
                      {requestCount > 0 && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          {requestCount} recent
                        </span>
                      )}
                    </div>
                    <p className="mt-1 break-words text-xs leading-5 text-slate-500">{product.description || 'No description'}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {stock} {product.unit || 'PCS'} available
                      </span>
                      {notification && (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${notification.type === 'STOCK_IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {notification.type === 'STOCK_IN' ? 'Stock In' : 'Stock Out'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onAddProduct(product)}
                  disabled={!canAddProducts}
                  className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <PackagePlus className="h-4 w-4" aria-hidden="true" />
                  Add to Request
                </button>
              </div>
            );
          })}

          {displayProducts.length === 0 && notifications.length === 0 && (
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-white text-slate-400 shadow-sm">
                <Search className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700">No products found</p>
              <p className="mt-1 text-sm text-slate-500">Try another product name or SKU.</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
