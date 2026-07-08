'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, AlertTriangle, Clock, CheckCircle, RefreshCw, ChevronRight, TrendingUp } from 'lucide-react';
import api from '@/lib/api';

interface StockHealthWidgetProps {
  totalItems: number;
  pendingRequests: number;
}

interface LowStockItem {
  productId: string;
  quantity: number;
  requestCount: number;
  totalRequestedQty: number;
  product: {
    name: string;
    description: string | null;
    threshold: number;
  };
}

export const StockHealthWidget: React.FC<StockHealthWidgetProps> = ({
  totalItems,
  pendingRequests,
}) => {
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [lowStockLoading, setLowStockLoading] = useState(true);
  const [lowStockError, setLowStockError] = useState(false);
  const [filterMode, setFilterMode] = useState<'demand' | 'all'>('demand');

  const fetchLowStock = async () => {
    setLowStockLoading(true);
    setLowStockError(false);
    try {
      const res = await api.get('/reports/low-stock');
      setLowStockItems(res.data ?? []);
    } catch {
      setLowStockError(true);
    } finally {
      setLowStockLoading(false);
    }
  };

  useEffect(() => {
    fetchLowStock();
  }, []);

  const demandItems = lowStockItems.filter((i) => i.requestCount > 0);
  const displayItems = filterMode === 'demand' ? demandItems.slice(0, 5) : lowStockItems;

  const lowCount = lowStockItems.length;
  const demandLowCount = Math.min(demandItems.length, 5);

  return (
    <section className="space-y-6">
      <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] flex items-center">
        <Package className="mr-2 h-4 w-4 text-primary/60" /> STOCK HEALTH OVERVIEW
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 no-print">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-6 transition-shadow hover:shadow-md">
          <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Package className="h-8 w-8" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Total Products</p>
            <p className="text-2xl font-bold text-gray-900">{totalItems.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-6 transition-shadow hover:shadow-md">
          <div className="h-16 w-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <Clock className="h-8 w-8" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Pending Requests</p>
            <p className="text-2xl font-bold text-gray-900">{pendingRequests.toLocaleString()}</p>
          </div>
        </div>

        <div className={`p-8 rounded-3xl border shadow-sm flex items-center gap-6 transition-shadow hover:shadow-md ${
          lowCount > 0
          ? 'bg-red-50 border-red-100'
          : 'bg-white border-gray-100'
        }`}>
          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${
            lowCount > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-50 text-gray-500'
          }`}>
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${lowCount > 0 ? 'text-red-500/80' : 'text-gray-500'}`}>Low Stock Alerts</p>
            <p className={`text-2xl font-bold ${lowCount > 0 ? 'text-red-600/80' : 'text-gray-900'}`}>{lowCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden transition-shadow">
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center">
              <TrendingUp className="mr-2 h-4 w-4 text-red-400" /> High-Demand Stock Alerts
            </h3>
            <div className="flex items-center bg-gray-100 rounded-xl p-0.5 gap-0.5">
              <button
                onClick={() => setFilterMode('demand')}
                className={`px-3 py-1.5 rounded-[10px] text-[10px] font-bold uppercase tracking-wider transition-all ${
                  filterMode === 'demand'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                High Demand ({demandLowCount})
              </button>
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-[10px] text-[10px] font-bold uppercase tracking-wider transition-all ${
                  filterMode === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All ({lowCount})
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lowStockError && (
              <button
                onClick={fetchLowStock}
                className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                RETRY
              </button>
            )}
            {lowCount > 0 && (
              <Link
                href="/dashboard/products"
                className="flex items-center gap-1 text-[10px] font-bold text-primary/80 hover:text-primary transition-colors"
              >
                VIEW ALL <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {lowStockLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} aria-hidden="true" className="h-12 animate-pulse rounded-xl bg-gray-100/60" />
              ))}
            </div>
          ) : lowStockError ? (
            <div className="p-8 text-center">
              <div className="max-w-sm mx-auto">
                <AlertTriangle className="h-10 w-10 text-red-400/70 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-700 mb-1">Failed to load stock alerts</p>
                <p className="text-xs text-gray-500 mb-4">Could not connect to the inventory service.</p>
                <button
                  onClick={fetchLowStock}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold shadow-sm hover:bg-primary-dark transition-all"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry Connection
                </button>
              </div>
            </div>
          ) : displayItems.length === 0 ? (
            <div className="py-16 text-center">
              <div className="h-14 w-14 mx-auto mb-4 bg-green-50 rounded-2xl flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-green-500" />
              </div>
              <p className="text-sm font-bold text-gray-700 mb-1">
                {filterMode === 'demand' ? 'No High-Demand Items Low on Stock' : 'All Stock Levels Healthy'}
              </p>
              <p className="text-xs text-gray-500 italic">
                {filterMode === 'demand'
                  ? 'All low-stock items have zero request history. Switch to "All" to see them.'
                  : 'No products below their restock threshold.'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 py-4 px-8">Product</th>
                  <th className="text-center text-[10px] font-bold uppercase tracking-wider text-gray-500 py-4 px-6">Current Stock</th>
                  <th className="text-center text-[10px] font-bold uppercase tracking-wider text-gray-500 py-4 px-6">Threshold</th>
                  <th className="text-center text-[10px] font-bold uppercase tracking-wider text-gray-500 py-4 px-6">Times Requested</th>
                  <th className="text-center text-[10px] font-bold uppercase tracking-wider text-gray-500 py-4 px-6">Status</th>
                  <th className="text-right text-[10px] font-bold uppercase tracking-wider text-gray-500 py-4 px-8">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayItems.map((item, idx) => {
                  const isOutOfStock = item.quantity === 0;
                  const deficit = (item.product?.threshold || 0) - item.quantity;
                  const hasDemand = item.requestCount > 0;
                  return (
                    <tr key={`${item.productId}-${idx}`} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-4 px-8">
                        <div className="flex items-center gap-2">
                          <div>
                            <span className="text-sm font-bold text-gray-900">{item.product?.name || 'Unknown'}</span>
                            {item.product?.description && (
                              <p className="text-[11px] font-medium text-gray-500 mt-0.5">{item.product.description}</p>
                            )}
                          </div>
                          {hasDemand && (
                            <TrendingUp className="h-3.5 w-3.5 text-red-400 shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`text-sm font-bold ${isOutOfStock ? 'text-red-600' : 'text-amber-600'}`}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="text-sm font-bold text-gray-500">{item.product?.threshold || 0}</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                          <span className={`text-sm font-bold ${hasDemand ? 'text-gray-900' : 'text-gray-500'}`}>
                          {item.requestCount}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          isOutOfStock
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : hasDemand
                              ? 'bg-amber-50 text-amber-600 border border-amber-100'
                              : 'bg-gray-50 text-gray-500 border border-gray-100'
                        }`}>
                          {isOutOfStock ? 'Out of Stock' : hasDemand ? `Low (${deficit} below threshold)` : 'Low (no demand)'}
                        </span>
                      </td>
                      <td className="py-4 px-8 text-right">
                          <Link
                            href={`/dashboard/products?selected=${item.productId}`}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-primary/80 hover:text-primary transition-colors"
                          >
                            VIEW <ChevronRight className="h-3 w-3" />
                          </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
};
