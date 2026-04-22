'use client';

import { useEffect, useState } from 'react';
import { 
  Plus, Search, Box, ArrowDownLeft, ArrowUpRight, 
  History, MapPin, X, Info, Tag, Trash2, User, Calendar, Building2
} from 'lucide-react';
import api from '@/lib/api';

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  price: number;
  threshold: number;
  stocks: {
    locationId: string;
    quantity: number;
    location: { name: string };
  }[];
}

interface Location {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [isEditLogModalOpen, setIsEditLogModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<any | null>(null);
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [editableStock, setEditableStock] = useState(0);
  const [releaseSearchInput, setReleaseSearchInput] = useState('');
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Form states
  const [productForm, setProductForm] = useState({ 
    sku: '', 
    name: '', 
    description: '',
    unit: 'PCS',
    price: 0,
    threshold: 0,
    initialStock: 0,
    initialLocationId: ''
  });
  const [stockForm, setStockForm] = useState({ 
    productId: '', 
    productName: '',
    locationId: '', 
    type: 'IN' as 'IN' | 'OUT', 
    quantity: 1, 
    remarks: '' 
  });
  const [logs, setLogs] = useState<any[]>([]);
  const [releaseForm, setReleaseForm] = useState({
    sourceLocationId: '',
    requestedBy: '',
    whereTo: '',
    remarks: '',
    items: [] as { productId: string, name: string, description: string, available: number, quantity: number }[]
  });
  const [clientDate, setClientDate] = useState('');

  useEffect(() => {
    setClientDate(new Date().toLocaleDateString('en-GB'));
  }, []);

  const [releaseSearchTerm, setReleaseSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      const [productsRes, locationsRes] = await Promise.all([
        api.get('/products'),
        api.get('/locations')
      ]);
      setProducts(productsRes.data);
      setLocations(locationsRes.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenStockModal = (product: Product, type: 'IN' | 'OUT') => {
    setStockForm({
      productId: product.id,
      productName: product.name,
      locationId: locations[0]?.id || '',
      type,
      quantity: 1,
      remarks: ''
    });
    setIsStockModalOpen(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Auto-gen SKU if empty
      const payload = { 
        ...productForm, 
        sku: productForm.sku || `ITM-${Math.random().toString(36).substring(2, 9).toUpperCase()}` 
      };
      await api.post('/products', payload);
      setIsProductModalOpen(false);
      setProductForm({ 
        sku: '', name: '', description: '', unit: 'PCS', price: 0, 
        threshold: 0, initialStock: 0, initialLocationId: locations[0]?.id || '' 
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save product');
    }
  };

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/products/${stockForm.productId}/stock`, {
        locationId: stockForm.locationId,
        type: stockForm.type,
        quantity: stockForm.quantity,
        remarks: stockForm.remarks
      });
      setIsStockModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to process stock');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await api.patch(`/products/${editingProduct.id}`, {
        sku: editingProduct.sku,
        name: editingProduct.name,
        description: editingProduct.description,
        unit: editingProduct.unit,
        price: editingProduct.price,
        threshold: editingProduct.threshold,
      });
      
      // Handle stock adjustment if value changed
      const currentTotal = getTotalStock(editingProduct);
      if (editableStock !== currentTotal) {
        // Find a location to adjust. Default to the first location if product has no stocks yet.
        const locationId = editingProduct.stocks[0]?.locationId || locations[0]?.id;
        if (locationId) {
          await api.patch(`/products/${editingProduct.id}/adjust-stock`, {
            locationId,
            newTotalQuantity: editableStock,
            remarks: 'Manual Stock Adjustment via Product Management'
          });
        }
      }

      setIsEditModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update product');
    }
  };

  const handleDelete = async () => {
    if (!editingProduct) return;
    if (!confirm(`Are you sure you want to delete ${editingProduct.name}? This will remove all stock records and logs associated with it.`)) return;
    try {
      await api.delete(`/products/${editingProduct.id}`);
      setIsEditModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleRowDoubleClick = (product: Product) => {
    setEditingProduct({ ...product });
    setEditableStock(getTotalStock(product));
    setIsEditModalOpen(true);
  };

  const handleReleaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (releaseForm.items.length === 0) return alert('Please add at least one item to release');
    try {
      await api.post('/products/bulk-release', {
        sourceLocationId: releaseForm.sourceLocationId,
        requestedBy: releaseForm.requestedBy,
        whereTo: releaseForm.whereTo,
        remarks: releaseForm.remarks,
        items: releaseForm.items.map(i => ({ productId: i.productId, quantity: i.quantity }))
      });
      setIsReleaseModalOpen(false);
      setReleaseForm({ sourceLocationId: '', requestedBy: '', whereTo: '', remarks: '', items: [] });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to process release');
    }
  };

  const addReleaseItem = (product: Product) => {
    if (releaseForm.items.find(i => i.productId === product.id)) return;
    const available = product.stocks.find(s => s.locationId === releaseForm.sourceLocationId)?.quantity || 0;
    setReleaseForm({
      ...releaseForm,
      items: [...releaseForm.items, {
        productId: product.id,
        name: product.name,
        description: product.description || '',
        available,
        quantity: 1
      }]
    });
  };

  const removeReleaseItem = (productId: string) => {
    setReleaseForm({
      ...releaseForm,
      items: releaseForm.items.filter(i => i.productId !== productId)
    });
  };

  const updateReleaseQty = (productId: string, qty: number) => {
    setReleaseForm({
      ...releaseForm,
      items: releaseForm.items.map(i => i.productId === productId ? { ...i, quantity: qty } : i)
    });
  };

  const fetchLogs = async () => {
    try {
      const res = await api.get('/products/logs');
      setLogs(res.data);
      setIsLogModalOpen(true);
    } catch (err) {
      alert('Failed to fetch logs');
    }
  };

  const handleLogDoubleClick = (log: any) => {
    setEditingLog({ ...log });
    setIsEditLogModalOpen(true);
  };

  const handleEditLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    try {
      await api.patch(`/products/logs/${editingLog.id}`, {
        quantity: editingLog.quantity,
        remarks: editingLog.remarks
      });
      setIsEditLogModalOpen(false);
      const res = await api.get('/products/logs');
      setLogs(res.data);
      fetchData(); // Refresh products to see stock updates
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update log');
    }
  };

  const handleDeleteLog = async () => {
    if (!editingLog) return;
    if (!confirm('Are you sure you want to delete this log? The stock level will be reverted accordingly.')) return;
    try {
      await api.delete(`/products/logs/${editingLog.id}`);
      setIsEditLogModalOpen(false);
      const res = await api.get('/products/logs');
      setLogs(res.data);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete log');
    }
  };

  const filteredLogs = logs.filter(log => 
    log.product.name.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
    (log.product.description || '').toLowerCase().includes(logSearchTerm.toLowerCase()) ||
    (log.remarks || '').toLowerCase().includes(logSearchTerm.toLowerCase()) ||
    log.user?.username.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
    log.location.name.toLowerCase().includes(logSearchTerm.toLowerCase())
  );

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTotalStock = (p: Product) => p.stocks.reduce((sum, s) => sum + s.quantity, 0);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} items?`)) return;
    try {
      await Promise.all(selectedIds.map(id => api.delete(`/products/${id}`)));
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      alert('Failed to delete some items');
    }
  };

  const handleBulkTransmittal = () => {
    const selectedProducts = products.filter(p => selectedIds.includes(p.id));
    localStorage.setItem('pending_transmittal', JSON.stringify(selectedProducts));
    window.location.href = '/dashboard/transmittal';
  };

  return (
    <div className="space-y-8 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500">Bulk inventory tracking and stock management</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchLogs}
            className="inline-flex items-center rounded-md bg-white border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <History className="mr-2 h-4 w-4" />
            Stock Logs
          </button>
          <button
            onClick={() => setIsProductModalOpen(true)}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </button>
          <button
            onClick={() => {
              setReleaseForm({ ...releaseForm, sourceLocationId: locations[0]?.id || '' });
              setIsReleaseModalOpen(true);
            }}
            className="inline-flex items-center rounded-md bg-[#50C878] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#45b068] transition-colors"
          >
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Release Request
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-8 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-sm font-bold border-r border-gray-700 pr-8">{selectedIds.length} items selected</span>
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleBulkTransmittal}
              className="flex items-center text-sm font-bold hover:text-primary transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" /> Create Transmittal
            </button>
            <button 
              onClick={handleBulkDelete}
              className="flex items-center text-sm font-bold text-red-400 hover:text-red-300 transition-colors"
            >
              <X className="h-4 w-4 mr-2" /> Delete Selected
            </button>
          </div>
          <button onClick={() => setSelectedIds([])} className="text-gray-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
      )}

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search products by SKU or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full rounded-md border border-gray-300 bg-white py-3 pl-10 pr-3 text-sm text-gray-900 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="table-container overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left w-10">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                  checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Product Info</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Stock Breakdown</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actual Stock</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">Loading products...</td></tr>
            ) : filteredProducts.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">No products found.</td></tr>
            ) : (
              filteredProducts.map((product) => (
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
                      onChange={() => toggleSelect(product.id)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-primary/5 rounded-lg flex items-center justify-center">
                        <Box className="h-5 w-5 text-primary" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-gray-900">{product.name}</div>
                        <div className="text-[10px] font-mono text-gray-400">{product.sku}</div>
                        {product.description && (
                          <div className="text-[10px] text-gray-500 italic mt-0.5 line-clamp-1 max-w-[200px]">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {product.stocks.length > 0 ? product.stocks.map(s => (
                        <div key={s.locationId} className="flex items-center bg-gray-100 px-2 py-1 rounded text-[10px] font-medium border border-gray-200">
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
                        <span className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter animate-pulse">Needs Restock</span>
                      )}
                      {getTotalStock(product) === product.threshold && (
                        <span className="text-[10px] font-bold text-orange-500 mt-1 uppercase tracking-tighter">Low Stock</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => handleOpenStockModal(product, 'IN')}
                        className="inline-flex items-center px-2.5 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-md hover:bg-green-100 transition-colors"
                      >
                        <ArrowDownLeft className="h-3.5 w-3.5 mr-1" />
                        IN
                      </button>
                      <button 
                        onClick={() => handleOpenStockModal(product, 'OUT')}
                        className="inline-flex items-center px-2.5 py-1.5 bg-red-50 text-red-700 text-xs font-bold rounded-md hover:bg-red-100 transition-colors"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
                        OUT
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl bg-white p-8 shadow-2xl my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add New Item</h2>
              <button onClick={() => setIsProductModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleProductSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Item Name:</label>
                    <input required type="text" value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description:</label>
                    <input type="text" value={productForm.description} onChange={(e) => setProductForm({...productForm, description: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unit:</label>
                      <select value={productForm.unit} onChange={(e) => setProductForm({...productForm, unit: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none">
                        <option value="PCS">PCS</option>
                        <option value="BOX">BOX</option>
                        <option value="SET">SET</option>
                        <option value="UNIT">UNIT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price:</label>
                      <input type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm({...productForm, price: parseFloat(e.target.value)})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">SKU / Part Number (Auto-Gen if empty):</label>
                    <input type="text" value={productForm.sku} onChange={(e) => setProductForm({...productForm, sku: e.target.value.toUpperCase()})} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-gray-50" placeholder="LEAVE BLANK FOR AUTO" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Threshold (Override):</label>
                    <input type="number" value={productForm.threshold} onChange={(e) => setProductForm({...productForm, threshold: parseFloat(e.target.value)})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none" placeholder="0.00 for Default" />
                    <p className="mt-1 text-[10px] text-gray-400 italic font-medium tracking-tight">Needs Restock when stock ≤ 50% of threshold</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Actual Stock:</label>
                    <input type="number" value={productForm.initialStock} onChange={(e) => setProductForm({...productForm, initialStock: parseInt(e.target.value)})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location for Stock:</label>
                    <select 
                      value={productForm.initialLocationId} 
                      onChange={(e) => setProductForm({...productForm, initialLocationId: e.target.value})} 
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none"
                    >
                      <option value="">Select Location</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Pending Order (Auto):</label>
                    <input 
                      disabled 
                      type="text" 
                      value={Math.max(0, productForm.threshold - productForm.initialStock) || 0}
                      className="w-full rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-400 font-bold cursor-not-allowed" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 bg-gray-50 rounded-lg">Cancel</button>
                <button type="submit" className="px-10 py-2.5 text-sm font-bold text-white bg-[#50C878] hover:bg-[#45b068] rounded-lg shadow-lg transition-all active:scale-95">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock In/Out Modal */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${stockForm.type === 'IN' ? 'text-green-700' : 'text-red-700'}`}>
                Stock {stockForm.type === 'IN' ? 'In' : 'Out'} - {stockForm.productName}
              </h2>
              <button onClick={() => setIsStockModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleStockSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 tracking-widest">Select Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <select 
                    required 
                    value={stockForm.locationId} 
                    onChange={(e) => setStockForm({...stockForm, locationId: e.target.value})} 
                    className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-3 text-sm outline-none focus:ring-2"
                  >
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    {locations.length === 0 && <option value="">No locations available</option>}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 tracking-widest">Quantity</label>
                <input 
                  required 
                  type="number" 
                  min="1" 
                  value={stockForm.quantity} 
                  onChange={(e) => setStockForm({...stockForm, quantity: parseInt(e.target.value)})} 
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 tracking-widest">Remarks</label>
                <input 
                  type="text" 
                  value={stockForm.remarks} 
                  onChange={(e) => setStockForm({...stockForm, remarks: e.target.value})} 
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2" 
                  placeholder="Reference number, purpose, etc."
                />
              </div>
              <div className="bg-blue-50 p-4 rounded-lg flex items-start">
                <Info className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  {stockForm.type === 'IN' 
                    ? "Stock will be added to the selected location's balance." 
                    : "Stock will be deducted. System will block transaction if balance is insufficient."}
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setIsStockModalOpen(false)} className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-900">Cancel</button>
                <button 
                  type="submit" 
                  className={`px-8 py-2 text-sm font-bold text-white rounded-lg shadow-md transition-all active:scale-95 ${stockForm.type === 'IN' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  Process Stock {stockForm.type === 'IN' ? 'In' : 'Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[80vh] rounded-xl bg-white p-8 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Stock Transaction History</h2>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search logs..." 
                    value={logSearchTerm}
                    onChange={(e) => setLogSearchTerm(e.target.value)}
                    className="rounded-md border border-gray-300 pl-9 pr-3 py-1.5 text-xs outline-none focus:border-primary"
                  />
                </div>
                <button onClick={() => setIsLogModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-2">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Date</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Product</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Area</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Type</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Qty</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">User / Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLogs.map((log) => (
                    <tr 
                      key={log.id} 
                      className="text-sm hover:bg-gray-50 cursor-pointer select-none transition-colors"
                      onDoubleClick={() => handleLogDoubleClick(log)}
                      title="Double click to edit/delete log"
                    >
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">
                        <div>{log.product.name}</div>
                        {log.product.description && (
                          <div className="text-[10px] text-gray-400 italic font-medium">{log.product.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center text-xs text-gray-600">
                          <MapPin className="h-3 w-3 mr-1" /> {log.location.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${log.type === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold">{log.quantity}</td>
                      <td className="px-4 py-3">
                        <div className="text-gray-600 text-xs font-bold">{log.user?.username}</div>
                        <div className="text-[10px] text-gray-400 italic line-clamp-1">{log.remarks || 'No remarks'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Log Modal */}
      {isEditLogModalOpen && editingLog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Edit Log Entry</h2>
              <button onClick={() => setIsEditLogModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X className="h-5 w-5" /></button>
            </div>
            <div className="mb-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
              <div>
                <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Item / Product</h3>
                <div className="text-base font-bold text-gray-900">{editingLog?.product?.name || 'Unknown Item'}</div>
                <div className="text-[10px] font-mono text-gray-400 uppercase">{editingLog?.product?.sku}</div>
                {editingLog?.product?.description && (
                  <div className="mt-1 text-[10px] text-gray-500 italic bg-white/50 px-2 py-1 rounded border border-blue-50">
                    {editingLog.product.description}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-blue-100/50">
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Transaction Type</h3>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase ${editingLog?.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {editingLog?.type === 'IN' ? 'Stock In' : 'Stock Out'}
                  </span>
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Storage Location</h3>
                  <div className="text-xs font-bold text-gray-700 flex items-center">
                    <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                    {editingLog?.location?.name || 'Unknown Area'}
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-blue-100/50">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                  {editingLog.type === 'IN' ? 'Received By' : 'Requested By'}
                </h3>
                <div className="text-xs font-bold text-primary flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  {editingLog.remarks.includes('Req by:') 
                    ? editingLog.remarks.split('Req by:')[1]?.trim() 
                    : editingLog.remarks.includes('Legacy Quick Pull:')
                      ? (editingLog.remarks.includes('| Req by:') 
                          ? editingLog.remarks.split('| Req by:')[1]?.trim() 
                          : editingLog.remarks.split('Legacy Quick Pull:')[1]?.split('(')[0]?.trim())
                      : editingLog.remarks.includes('received_by:')
                        ? editingLog.remarks.split('received_by:')[1]?.trim()
                        : 'System Personnel'}
                </div>
              </div>
              {editingLog?.remarks?.includes('Legacy Quick Pull:') && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-blue-100/50">
                   <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Purpose</h3>
                    <div className="text-xs font-bold text-gray-500">
                      {editingLog.remarks.includes('|') 
                        ? editingLog.remarks.split('Legacy Quick Pull:')[1]?.split('|')[0]?.trim()
                        : editingLog.remarks.split('Legacy Quick Pull:')[1]?.split('(')[0]?.trim()}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Destination</h3>
                    <div className="text-xs font-bold text-gray-500">
                      {editingLog.remarks.includes('| Dest:')
                        ? editingLog.remarks.split('| Dest:')[1]?.split('|')[0]?.trim()
                        : editingLog.remarks.split('(Dest:')[1]?.split(')')[0]?.trim()}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <form onSubmit={handleEditLogSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 tracking-widest">Quantity</label>
                <input required type="number" value={editingLog.quantity} onChange={(e) => setEditingLog({...editingLog, quantity: parseInt(e.target.value)})} className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2" />
                <p className="mt-1 text-[10px] text-blue-500 italic">Changing this will automatically adjust the current on-hand stock.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 tracking-widest">Remarks</label>
                <textarea value={editingLog.remarks || ''} onChange={(e) => setEditingLog({...editingLog, remarks: e.target.value})} className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2" rows={3} />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={handleDeleteLog}
                  className="px-4 py-2 text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-100 rounded-lg transition-all"
                >
                  Delete Log
                </button>
                <div className="flex space-x-3">
                  <button type="button" onClick={() => setIsEditLogModalOpen(false)} className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-900">Cancel</button>
                  <button type="submit" className="px-6 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-md transition-all active:scale-95">Update Log</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit/Delete Modal */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl bg-white p-8 shadow-2xl my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Manage Product</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-900"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Item Name:</label>
                    <input required type="text" value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description:</label>
                    <input type="text" value={editingProduct.description || ''} onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unit:</label>
                      <select value={editingProduct.unit} onChange={(e) => setEditingProduct({...editingProduct, unit: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none">
                        <option value="PCS">PCS</option>
                        <option value="BOX">BOX</option>
                        <option value="SET">SET</option>
                        <option value="UNIT">UNIT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price:</label>
                      <input type="number" step="0.01" value={editingProduct.price} onChange={(e) => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">SKU / Part Number:</label>
                    <input disabled type="text" value={editingProduct.sku} className="w-full rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-400 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Threshold (Override):</label>
                    <input type="number" value={isNaN(editingProduct.threshold) ? '' : editingProduct.threshold} onChange={(e) => setEditingProduct({...editingProduct, threshold: parseFloat(e.target.value) || 0})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Actual Stock (Total):</label>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="number" 
                        value={editableStock}
                        onChange={(e) => setEditableStock(parseInt(e.target.value) || 0)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-black focus:border-primary outline-none" 
                      />
                      <span className="text-xs font-bold text-gray-400">{editingProduct.unit}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-blue-500 italic">Changing this will create an adjustment log automatically.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Pending Order (Auto):</label>
                    <input 
                      disabled 
                      type="text" 
                      value={Math.max(0, (editingProduct.threshold || 0) - editableStock) || 0}
                      className="w-full rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-400 font-bold cursor-not-allowed" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={handleDelete}
                  className="px-6 py-2.5 text-sm font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 rounded-lg transition-all"
                >
                  Delete Product
                </button>
                <div className="flex space-x-3">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 bg-gray-50 rounded-lg">Cancel</button>
                  <button type="submit" className="px-10 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-lg transition-all active:scale-95">Update Details</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Release Request Modal (Quick Pull) */}
      {isReleaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 overflow-y-auto">
          <div className="w-full max-w-7xl rounded-[2.5rem] bg-white p-0 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-gray-800 px-10 py-8 flex items-center justify-between text-white">
              <div className="flex items-center space-x-5">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/5">
                  <ArrowUpRight className="h-7 w-7 text-[#50C878]" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight uppercase italic">Record New Item Release</h2>
                  <p className="text-xs text-gray-400 font-bold tracking-[0.2em] uppercase mt-1 opacity-70">Quick Pull Workflow • Logistics Management</p>
                </div>
              </div>
              <button 
                onClick={() => setIsReleaseModalOpen(false)} 
                className="p-3 hover:bg-white/10 rounded-full transition-all hover:rotate-90"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleReleaseSubmit} className="p-6 space-y-6 bg-gray-50/30">
              <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 max-w-[1400px] mx-auto">
                {/* Transaction Information Section - Left Sidebar style */}
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                    <div className="flex items-center space-x-4 pb-4 border-b border-gray-100">
                      <div className="p-2 bg-primary/10 rounded-xl">
                        <Info className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Transaction Info</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="group">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest group-focus-within:text-primary transition-colors">Date of Release</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-3 h-4 w-4 text-gray-300" />
                          <input disabled type="text" value={clientDate} className="w-full rounded-xl border border-gray-100 bg-gray-50/50 pl-11 pr-4 py-2.5 text-sm text-gray-500 font-bold cursor-not-allowed" />
                        </div>
                      </div>

                      <div className="group">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest group-focus-within:text-primary transition-colors">Requested By</label>
                        <div className="relative">
                          <User className="absolute left-4 top-3 h-4 w-4 text-gray-300 group-focus-within:text-primary transition-colors" />
                          <input 
                            required 
                            type="text" 
                            value={releaseForm.requestedBy} 
                            onChange={e => setReleaseForm({...releaseForm, requestedBy: e.target.value})} 
                            className="w-full rounded-xl border border-gray-200 pl-11 pr-4 py-2.5 text-sm font-bold outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all bg-white shadow-sm" 
                            placeholder="Full name of recipient" 
                          />
                        </div>
                      </div>

                      <div className="group">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest group-focus-within:text-primary transition-colors">Where To / Destination</label>
                        <div className="relative">
                          <Building2 className="absolute left-4 top-3 h-4 w-4 text-gray-300 group-focus-within:text-primary transition-colors" />
                          <input 
                            required 
                            type="text" 
                            value={releaseForm.whereTo} 
                            onChange={e => setReleaseForm({...releaseForm, whereTo: e.target.value})} 
                            className="w-full rounded-xl border border-gray-200 pl-11 pr-4 py-2.5 text-sm font-bold outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all bg-white shadow-sm" 
                            placeholder="Target site or agency" 
                          />
                        </div>
                      </div>

                      <div className="group">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest group-focus-within:text-primary transition-colors">Source Location</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-3 h-4 w-4 text-gray-300 group-focus-within:text-primary transition-colors" />
                          <select 
                            required 
                            value={releaseForm.sourceLocationId} 
                            onChange={e => setReleaseForm({...releaseForm, sourceLocationId: e.target.value, items: []})} 
                            className="w-full appearance-none rounded-xl border border-gray-200 pl-11 pr-10 py-2.5 text-sm font-bold outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all bg-white shadow-sm"
                          >
                            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="group">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest group-focus-within:text-primary transition-colors">Remarks (Optional)</label>
                        <textarea 
                          value={releaseForm.remarks} 
                          onChange={e => setReleaseForm({...releaseForm, remarks: e.target.value})} 
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all h-24 resize-none bg-white shadow-inner" 
                          placeholder="Purpose of release..." 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Selection & Table Section - Main Area */}
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm min-h-[500px] flex flex-col">
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-[#50C878]/10 rounded-xl">
                          <Box className="h-4 w-4 text-[#50C878]" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Items to Release</h3>
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-tighter">Manage pull list from current inventory</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setReleaseForm({...releaseForm, items: []})} 
                        className="px-4 py-2 rounded-xl text-[10px] font-black text-red-500 hover:bg-red-50 hover:scale-105 transition-all uppercase tracking-widest flex items-center border border-transparent hover:border-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove All
                      </button>
                    </div>
                    
                    <div className="relative mb-6">
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Search className="h-5 w-5 text-gray-300 group-focus-within:text-primary transition-colors" />
                        </div>
                        <input 
                          type="text"
                          placeholder="Search item by name or SKU to add to pull list..."
                          value={releaseSearchInput}
                          onChange={(e) => setReleaseSearchInput(e.target.value)}
                          className="w-full rounded-xl border-2 border-gray-100 pl-12 pr-4 py-3 text-sm font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all shadow-sm placeholder:text-gray-300"
                        />
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                          <span className="text-[9px] font-bold text-gray-300 uppercase bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">F1 to focus</span>
                        </div>
                      </div>
                      
                      {releaseSearchInput.length > 0 && (
                        <div className="absolute z-[100] left-0 right-0 mt-3 bg-white border border-gray-100 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] max-h-[400px] overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-300">
                          {products
                            .filter(p => 
                              (p.name.toLowerCase().includes(releaseSearchInput.toLowerCase()) || 
                               p.sku.toLowerCase().includes(releaseSearchInput.toLowerCase())) &&
                              !releaseForm.items.find(i => i.productId === p.id)
                            )
                            .map(p => (
                              <div 
                                key={p.id}
                                onClick={() => {
                                  addReleaseItem(p);
                                  setReleaseSearchInput('');
                                }}
                                className="px-8 py-6 hover:bg-primary/5 cursor-pointer flex items-center justify-between border-b border-gray-50 last:border-0 transition-all group"
                              >
                                <div className="flex items-center space-x-5">
                                  <div className="p-3 bg-gray-100 rounded-2xl group-hover:bg-primary/10 transition-colors">
                                    <Box className="h-5 w-5 text-gray-400 group-hover:text-primary" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-base font-black text-gray-900 group-hover:text-primary transition-colors">{p.name}</span>
                                    <span className="text-[11px] text-gray-400 font-mono font-black uppercase tracking-tighter mt-0.5">{p.sku}</span>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase">Available: {getTotalStock(p)}</span>
                                  </div>
                                  <span className="text-[10px] text-gray-400 italic mt-1 font-bold uppercase tracking-widest">{p.unit}</span>
                                </div>
                              </div>
                            ))}
                          {products.filter(p => 
                            (p.name.toLowerCase().includes(releaseSearchInput.toLowerCase()) || 
                             p.sku.toLowerCase().includes(releaseSearchInput.toLowerCase())) &&
                            !releaseForm.items.find(i => i.productId === p.id)
                          ).length === 0 && (
                            <div className="px-8 py-16 text-center">
                              <Search className="h-12 w-12 text-gray-100 mx-auto mb-4" />
                              <p className="text-sm text-gray-400 font-bold italic">No matching items found for "{releaseSearchInput}"</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 max-h-[500px] overflow-y-auto border border-gray-100 rounded-xl shadow-inner bg-gray-50/20">
                      <table className="w-full border-collapse">
                        <thead className="bg-gray-900 text-white sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest">Item / Description</th>
                            <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest w-24">Available</th>
                            <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest w-36">Pull Quantity</th>
                            <th className="px-4 py-3 text-center w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {releaseForm.items.map(item => (
                            <tr key={item.productId} className="hover:bg-white transition-all group border-b border-gray-100 last:border-0">
                              <td className="px-4 py-3">
                                <div className="text-sm font-bold text-gray-900">{item.name}</div>
                                <div className="text-[10px] text-gray-400 font-medium mt-0.5 line-clamp-1 italic">{item.description || 'No description provided'}</div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex px-3 py-1 rounded-lg bg-gray-100 text-gray-900 text-[10px] font-bold border border-gray-200">
                                  {item.available}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end">
                                  <div className="relative group/input">
                                    <input 
                                      type="number" 
                                      min="1" 
                                      max={item.available}
                                      value={isNaN(item.quantity) ? '' : item.quantity} 
                                      onChange={e => updateReleaseQty(item.productId, parseInt(e.target.value) || 0)}
                                      className="w-24 text-right bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                                    />
                                    <div className="absolute right-2 -bottom-1 transform translate-y-full opacity-0 group-hover/input:opacity-100 transition-opacity">
                                      <span className="text-[8px] font-bold text-primary uppercase">MAX: {item.available}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button onClick={() => removeReleaseItem(item.productId)} className="text-gray-300 hover:text-red-500 hover:scale-110 transition-all p-1.5"><Trash2 className="h-4 w-4" /></button>
                              </td>
                            </tr>
                          ))}
                          {releaseForm.items.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-4 py-20 text-center">
                                <div className="flex flex-col items-center opacity-20 animate-pulse">
                                  <Box className="h-16 w-16 text-gray-900 mb-4" />
                                  <p className="text-lg font-bold uppercase tracking-widest text-gray-900">No items added yet</p>
                                  <p className="text-[10px] font-bold mt-1 text-gray-500 italic uppercase">Search and add items above to begin</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex justify-between items-center pt-10 border-t border-gray-100">
                <div className="flex items-center space-x-6 text-gray-300">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    <span className="text-[10px] font-black uppercase tracking-widest">Active Session</span>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest">
                    Items: {releaseForm.items.length}
                  </div>
                </div>
                <div className="flex items-center space-x-8">
                  <button 
                    type="button" 
                    onClick={() => setIsReleaseModalOpen(false)} 
                    className="px-10 py-4 text-sm font-black text-gray-400 hover:text-gray-900 transition-all uppercase tracking-widest hover:translate-x-[-4px]"
                  >
                    Discard Changes
                  </button>
                  <button 
                    type="submit" 
                    disabled={releaseForm.items.length === 0}
                    className="px-16 py-5 text-sm font-black text-white bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 rounded-[1.5rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 disabled:grayscale uppercase tracking-widest flex items-center group"
                  >
                    <span>Authorize & Record Release</span>
                    <ArrowUpRight className="ml-3 h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
