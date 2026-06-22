'use client';

import { Box, MapPin, Eye, X, ArrowDownLeft, Database, Package, Plus, ArrowUpRight } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Product } from '../types';

interface ProductTableProps {
  products: Product[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  isFirstVisit?: boolean;
  selectedIds: string[];
  toggleSelect: (product: Product) => void;
  toggleSelectAll: () => void;
  handleRowDoubleClick: (product: Product) => void;
  handleOpenStockModal: (product: Product, type: 'IN' | 'OUT') => void;
  setPreviewImageUrl: (url: string) => void;
  setIsPreviewOpen: (open: boolean) => void;
  page: number;
  pageSize: number;
  totalProducts: number;
  setPage: (page: number | ((prev: number) => number)) => void;
  searchTerm: string;
  onOpenProductModal: () => void;
}

export function ProductTable({
  products,
  loading,
  error,
  onRetry,
  isFirstVisit = false,
  selectedIds,
  toggleSelect,
  toggleSelectAll,
  handleRowDoubleClick,
  handleOpenStockModal,
  setPreviewImageUrl,
  setIsPreviewOpen,
  page,
  pageSize,
  totalProducts,
  setPage,
  searchTerm,
  onOpenProductModal
}: ProductTableProps) {
  
  const getTotalStock = (p: Product) => p.stocks.reduce((sum, s) => sum + s.quantity, 0);

  return (
    <div className="space-y-4">
      <div className="table-container overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left w-10">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                  checked={products.length > 0 && products.every(p => selectedIds.includes(p.id))}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock Info</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock Breakdown</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actual Stock</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Visibility</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-20 text-center"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></td></tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center">
                  <p className="text-sm text-red-500 mb-4">Error: {error}</p>
                  {onRetry && (
                    <button onClick={onRetry} className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-primary-dark transition-all">
                      Retry
                    </button>
                  )}
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-0">
                  {isFirstVisit && !searchTerm ? (
                    <div className="flex flex-col items-center py-20 px-6 text-center">
                      <div className="relative mb-8">
                        <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl" />
                        <div className="relative bg-white h-24 w-24 rounded-3xl shadow-xl shadow-gray-200/50 flex items-center justify-center">
                          <Database className="h-12 w-12 text-primary/40" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">Your inventory is ready</h3>
                      <p className="text-sm text-gray-500 max-w-md mb-10 leading-relaxed font-medium">
                        Products are the foundation of your inventory. Add your first item, then record stock quantities and release them to staff as needed.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-xl mb-10">
                        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 text-left">
                          <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
                            <Plus className="h-5 w-5 text-primary" />
                          </div>
                          <h4 className="text-sm font-bold text-gray-900 mb-1">Add Products</h4>
                          <p className="text-xs text-gray-500 leading-relaxed">Create items with SKU, unit, and threshold settings</p>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 text-left">
                          <div className="h-10 w-10 bg-green-50 rounded-xl flex items-center justify-center mb-3">
                            <Package className="h-5 w-5 text-green-600" />
                          </div>
                          <h4 className="text-sm font-bold text-gray-900 mb-1">Record Stock</h4>
                          <p className="text-xs text-gray-500 leading-relaxed">Use Stock IN to log initial quantities per location</p>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 text-left">
                          <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
                            <ArrowUpRight className="h-5 w-5 text-amber-600" />
                          </div>
                          <h4 className="text-sm font-bold text-gray-900 mb-1">Release Items</h4>
                          <p className="text-xs text-gray-500 leading-relaxed">Create release manifests for staff or departments</p>
                        </div>
                      </div>
                      <button
                        onClick={onOpenProductModal}
                        className="inline-flex items-center px-8 py-4 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Product
                      </button>
                    </div>
                  ) : (
                    <EmptyState 
                      icon={Database}
                      title={searchTerm ? "No matches found" : "Inventory is Empty"}
                      description={searchTerm ? `No products match "${searchTerm}". Try a different search term or clear the filter.` : "You haven't added any stock items yet."}
                      action={searchTerm ? undefined : {
                        label: "Add First Product",
                        onClick: onOpenProductModal
                      }}
                    />
                  )}
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr 
                  key={product.id} 
                  onDoubleClick={() => handleRowDoubleClick(product)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRowDoubleClick(product); } }}
                  tabIndex={0}
                  className={`hover:bg-gray-50 transition-colors cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-inset ${selectedIds.includes(product.id) ? 'bg-primary/5' : ''}`}
                  role="button"
                  aria-label={`Edit ${product.name}`}
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                      checked={selectedIds.includes(product.id)}
                      onChange={() => toggleSelect(product)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-primary/5 rounded-lg flex items-center justify-center">
                        <Box className="h-5 w-5 text-primary" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 max-w-[200px] truncate" title={product.name}>{product.name}</div>
                        <div className="text-xs font-mono text-gray-500">{product.sku}</div>
                        {product.description && (
                          <div className="text-xs text-gray-500 italic mt-0.5 line-clamp-1 max-w-[200px]">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {product.stocks.length > 0 ? product.stocks.map(s => (
                        <div key={s.locationId} className="flex items-center bg-gray-100 px-2 py-1 rounded text-xs font-medium border border-gray-200 max-w-[220px]">
                          <MapPin className="h-3 w-3 mr-1 text-gray-500 shrink-0" />
                          <span className="text-gray-600 mr-1 truncate">{s.location.name}:</span>
                          <span className="font-bold text-gray-900 shrink-0">{s.quantity}</span>
                        </div>
                      )) : <span className="text-xs text-gray-500 italic">No stock in any area</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className={`text-sm font-medium w-fit ${
                        getTotalStock(product) < product.threshold 
                          ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100' 
                          : getTotalStock(product) === product.threshold 
                            ? 'text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100' 
                            : 'text-gray-900'
                      }`}>
                        {getTotalStock(product)} / {product.threshold} {product.unit}
                      </span>
                      {getTotalStock(product) < product.threshold && (
                        <span className="text-xs font-semibold text-red-500 mt-1 uppercase tracking-tighter animate-pulse">Needs Restock</span>
                      )}
                      {getTotalStock(product) === product.threshold && (
                        <span className="text-xs font-semibold text-orange-500 mt-1 uppercase tracking-tighter">Low Stock</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${product.showInInventory ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>
                      {product.showInInventory ? (
                        <>
                          <Eye className="h-3 w-3 mr-1" /> Visible
                        </>
                      ) : (
                        <>
                          <X className="h-3 w-3 mr-1" /> Hidden
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      {product.imageUrl && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImageUrl(product.imageUrl!);
                            setIsPreviewOpen(true);
                          }}
                          className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all"
                          aria-label={`View product image for ${product.name}`}
                          title="View Product Image"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenStockModal(product, 'IN');
                        }}
                        className="inline-flex items-center px-2.5 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-md hover:bg-green-100 transition-colors"
                      >
                        <ArrowDownLeft className="h-3.5 w-3.5 mr-1" />
                        IN
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-xs font-medium text-gray-500">
          Showing {totalProducts === 0 ? 0 : ((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalProducts)} of {totalProducts} entries
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p: number) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold uppercase disabled:opacity-50 hover:bg-gray-50 transition-colors shadow-sm"
            aria-label="Previous page"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p: number) => p + 1)}
            disabled={page * pageSize >= totalProducts}
            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold uppercase disabled:opacity-50 hover:bg-gray-50 transition-colors shadow-sm"
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
