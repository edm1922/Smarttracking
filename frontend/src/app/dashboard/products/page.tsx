'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Filter, Download, Trash2, Package, Tag, Database, History, Info, ChevronRight, Eye, ImageIcon, X, CheckCircle, Clock, AlertTriangle, User } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { ProductHeader } from './components/ProductHeader';
import { BulkActionsBar } from './components/BulkActionsBar';
import { ProductTable } from './components/ProductTable';
import { AddProductModal } from './components/AddProductModal';
import { EditProductModal } from './components/EditProductModal';
import { ReleaseModal } from './components/ReleaseModal';
import { LogModal } from './components/LogModal';
import { StockModal } from './components/StockModal';
import { PasswordVerificationModal } from './components/PasswordVerificationModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PageHeaderSkeleton } from '@/components/ui/LoadingSkeletons';
import { Product, Location } from './types';

export default function ProductsPage() {
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalProducts, setTotalProducts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  
  // Form State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [releasingProduct, setReleasingProduct] = useState<Product | null>(null);
  const [viewingLogProduct, setViewingLogProduct] = useState<Product | null>(null);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [newProduct, setNewProduct] = useState({
    name: '', sku: '', description: '', unit: 'PCS', price: 0, threshold: 0, showInInventory: true, initialStock: 0, initialLocationId: ''
  });
  const [releaseBulkForm, setReleaseBulkForm] = useState<{
    sourceLocationId: string;
    requestedBy: string;
    whereTo: string;
    remarks: string;
    items: { productId: string, name: string, description: string, unit: string, available: number, quantity: number }[];
  }>({
    sourceLocationId: '',
    requestedBy: '',
    whereTo: '',
    remarks: '',
    items: []
  });
  const [releaseSearchInput, setReleaseSearchInput] = useState('');
  const [releaseSearchResults, setReleaseSearchResults] = useState<Product[]>([]);
  const [releaseSearchLoading, setReleaseSearchLoading] = useState(false);
  const [editableStock, setEditableStock] = useState(0);
  const [adminPassInput, setAdminPassInput] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [stockForm, setStockForm] = useState({
    productId: '',
    productName: '',
    locationId: '',
    type: 'IN' as 'IN' | 'OUT',
    quantity: 1,
    remarks: ''
  });
  const [isProcessingStock, setIsProcessingStock] = useState(false);
  
  // UI Helpers
  const [activeEditTab, setActiveEditTab] = useState<'general' | 'stocks'>('general');
  const [activeStockSubTab, setActiveStockSubTab] = useState<'inventory' | 'history'>('inventory');
  const [isAddingCustomUnit, setIsAddingCustomUnit] = useState(false);
  const [isAddingCustomUnitEdit, setIsAddingCustomUnitEdit] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUploading1, setIsUploading1] = useState(false);
  const [isUploading2, setIsUploading2] = useState(false);
  const [bypassStockEdit, setBypassStockEdit] = useState(false);
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [isLogSearching, setIsLogSearching] = useState(false);

  const standardUnits = ['PCS', 'METERS', 'ROLLS', 'KILOGRAMS', 'LITERS', 'SET', 'BOX'];

  // Effects
  useEffect(() => {
    fetchData();
  }, [page, searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, locRes] = await Promise.all([
        api.get('/products', { params: { page, limit: pageSize, search: searchTerm } }),
        api.get('/locations')
      ]);
      setProducts(prodRes.data.data || prodRes.data);
      setTotalProducts(prodRes.data.total || (prodRes.data.length || 0));
      setLocations(locRes.data);
    } catch (err) {
      setError('Strategic synchronization failed.');
      toast.error('Strategic synchronization failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLogModalOpen) {
      const delayDebounceFn = setTimeout(() => {
        fetchLogs();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [isLogModalOpen, logSearchTerm]);

  const fetchLogs = async () => {
    setIsLogSearching(true);
    try {
      const res = await api.get('/products/logs', {
        params: { search: logSearchTerm, take: 50 }
      });
      setSystemLogs(res.data.data || res.data);
    } catch (err) {
      toast.error('Failed to fetch transaction logs.');
    } finally {
      setIsLogSearching(false);
    }
  };

  // Handlers
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProduct(true);
    try {
      await api.post('/products', newProduct);
      toast.success('New asset classified and stored.');
      setIsAddModalOpen(false);
      setNewProduct({ name: '', sku: '', description: '', unit: 'PCS', price: 0, threshold: 0, showInInventory: true, initialStock: 0, initialLocationId: '' });
      fetchData();
    } catch (err) {
      toast.error('Classification error detected.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsSavingProduct(true);
    try {
      const payload = { ...editingProduct, totalStock: bypassStockEdit ? editableStock : undefined };
      await api.patch(`/products/${editingProduct.id}`, payload);
      toast.success('Asset parameters updated.');
      setIsEditModalOpen(false);
      setBypassStockEdit(false);
      fetchData();
    } catch (err) {
      toast.error('Parameter update failed.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleReleaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (releaseBulkForm.items.length === 0 || !releaseBulkForm.sourceLocationId) {
      toast.error('Please add items and select a source location.');
      return;
    }
    setIsReleasing(true);
    try {
      await api.post(`/products/bulk-release`, releaseBulkForm);
      toast.success('Asset release successful.');
      setIsReleaseModalOpen(false);
      setReleaseBulkForm({ sourceLocationId: '', requestedBy: '', whereTo: '', remarks: '', items: [] });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Release protocol failure.');
    } finally {
      setIsReleasing(false);
    }
  };

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockForm.productId || !stockForm.locationId) {
      toast.error('Please select a valid location and item.');
      return;
    }
    setIsProcessingStock(true);
    try {
      await api.post(`/products/${stockForm.productId}/stock`, {
        locationId: stockForm.locationId,
        type: stockForm.type,
        quantity: Number(stockForm.quantity),
        remarks: stockForm.remarks,
      });
      toast.success(`Stock ${stockForm.type === 'IN' ? 'added' : 'deducted'} successfully.`);
      setIsStockModalOpen(false);
      setStockForm({
        productId: '',
        productName: '',
        locationId: '',
        type: 'IN',
        quantity: 1,
        remarks: '',
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Stock transaction failed.');
    } finally {
      setIsProcessingStock(false);
    }
  };

  useEffect(() => {
    if (!releaseSearchInput.trim() || !releaseBulkForm.sourceLocationId) {
      setReleaseSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setReleaseSearchLoading(true);
      try {
        const res = await api.get('/products', { 
          params: { search: releaseSearchInput, limit: 10, stockFilter: releaseBulkForm.sourceLocationId } 
        });
        setReleaseSearchResults(res.data.data || res.data);
      } catch (err) {
        toast.error('Search failed');
      } finally {
        setReleaseSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [releaseSearchInput, releaseBulkForm.sourceLocationId]);

  const addReleaseItem = (product: Product) => {
    if (releaseBulkForm.items.some(i => i.productId === product.id)) {
      toast.info('Item already in manifest');
      return;
    }
    const stock = product.stocks.find(s => s.locationId === releaseBulkForm.sourceLocationId);
    if (!stock || stock.quantity <= 0) {
      toast.error('Item unavailable at source location');
      return;
    }
    setReleaseBulkForm(prev => ({
      ...prev,
      items: [...prev.items, {
        productId: product.id,
        name: product.name,
        description: product.description || '',
        unit: product.unit,
        available: stock.quantity,
        quantity: 1
      }]
    }));
    setReleaseSearchInput('');
  };

  const removeReleaseItem = (productId: string) => {
    setReleaseBulkForm((prev: any) => ({
      ...prev,
      items: prev.items.filter((i: any) => i.productId !== productId)
    }));
  };

  const updateReleaseQty = (productId: string, qty: number) => {
    setReleaseBulkForm((prev: any) => ({
      ...prev,
      items: prev.items.map((i: any) => i.productId === productId ? { ...i, quantity: qty } : i)
    }));
  };

  const handleDelete = async () => {
    if (!editingProduct) return;
    try {
      await api.delete(`/products/${editingProduct.id}`);
      toast.success('Asset record purged from archives.');
      setIsEditModalOpen(false);
      setIsDeleteConfirmOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Purge operation aborted.');
    }
  };

  const handleVerifyPassword = async () => {
    setIsVerifying(true);
    try {
      const res = await api.post('/auth/verify-super-admin', { password: adminPassInput });
      if (res.data.valid) {
        setBypassStockEdit(true);
        setIsVerifyingPassword(false);
        setAdminPassInput('');
        toast.success('Access Granted. Administrative bypass enabled.');
      } else {
        toast.error('Unauthorized access attempt.');
      }
    } catch (err) {
      toast.error('Security handshake failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleImageUpload = async (productId: string, file: File, slot: number) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('slot', slot.toString());
    slot === 1 ? setIsUploading1(true) : setIsUploading2(true);
    try {
      const res = await api.post(`/products/${productId}/image`, formData);
      setEditingProduct(res.data);
      setProducts(prev => prev.map(p => p.id === productId ? res.data : p));
      toast.success('Visual asset documented.');
    } catch (err) {
      toast.error('Media ingestion failure.');
    } finally {
      slot === 1 ? setIsUploading1(false) : setIsUploading2(false);
    }
  };

  const handleRemoveImage = async (productId: string, slot: number) => {
    try {
      const res = await api.delete(`/products/${productId}/image/${slot}`);
      setEditingProduct(res.data);
      setProducts(prev => prev.map(p => p.id === productId ? res.data : p));
      toast.info('Visual record removed.');
    } catch (err) {
      toast.error('Media removal failed.');
    }
  };

  const [editingLog, setEditingLog] = useState<any>(null);
  const [isEditLogModalOpen, setIsEditLogModalOpen] = useState(false);
  const [isDeletingLog, setIsDeletingLog] = useState(false);

  const handleLogDoubleClick = (log: any) => {
    setEditingLog({
      ...log,
      date: new Date(log.createdAt).toISOString().split('T')[0]
    });
    setIsEditLogModalOpen(true);
  };

  const handleUpdateLog = async () => {
    if (!editingLog) return;
    try {
      await api.patch(`/products/logs/${editingLog.id}`, {
        quantity: editingLog.quantity,
        remarks: editingLog.remarks,
        createdAt: editingLog.date
      });
      toast.success('Log entry corrected');
      setIsEditLogModalOpen(false);
      // Refresh viewing product logs if needed
      if (viewingLogProduct) {
        const res = await api.get(`/products/${viewingLogProduct.id}`);
        setViewingLogProduct(res.data);
      }
      fetchData();
    } catch (err) {
      toast.error('Failed to update log');
    }
  };

  const handleDeleteLog = async () => {
    if (!editingLog) return;
    setIsDeletingLog(true);
    try {
      await api.delete(`/products/logs/${editingLog.id}`);
      toast.success('Log entry purged');
      setIsEditLogModalOpen(false);
      if (viewingLogProduct) {
        const res = await api.get(`/products/${viewingLogProduct.id}`);
        setViewingLogProduct(res.data);
      }
      fetchData();
    } catch (err) {
      toast.error('Failed to delete log');
    } finally {
      setIsDeletingLog(false);
    }
  };

  const toggleSelect = (product: Product) => {
    setSelectedIds(prev => 
      prev.includes(product.id) ? prev.filter(id => id !== product.id) : [...prev, product.id]
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.length === products.length ? [] : products.map(p => p.id));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <ProductHeader 
        onOpenProductModal={() => setIsAddModalOpen(true)} 
        onOpenLogModal={() => setIsLogModalOpen(true)}
        onOpenReleaseModal={() => setIsReleaseModalOpen(true)}
      />

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative group flex-1 w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Query asset database by name or SKU..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 shadow-xl shadow-gray-200/50 outline-none focus:border-primary transition-all placeholder:text-gray-300"
            />
          </div>
          
          <BulkActionsBar 
            selectedCount={selectedIds.length} 
            onClear={() => setSelectedIds([])} 
            onTransmittal={() => toast.info('Transmittal workflow initiated.')}
            onPR={() => toast.info('PR workflow initiated.')}
            onDelete={() => setIsDeleteConfirmOpen(true)}
          />
        </div>

        <ProductTable 
          products={products}
          loading={loading}
          error={error}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          toggleSelectAll={toggleSelectAll}
          handleRowDoubleClick={(p: Product) => {
            setEditingProduct(p);
            setEditableStock(p.stocks.reduce((acc: number, s: any) => acc + s.quantity, 0));
            setIsEditModalOpen(true);
            setActiveEditTab('general');
          }}
          handleOpenStockModal={(p: Product, type: 'IN' | 'OUT') => {
            if (type === 'IN') {
              setStockForm({
                productId: p.id,
                productName: p.name,
                locationId: locations[0]?.id || '',
                type: 'IN',
                quantity: 1,
                remarks: '',
              });
              setIsStockModalOpen(true);
            } else if (type === 'OUT') {
              setReleaseBulkForm(prev => ({ ...prev, sourceLocationId: locations[0]?.id || '' }));
              addReleaseItem(p);
              setIsReleaseModalOpen(true);
            }
          }}
          setPreviewImageUrl={setPreviewImageUrl}
          setIsPreviewOpen={setIsPreviewOpen}
          page={page}
          pageSize={pageSize}
          totalProducts={totalProducts}
          setPage={setPage}
          searchTerm={searchTerm}
          onOpenProductModal={() => setIsAddModalOpen(true)}
        />
      </div>

      {/* MODALS */}
      <AddProductModal 
        isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddSubmit} form={newProduct} setForm={setNewProduct} isSaving={isSavingProduct}
        isAddingCustomUnit={isAddingCustomUnit} setIsAddingCustomUnit={setIsAddingCustomUnit} standardUnits={standardUnits}
        locations={locations}
      />

      <EditProductModal 
        isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setIsAddingCustomUnitEdit(false); }}
        onSubmit={handleEditSubmit} editingProduct={editingProduct!} setEditingProduct={setEditingProduct} isSaving={isSavingProduct}
        handleDelete={() => setIsDeleteConfirmOpen(true)} activeEditTab={activeEditTab} setActiveEditTab={setActiveEditTab}
        activeStockSubTab={activeStockSubTab} setActiveStockSubTab={setActiveStockSubTab}
        editableStock={editableStock} setEditableStock={setEditableStock}
        bypassStockEdit={bypassStockEdit} setIsVerifyingPassword={() => setIsVerifyingPassword(true)}
        isUploading1={isUploading1} isUploading2={isUploading2}
        handleImageUpload={handleImageUpload} handleRemoveImage={handleRemoveImage}
        setPreviewImageUrl={setPreviewImageUrl} setIsPreviewOpen={setIsPreviewOpen}
        standardUnits={standardUnits} isAddingCustomUnitEdit={isAddingCustomUnitEdit} setIsAddingCustomUnitEdit={setIsAddingCustomUnitEdit}
        locations={locations}
      />

      <StockModal 
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        onSubmit={handleStockSubmit}
        form={stockForm}
        setForm={setStockForm}
        locations={locations}
        isProcessing={isProcessingStock}
      />

      <ReleaseModal 
        isOpen={isReleaseModalOpen} onClose={() => setIsReleaseModalOpen(false)}
        onSubmit={handleReleaseSubmit} 
        form={releaseBulkForm}
        setForm={setReleaseBulkForm}
        locations={locations} isProcessing={isReleasing}
        releaseSearchInput={releaseSearchInput} setReleaseSearchInput={setReleaseSearchInput}
        releaseSearchResults={releaseSearchResults} releaseSearchLoading={releaseSearchLoading}
        addReleaseItem={addReleaseItem} removeReleaseItem={removeReleaseItem}
        updateReleaseQty={updateReleaseQty} clientDate={new Date().toISOString().split('T')[0]}
      />

      <LogModal 
        isOpen={isLogModalOpen} onClose={() => { setIsLogModalOpen(false); setLogSearchTerm(''); }}
        logs={systemLogs}
        searchTerm={logSearchTerm} setSearchTerm={setLogSearchTerm}
        isSearching={isLogSearching} onLogDoubleClick={handleLogDoubleClick}
      />

      <PasswordVerificationModal 
        isOpen={isVerifyingPassword} onClose={() => setIsVerifyingPassword(false)}
        onVerify={handleVerifyPassword} passwordInput={adminPassInput} setPasswordInput={setAdminPassInput}
        isVerifying={isVerifying}
      />

      <ConfirmModal 
        isOpen={isDeleteConfirmOpen} title="Permanently Purge Asset?"
        message={`This will irrevocably delete ${editingProduct?.name} and all associated distribution logs. This action is terminal and cannot be reversed.`}
        confirmText="Confirm Termination" isDestructive={true}
        onConfirm={handleDelete} onCancel={() => setIsDeleteConfirmOpen(false)}
      />

      {/* Edit Log Modal */}
      {isEditLogModalOpen && editingLog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm">
                  <History className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">Correct Entry</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction Audit Modification</p>
                </div>
              </div>
              <button onClick={() => setIsEditLogModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantity</label>
                  <input type="number" value={editingLog.quantity} onChange={(e) => setEditingLog({...editingLog, quantity: parseInt(e.target.value) || 0})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:bg-white focus:border-primary outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date</label>
                  <input type="date" value={editingLog.date} onChange={(e) => setEditingLog({...editingLog, date: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:bg-white focus:border-primary outline-none transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reason for Correction</label>
                <textarea value={editingLog.remarks || ''} onChange={(e) => setEditingLog({...editingLog, remarks: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:bg-white focus:border-primary outline-none transition-all min-h-[100px] resize-none" placeholder="Explain the correction..." />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={handleUpdateLog} className="w-full py-5 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all">Update Log Entry</button>
              <button disabled={isDeletingLog} onClick={handleDeleteLog} className="w-full py-4 text-red-500 font-black text-[10px] uppercase tracking-widest hover:bg-red-50 rounded-2xl transition-all flex items-center justify-center gap-2">
                <Trash2 className="h-4 w-4" /> {isDeletingLog ? 'Purging...' : 'Purge Entry from Archives'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Image Preview */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 animate-in fade-in duration-300" onClick={() => setIsPreviewOpen(false)}>
          <button className="absolute top-10 right-10 text-white/40 hover:text-white transition-colors"><X className="h-10 w-10" /></button>
          <img src={previewImageUrl} alt="Full Preview" className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-500" />
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D1D5DB; }
      `}</style>
    </div>
  );
}
