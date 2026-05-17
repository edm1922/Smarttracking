'use client';

import { Box, MapPin, Eye, X, ArrowDownLeft, Database } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Product } from '../types';

interface ProductTableProps {
  products: Product[];
  loading: boolean;
  error: string | null;
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
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Stock Info</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Stock Breakdown</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actual Stock</th>
              <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Visibility</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-20 text-center"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></td></tr>
            ) : error ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-red-500">Error: {error}</td></tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-0">
                  <EmptyState 
                    icon={Database}
                    title={searchTerm ? "No matches found" : "Inventory is Empty"}
                    description={searchTerm ? `No products match your search for "${searchTerm}".` : "You haven't added any stock items yet. Start by adding a new product to track."}
                    action={searchTerm ? undefined : {
                      label: "Add First Product",
                      onClick: onOpenProductModal
                    }}
                  />
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr 
                  key={product.id} 
                  onDoubleClick={() => handleRowDoubleClick(product)}
                  className={`hover:bg-gray-50 transition-colors cursor-pointer select-none ${selectedIds.includes(product.id) ? 'bg-primary/5' : ''}`}
                  title="Double click to edit or delete"
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
                        <div className="text-sm font-bold text-gray-900">{product.name}</div>
                        <div className="text-xs font-mono text-gray-400">{product.sku}</div>
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
                        <div key={s.locationId} className="flex items-center bg-gray-100 px-2 py-1 rounded text-xs font-medium border border-gray-200">
                          <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                          <span className="text-gray-600 mr-1">{s.location.name}:</span>
                          <span className="font-bold text-gray-900">{s.quantity}</span>
                        </div>
                      )) : <span className="text-xs text-gray-400 italic">No stock in any area</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold w-fit ${
                        getTotalStock(product) < product.threshold 
                          ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100' 
                          : getTotalStock(product) === product.threshold 
                            ? 'text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100' 
                            : 'text-gray-900'
                      }`}>
                        {getTotalStock(product)} / {product.threshold} {product.unit}
                      </span>
                      {getTotalStock(product) < product.threshold && (
                        <span className="text-xs font-bold text-red-500 mt-1 uppercase tracking-tighter animate-pulse">Needs Restock</span>
                      )}
                      {getTotalStock(product) === product.threshold && (
                        <span className="text-xs font-bold text-orange-500 mt-1 uppercase tracking-tighter">Low Stock</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-widest ${product.showInInventory ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
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
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
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
                        className="inline-flex items-center px-2.5 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-md hover:bg-green-100 transition-colors"
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
        <div className="text-xs font-bold text-gray-500">
          Showing {totalProducts === 0 ? 0 : ((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalProducts)} of {totalProducts} entries
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p: number) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-black uppercase disabled:opacity-50 hover:bg-gray-50 transition-colors shadow-sm"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p: number) => p + 1)}
            disabled={page * pageSize >= totalProducts}
            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-black uppercase disabled:opacity-50 hover:bg-gray-50 transition-colors shadow-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
