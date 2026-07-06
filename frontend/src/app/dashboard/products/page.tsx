'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Filter, Download, Trash2, Package, Tag, Database, History, Info, ChevronRight, Eye, ImageIcon, X, CheckCircle, Clock, AlertTriangle, User, Bell } from 'lucide-react';
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
  const [isBulkDelete, setIsBulkDelete] = useState(false);

  // Onboarding state
  const [hasEverHadProducts, setHasEverHadProducts] = useState(false);
  const [hasSeenRelease, setHasSeenRelease] = useState(false);

  const router = useRouter();
  const processedSelectedRef = useRef(false);

  const standardUnits = ['PCS', 'METERS', 'ROLLS', 'KILOGRAMS', 'LITERS', 'SET', 'BOX'];

  // Effects
  useEffect(() => {
    fetchData();
  }, [page, searchTerm]);

  // Auto-open product modal from ?selected=ID query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selectedId = params.get('selected');
    if (!selectedId || processedSelectedRef.current) return;
    processedSelectedRef.current = true;
    window.history.replaceState({}, '', '/dashboard/products');

    const existing = products.find((p) => p.id === selectedId);
    if (existing) {
      setEditingProduct(existing);
      setEditableStock(
        existing.stocks.reduce((acc: number, s: any) => acc + s.quantity, 0),
      );
      setIsEditModalOpen(true);
      setActiveEditTab('general');
    } else {
      api.get(`/products/${selectedId}`).then((res) => {
        const product = res.data;
        setEditingProduct(product);
        setEditableStock(
          product.stocks?.reduce((acc: number, s: any) => acc + s.quantity, 0) ?? 0,
        );
        setIsEditModalOpen(true);
        setActiveEditTab('general');
      });
    }
  }, [products]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, locRes] = await Promise.all([
        api.get('/products', { params: { skip: (page - 1) * pageSize, take: pageSize, search: searchTerm } }),
        api.get('/locations')
      ]);
      const data = prodRes.data.data || prodRes.data;
      setProducts(data);
      setTotalProducts(prodRes.data.total || (data.length || 0));
      setLocations(locRes.data);
      if (data.length > 0 && !hasEverHadProducts) {
        setHasEverHadProducts(true);
      }
    } catch (err) {
      setError('Unable to load products.');
      toast.error('Unable to load products.');
    } finally {
      setLoading(false);
    }
  };

  const isFirstVisit = !loading && !searchTerm && products.length === 0 && !hasEverHadProducts;

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
    if (!newProduct.name.trim()) {
      toast.error('Item name is required.');
      return;
    }
    setIsSavingProduct(true);
    try {
      await api.post('/products', { ...newProduct, name: newProduct.name.trim(), description: newProduct.description.trim() });
      const isFirst = isFirstVisit;
      setIsAddModalOpen(false);
      setNewProduct({ name: '', sku: '', description: '', unit: 'PCS', price: 0, threshold: 0, showInInventory: true, initialStock: 0, initialLocationId: '' });
      setHasEverHadProducts(true);
      fetchData();
      if (isFirst) {
        toast.success('Product created. Use Stock IN to record initial quantity.', { duration: 6000 });
      } else {
        toast.success('New product added successfully.');
      }
    } catch (err) {
      toast.error('Failed to add product. Please check the form and try again.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editingProduct.name.trim()) {
      toast.error('Item name cannot be empty.');
      return;
    }
    setIsSavingProduct(true);
    try {
      const payload = { ...editingProduct, name: editingProduct.name.trim(), description: (editingProduct.description || '').trim(), totalStock: bypassStockEdit ? editableStock : undefined };
      await api.patch(`/products/${editingProduct.id}`, payload);
      toast.success('Product updated successfully.');
      setIsEditModalOpen(false);
      setBypassStockEdit(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to update product. Please try again.');
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
      toast.success('Items released successfully.');
      setIsReleaseModalOpen(false);
      setReleaseBulkForm({ sourceLocationId: '', requestedBy: '', whereTo: '', remarks: '', items: [] });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Release failed. Please try again.');
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
      toast.error(err.response?.data?.message || 'Stock transaction failed. Please check your entries and try again.');
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
          params: { search: releaseSearchInput, take: 10, stockFilter: releaseBulkForm.sourceLocationId } 
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

  const handleRestock = (product: Product) => {
    const prItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: product.name,
      unit: product.unit,
      quantity: 1,
      estimatedCost: product.price || 0,
    };
    localStorage.setItem('pending_pr_items', JSON.stringify([prItem]));
    setIsEditModalOpen(false);
    router.push('/dashboard/transmittal/purchase-request');
  };

  const handleDelete = async () => {
    if (isBulkDelete) {
      if (selectedIds.length === 0) return;
      let deleted = 0;
      for (const id of selectedIds) {
        try {
          await api.delete(`/products/${id}`);
          deleted++;
        } catch {
          // continue deleting rest
        }
      }
      toast.success(`Deleted ${deleted} of ${selectedIds.length} products.`);
      setSelectedIds([]);
      setIsDeleteConfirmOpen(false);
      setIsBulkDelete(false);
      fetchData();
      return;
    }
    if (!editingProduct) return;
    try {
      await api.delete(`/products/${editingProduct.id}`);
      toast.success('Product deleted permanently.');
      setIsEditModalOpen(false);
      setIsDeleteConfirmOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to delete product.');
    }
  };

  const handleVerifyPassword = async () => {
    const trimmed = adminPassInput.trim();
    if (!trimmed) {
      toast.error('Please enter your password.');
      return;
    }
    setIsVerifying(true);
    try {
      const res = await api.post('/auth/verify-super-admin', { password: trimmed });
      if (res.data.valid) {
        setBypassStockEdit(true);
        setIsVerifyingPassword(false);
        setAdminPassInput('');
        toast.success('Access granted. Stock edit bypass is now active.');
      } else {
        toast.error('Incorrect password. Please try again.');
      }
    } catch (err) {
      toast.error('Verification failed. Please try again.');
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
      toast.success('Image uploaded successfully.');
    } catch (err) {
      toast.error('Image upload failed. Please try again.');
    } finally {
      slot === 1 ? setIsUploading1(false) : setIsUploading2(false);
    }
  };

  const handleRemoveImage = async (productId: string, slot: number) => {
    try {
      const res = await api.delete(`/products/${productId}/image/${slot}`);
      setEditingProduct(res.data);
      setProducts(prev => prev.map(p => p.id === productId ? res.data : p));
      toast.info('Image removed.');
    } catch (err) {
      toast.error('Failed to remove image. Please try again.');
    }
  };

  const [editingLog, setEditingLog] = useState<any>(null);
  const [isEditLogModalOpen, setIsEditLogModalOpen] = useState(false);
  const [isDeletingLog, setIsDeletingLog] = useState(false);
  const [notifyDuration, setNotifyDuration] = useState(24);
  const [isNotifying, setIsNotifying] = useState(false);

  const handleNotifyStaff = async () => {
    if (!editingLog) return;
    setIsNotifying(true);
    try {
      const typeLabel = editingLog.type === 'IN' ? 'Stock In' : 'Stock Out';
      const productName = editingLog.product?.name || editingLog.productName || 'Unknown Item';
      await api.post('/stock-notifications', {
        productTransactionId: editingLog.id,
        productId: editingLog.productId || editingLog.product?.id,
        productName,
        type: editingLog.type === 'IN' ? 'STOCK_IN' : 'STOCK_OUT',
        quantity: editingLog.quantity,
        message: `${typeLabel}: ${editingLog.quantity} ${editingLog.product?.unit || 'pcs'} of ${productName}`,
        durationHours: notifyDuration,
      });
      toast.success('Staff notified successfully');
      setIsEditLogModalOpen(false);
    } catch {
      toast.error('Failed to send notification');
    } finally {
      setIsNotifying(false);
    }
  };

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
      toast.success('Log entry deleted');
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
        onOpenReleaseModal={() => { setHasSeenRelease(true); setIsReleaseModalOpen(true); }}
        showReleaseHint={!hasSeenRelease && !loading && products.length > 0}
      />

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative group flex-1 w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 shadow-xl shadow-gray-200/50 outline-none focus:border-primary transition-all placeholder:text-gray-300"
              aria-label="Search products by name or SKU"
            />
          </div>
          
          <BulkActionsBar 
            selectedCount={selectedIds.length} 
            onClear={() => setSelectedIds([])} 
                    onTransmittal={() => toast.info('Transmittal workflow started.')}
                    onPR={() => toast.info('Purchase request created.')}
            onDelete={() => { setIsBulkDelete(true); setIsDeleteConfirmOpen(true); }}
          />
        </div>

        <ProductTable 
          products={products}
          loading={loading}
          error={error}
          onRetry={fetchData}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          toggleSelectAll={toggleSelectAll}
          isFirstVisit={isFirstVisit}
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

      {editingProduct && (
      <EditProductModal 
        isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setIsAddingCustomUnitEdit(false); }}
        onSubmit={handleEditSubmit} editingProduct={editingProduct} setEditingProduct={setEditingProduct} isSaving={isSavingProduct}
        handleDelete={() => setIsDeleteConfirmOpen(true)} onRestock={handleRestock}
        activeEditTab={activeEditTab} setActiveEditTab={setActiveEditTab}
        activeStockSubTab={activeStockSubTab} setActiveStockSubTab={setActiveStockSubTab}
        editableStock={editableStock} setEditableStock={setEditableStock}
        bypassStockEdit={bypassStockEdit} setIsVerifyingPassword={() => setIsVerifyingPassword(true)}
        isUploading1={isUploading1} isUploading2={isUploading2}
        handleImageUpload={handleImageUpload} handleRemoveImage={handleRemoveImage}
        setPreviewImageUrl={setPreviewImageUrl} setIsPreviewOpen={setIsPreviewOpen}
        standardUnits={standardUnits} isAddingCustomUnitEdit={isAddingCustomUnitEdit} setIsAddingCustomUnitEdit={setIsAddingCustomUnitEdit}
        locations={locations}
      />
      )}

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
        isOpen={isDeleteConfirmOpen} title={isBulkDelete ? 'Delete Selected Products?' : 'Delete Product?'}
        message={isBulkDelete ? `Delete ${selectedIds.length} selected products? This will also remove all associated stock logs. This action cannot be undone.` : `Delete ${editingProduct?.name}? This will also remove all associated stock logs. This action cannot be undone.`}
        confirmText={isBulkDelete ? `Delete ${selectedIds.length} Products` : 'Delete Product'} isDestructive={true}
        onConfirm={handleDelete} onCancel={() => { setIsDeleteConfirmOpen(false); setIsBulkDelete(false); }}
      />

      {/* Edit Log Modal */}
      {isEditLogModalOpen && editingLog && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300"
          role="dialog"
          aria-modal="true"
          aria-label="Edit Transaction Log Entry"
          onKeyDown={(e) => { if (e.key === 'Escape') setIsEditLogModalOpen(false); }}
        >
          <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm">
                  <History className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight leading-none mb-1">Correct Entry</h3>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Edit Transaction Log</p>
                </div>
              </div>
              <button onClick={() => setIsEditLogModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Quantity</label>
                  <input type="number" value={editingLog.quantity} onChange={(e) => setEditingLog({...editingLog, quantity: parseInt(e.target.value) || 0})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:bg-white focus:border-primary outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Date</label>
                  <input type="date" value={editingLog.date} onChange={(e) => setEditingLog({...editingLog, date: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:bg-white focus:border-primary outline-none transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Reason for Correction</label>
                <textarea value={editingLog.remarks || ''} onChange={(e) => setEditingLog({...editingLog, remarks: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:bg-white focus:border-primary outline-none transition-all min-h-[100px] resize-none" placeholder="Explain the correction..." />
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Bell className="h-4 w-4 text-primary" />
                  </div>
                  <h4 className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">Notify Staff</h4>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={notifyDuration}
                    onChange={e => setNotifyDuration(parseInt(e.target.value))}
                    className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer"
                  >
                    <option value={24}>24 Hours</option>
                    <option value={48}>48 Hours</option>
                    <option value={72}>72 Hours</option>
                    <option value={168}>1 Week</option>
                    <option value={336}>2 Weeks</option>
                  </select>
                  <button
                    onClick={handleNotifyStaff}
                    disabled={isNotifying}
                    className="px-5 py-3 bg-primary text-white rounded-xl text-xs font-semibold uppercase tracking-wider shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2 shrink-0"
                  >
                    <Bell className="h-4 w-4" />
                    {isNotifying ? 'Sending...' : 'Notify'}
                  </button>
                </div>
              </div>

              <button onClick={handleUpdateLog} className="w-full py-5 bg-primary text-white rounded-2xl text-xs font-semibold uppercase tracking-wider shadow-md hover:shadow-lg transition-all">Update Log Entry</button>
              <button disabled={isDeletingLog} onClick={handleDeleteLog} className="w-full py-4 text-red-500 font-semibold text-xs uppercase tracking-wider hover:bg-red-50 rounded-2xl transition-all flex items-center justify-center gap-2">
                <Trash2 className="h-4 w-4" /> {isDeletingLog ? 'Deleting...' : 'Delete This Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Image Preview */}
      {isPreviewOpen && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 animate-in fade-in duration-300" 
          onClick={() => setIsPreviewOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Product image preview"
          onKeyDown={(e) => { if (e.key === 'Escape') setIsPreviewOpen(false); }}
        >
          <button 
            className="absolute top-10 right-10 text-white/40 hover:text-white transition-colors" 
            onClick={() => setIsPreviewOpen(false)}
            aria-label="Close image preview"
          >
            <X className="h-10 w-10" />
          </button>
          <img src={previewImageUrl} alt="Full product image preview" className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-500" />
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D1D5DB; }
        @media (prefers-reduced-motion: reduce) {
          .animate-in, .animate-pulse, .fade-in, .zoom-in-95, .slide-in-from-bottom-4, .slide-in-from-left-4, .slide-in-from-right-4, .duration-300, .duration-500, .duration-1000, [class*="animate-"], [class*="transition-"] { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );
}
