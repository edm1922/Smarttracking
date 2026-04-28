'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Plus, Search, Box, X, User, ClipboardList, Send, Clock, Trash2, MapPin, CheckCircle, QrCode, ImageIcon, Filter, ChevronDown, ChevronUp, ArrowUpRight, Camera, Package, Map as MapIcon, History, Activity, Truck, ClipboardList as ListIcon, AlertTriangle
} from 'lucide-react';
import api from '@/lib/api';
import { CardSkeleton, PageHeaderSkeleton } from '@/components/ui/LoadingSkeletons';
import jsQR from 'jsqr';

interface Product {
  name: string;
  unit: string;
  totalQty: number;
  specs: Record<string, string[]>;
  items: Item[];
}

interface Item {
  id: string;
  slug: string;
  qty: number;
  threshold: number;
  batch: string | null;
  fieldValues: any[];
}

interface CartItem {
  id: string;
  slug: string;
  productName: string;
  imageFile?: File | null;
  imagePreview?: string | null;
  referenceFile?: File | null;
  referencePreview?: string | null;
  manualSlug: string;
  qty: number;
  unit: string;
  status: 'pending' | 'scanning' | 'searching' | 'success' | 'manual';
}

export default function UnitRequisitionPage() {
  return (
    <Suspense fallback={<div className="p-10"><PageHeaderSkeleton /></div>}>
      <UnitRequisitionContent />
    </Suspense>
  );
}

function UnitRequisitionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get('tab');
  const [inventory, setInventory] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [productFilters, setProductFilters] = useState<Record<string, Record<string, string>>>({});
  
  // Form Info
  const [form, setForm] = useState({
    date: new Date().toLocaleDateString('en-CA'),
    supervisorName: '',
    remarks: '',
  });

  // Cart for multiple units
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Submit Modal & Approval Upload
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'create' | 'history' | 'inventory' | 'releasing'>('create');

  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({ productName: '', rows: [] as any[] });
  const [currentRow, setCurrentRow] = useState({ specs: '', qty: 1, unit: 'pcs' });
  const [detailItem, setDetailItem] = useState<any>(null);
  const [showRestockOptions, setShowRestockOptions] = useState(false);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tab && ['create', 'history', 'inventory', 'releasing'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [tab]);

  useEffect(() => {
    if (!detailItem) setShowRestockOptions(false);
  }, [detailItem]);

  const [historySubTab, setHistorySubTab] = useState<'pending' | 'all'>('pending');
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Staff Inventory & Releasing
  const [staffInventory, setStaffInventory] = useState<any[]>([]);
  const [staffReleases, setStaffReleases] = useState<any[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkRows, setBulkRows] = useState([{ employeeName: '', qty: 1 }]);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<any>(null);
  const [releasingForm, setReleasingForm] = useState({
    shift: '',
    department: '',
    supervisor: '',
    remarks: ''
  });

  const fetchInventory = async () => {
    try {
      const res = await api.get('/items/unit-inventory');
      setInventory(res.data);
    } catch (err) {
      console.error('Failed to fetch unit inventory', err);
    } finally {
      setLoading(false);
    }
  };

  const [page, setPage] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);
  const pageSize = 20;

  const fetchMyRequests = async () => {
    try {
      setIsRefreshing(true);
      const skip = (page - 1) * pageSize;
      const res = await api.get('/pull-out-requests/mine', { params: { skip, take: pageSize, allPending: true } });
      setMyRequests(res.data.data);
      setTotalRequests(res.data.total);
    } catch (err) {
      console.error('Failed to fetch pull out requests', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pending scan?')) return;
    try {
      await api.delete(`/pull-out-requests/${id}`);
      fetchMyRequests();
    } catch (err) {
      alert('Failed to delete request');
    }
  };

  useEffect(() => {
    const fetchNames = async () => {
      const itemsToFetch = cart.filter(item => item.manualSlug && item.manualSlug.length > 3 && !item.productName && item.status !== 'scanning' && item.status !== 'searching');
      
      for (const item of itemsToFetch) {
        try {
          updateCartItem(item.id, { status: 'searching' });
          const res = await api.get(`/items/${item.manualSlug}`);
          if (res.data) {
            updateCartItem(item.id, { 
              productName: res.data.name,
              unit: res.data.unit || 'pcs',
              status: 'success'
            });
          } else {
            updateCartItem(item.id, { status: 'manual' });
          }
        } catch (err) {
          updateCartItem(item.id, { status: 'manual' });
          console.error(`Item not found: ${item.manualSlug}`);
        }
      }
    };

    const timer = setTimeout(fetchNames, 1000); // Debounce
    return () => clearTimeout(timer);
  }, [cart]);

  useEffect(() => {
    fetchMyRequests();
  }, [page]);

  const fetchStaffInventory = async () => {
    try {
      const res = await api.get('/staff-inventory/mine');
      setStaffInventory(res.data);
    } catch (err) {
      console.error('Failed to fetch staff inventory', err);
    }
  };

  const fetchStaffReleases = async () => {
    try {
      const res = await api.get('/staff-inventory/releases');
      setStaffReleases(res.data);
    } catch (err) {
      console.error('Failed to fetch staff releases', err);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchStaffInventory();
    fetchStaffInventory();
    fetchStaffReleases();
    fetchMyRequests();
  }, []);

  const toggleFilter = (productName: string, specKey: string, specValue: string) => {
    setProductFilters(prev => {
      const currentProductFilters = prev[productName] || {};
      const newFilters = { ...currentProductFilters };
      if (newFilters[specKey] === specValue) delete newFilters[specKey];
      else newFilters[specKey] = specValue;
      return { ...prev, [productName]: newFilters };
    });
  };

  const getFilteredQty = (product: Product) => {
    const filters = productFilters[product.name] || {};
    if (Object.keys(filters).length === 0) return product.totalQty;
    return product.items
      .filter(item => Object.entries(filters).every(([fKey, fVal]) => 
        item.fieldValues.some(fv => {
          if (fv.name !== fKey) return false;
          const val = fv.value;
          if (val && typeof val === 'object' && val.useUnitQty) return String(val.main || '') === fVal;
          return String(val) === fVal;
        })
      ))
      .reduce((sum, item) => sum + item.qty, 0);
  };

  const addToCart = () => {
    const newItem: CartItem = {
      id: Math.random().toString(36).substr(2, 9),
      slug: '',
      productName: '',
      manualSlug: '',
      qty: 1,
      unit: 'pcs',
      status: 'manual'
    };
    setCart([...cart, newItem]);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleFileUpload = (id: string, file: File, type: 'qr' | 'reference') => {
    const preview = URL.createObjectURL(file);
    if (type === 'qr') {
      updateCartItem(id, { imageFile: file, imagePreview: preview, status: 'scanning' });
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code) {
            let extractedSlug = code.data;
            if (extractedSlug.includes('/i/')) {
              extractedSlug = extractedSlug.split('/i/').pop()?.split('?')[0] || extractedSlug;
            }
            updateCartItem(id, { manualSlug: extractedSlug, status: 'success' });
          } else {
            updateCartItem(id, { status: 'manual' });
            alert('Could not detect QR code in this image. You can still use it as a reference, but please type the Slug manually.');
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      updateCartItem(id, { referenceFile: file, referencePreview: preview });
    }
  };

  const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const updateCartItem = (id: string, updates: Partial<CartItem>) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newItem = { ...item, ...updates };
        // If manualSlug is changing and it's different from the original, clear productName
        if (updates.manualSlug !== undefined && updates.manualSlug !== item.manualSlug) {
          newItem.productName = '';
          newItem.status = 'manual';
        }
        return newItem;
      }
      return item;
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachmentFile(file);
      setAttachmentPreview(URL.createObjectURL(file));
    }
  };

  const handleFinalSubmit = async () => {
    if (!attachmentFile) return alert('Please upload the signed approval form.');
    
    setIsSubmitting(true);
    try {
      // 1. Upload the signed attachment first
      const attachmentFormData = new FormData();
      attachmentFormData.append('file', attachmentFile);
      const attachmentRes = await api.post('/internal-requests/upload', attachmentFormData);
      const attachmentUrl = attachmentRes.data.url;

      // 2. Partition cart into existing scans and manual items
      const scanIds = cart.filter(item => myRequests.some(r => r.id === item.id)).map(item => item.id);
      const manualItems = cart.filter(item => !myRequests.some(r => r.id === item.id));

      console.log('Submitting bulk requisition:', { scans: scanIds.length, manual: manualItems.length });

      // 3. Update existing scans to SUBMITTED
      if (scanIds.length > 0) {
        await api.patch('/pull-out-requests/bulk-submit', {
          ids: scanIds,
          attachmentUrl,
          supervisor: form.supervisorName,
          remarks: form.remarks || 'Bulk Unit Requisition'
        });
      }

      // 4. Create new SUBMITTED requests for manual items
      for (const item of manualItems) {
        let qrImageUrl = '';
        if (item.imageFile) {
          const formData = new FormData();
          formData.append('file', item.imageFile);
          const uploadRes = await api.post('/internal-requests/upload', formData);
          qrImageUrl = uploadRes.data.url;
        } else if (item.imagePreview && item.imagePreview.startsWith('data:')) {
          const file = dataURLtoFile(item.imagePreview, `qr-${item.manualSlug}.jpg`);
          const formData = new FormData();
          formData.append('file', file);
          const uploadRes = await api.post('/internal-requests/upload', formData);
          qrImageUrl = uploadRes.data.url;
        }

        const additionalImages: string[] = [];
        if (item.referenceFile) {
          const formData = new FormData();
          formData.append('file', item.referenceFile);
          const uploadRes = await api.post('/internal-requests/upload', formData);
          additionalImages.push(uploadRes.data.url);
        } else if (item.referencePreview && item.referencePreview.startsWith('data:')) {
          const file = dataURLtoFile(item.referencePreview, `ref-${item.manualSlug}.jpg`);
          const formData = new FormData();
          formData.append('file', file);
          const uploadRes = await api.post('/internal-requests/upload', formData);
          additionalImages.push(uploadRes.data.url);
        }

        await api.post('/pull-out-requests', {
          itemSlug: item.manualSlug,
          qty: item.qty,
          remarks: form.remarks || 'Manual Unit Requisition',
          imageUrl: qrImageUrl || undefined,
          attachmentUrl: attachmentUrl,
          additionalImages: additionalImages.length > 0 ? additionalImages : undefined,
          supervisor: form.supervisorName,
          status: 'SUBMITTED' // Mark as submitted immediately
        });
      }
      
      setCart([]);
      setForm(prev => ({ ...prev, remarks: '' }));
      setAttachmentFile(null);
      setCart([]);
      setForm(prev => ({ ...prev, remarks: '' }));
      setAttachmentFile(null);
      setAttachmentPreview(null);
      setShowSubmitModal(false);
      alert('Unit pull-out requests submitted successfully! Wait for Admin approval.');
      fetchInventory();
      fetchMyRequests();
      fetchStaffInventory();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualStockAdd = () => {
    setShowManualModal(true);
  };

  const submitManualStock = async () => {
    if (!manualForm.productName || manualForm.rows.length === 0) {
      alert('Product Name and at least one item row are required.');
      return;
    }
    try {
      setIsSubmitting(true);
      for (const row of manualForm.rows) {
        await api.post('/staff-inventory/adjust', { 
          productName: manualForm.productName, 
          ...row 
        });
      }
      alert('Stock added successfully');
      setShowManualModal(false);
      setManualForm({ productName: '', rows: [] });
      setCurrentRow({ specs: '', qty: 1, unit: 'pcs' });
      fetchStaffInventory();
    } catch (err) {
      alert('Failed to add stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addToBatch = () => {
    if (!currentRow.specs) return alert('Please enter specifications');
    setManualForm({ ...manualForm, rows: [...manualForm.rows, { ...currentRow }] });
    setCurrentRow({ specs: '', qty: 1, unit: 'pcs' });
  };

  const handleReleaseSubmit = async () => {
    if (!selectedInventoryItem) return;
    
    try {
      setIsSubmitting(true);
      if (isBulkMode) {
        const releases = bulkRows
          .filter(row => row.employeeName && row.qty > 0)
          .map(row => ({
            ...releasingForm,
            employeeName: row.employeeName,
            qty: row.qty,
            productName: selectedInventoryItem.productName,
            specs: selectedInventoryItem.specs,
          }));
        
        if (releases.length === 0) return alert('Please add at least one valid employee');
        await api.post('/staff-inventory/bulk-release', { releases });
      } else {
        const { employeeName, qty } = bulkRows[0];
        if (!employeeName || qty <= 0) return alert('Please enter employee name and valid quantity');
        await api.post('/staff-inventory/release', {
          ...releasingForm,
          employeeName,
          qty,
          productName: selectedInventoryItem.productName,
          specs: selectedInventoryItem.specs,
        });
      }
      
      alert('Release processed successfully');
      setSelectedInventoryItem(null);
      setBulkRows([{ employeeName: '', qty: 1 }]);
      fetchStaffInventory();
      fetchStaffReleases();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to process release');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!detailItem) return;
    if (!confirm(`Are you sure you want to remove ${detailItem.productName} from your inventory?`)) return;
    
    try {
      setIsSubmitting(true);
      await api.post('/staff-inventory/delete', {
        productName: detailItem.productName,
        specs: detailItem.specs
      });
      alert('Item removed from inventory');
      setDetailItem(null);
      fetchStaffInventory();
    } catch (err) {
      alert('Failed to remove item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!detailItem) return;
    try {
      setIsSubmitting(true);
      await api.post('/staff-inventory/update', {
        productName: detailItem.productName,
        specs: detailItem.specs,
        qty: detailItem.qty,
        threshold: detailItem.threshold
      });
      alert('Inventory updated');
      fetchStaffInventory();
    } catch (err) {
      alert('Failed to update inventory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInventory = inventory.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Unit Requisition Portal</h1>
          
          <div className="flex items-center gap-2 mt-4">
            {/* The tabs are now in the sidebar as sub-items */}
          </div>

          {activeTab === 'history' && (
            <div className="flex items-center gap-4 mt-2 animate-in fade-in slide-in-from-left-4 duration-300">
               <button 
                 onClick={() => setHistorySubTab('pending')}
                 className={`flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${historySubTab === 'pending' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white border border-gray-100 text-gray-400'}`}
               >
                 <Clock className="h-3 w-3" /> Pending Approval ({myRequests.filter(r => r.status === 'PENDING').length})
               </button>
               <button 
                 onClick={() => setHistorySubTab('all')}
                 className={`flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${historySubTab === 'all' ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20' : 'bg-white border border-gray-100 text-gray-400'}`}
               >
                 <ClipboardList className="h-3 w-3" /> All History
               </button>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* LEFT COLUMN: Requisition Form */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl overflow-hidden flex flex-col">
            <div className="bg-primary px-8 py-6">
              <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center">
                <ClipboardList className="mr-3 h-5 w-5" />
                Unit Pull-Out Form
              </h2>
            </div>

            <div className="p-8 space-y-8 flex-1 overflow-y-auto max-h-[70vh]">
              {/* Pending Scans from QR - loaded from API */}
              {myRequests.filter(r => r.status === 'PENDING').length > 0 && (
                <div className="bg-orange-50/50 rounded-[2rem] border border-orange-100 p-6 space-y-4 animate-in slide-in-from-top-4 mb-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 bg-orange-600/10 rounded-xl flex items-center justify-center">
                        <History className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Pending from QR Scans</h3>
                        <p className="text-[8px] font-bold text-orange-600/60 uppercase tracking-tighter">Scan QR, review here, then submit</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {myRequests.filter(r => r.status === 'PENDING').map((item) => (
                      <div key={item.id} className="bg-white p-4 rounded-2xl border border-orange-100/50 flex items-center justify-between hover:border-orange-500/30 transition-all group shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center border border-gray-100">
                             {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" alt="QR" /> : <QrCode className="h-4 w-4 text-gray-300" />}
                          </div>
                          <div>
                            <p className="text-xs font-mono font-bold text-gray-900 leading-none mb-1">{item.item?.slug || item.itemId}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{item.qty} {item.unit}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleDeleteRequest(item.id)}
                            className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="Delete Request"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => {
                              const cartItem: CartItem = {
                                id: item.id,
                                slug: item.item?.slug || item.itemId,
                                productName: item.item?.name,
                                manualSlug: item.item?.slug || item.itemId,
                                qty: item.qty,
                                unit: item.unit || 'pcs',
                                imagePreview: null,
                                referencePreview: item.imageUrl,
                                status: 'success'
                              };
                              setCart(prev => [...prev, cartItem]);
                              if (item.supervisor && !form.supervisorName) {
                                setForm(prev => ({ ...prev, supervisorName: item.supervisor }));
                              }
                            }}
                            className="px-4 py-2 bg-orange-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-orange-900/20 active:scale-95 transition-all flex items-center gap-2"
                          >
                            <Plus className="h-3 w-3" /> Add to Form
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8 border-b border-gray-50">
                <div className="col-span-2 flex items-center gap-2 mb-2">
                   <User className="h-4 w-4 text-primary" />
                   <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">General Information</h3>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Request Date</label>
                  <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all bg-gray-100/50" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Supervisor Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter supervisor..."
                    value={form.supervisorName} 
                    onChange={(e) => setForm({ ...form, supervisorName: e.target.value })} 
                    className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all bg-gray-50 focus:bg-white" 
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Overall Remarks</label>
                  <textarea 
                    rows={2}
                    placeholder="Any additional notes for this pull-out..."
                    value={form.remarks} 
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })} 
                    className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all bg-gray-50 focus:bg-white resize-none" 
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-primary" />
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Items Requested ({cart.length})</h3>
                  </div>
                  <button onClick={addToCart} className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                    <Plus className="h-3 w-3" /> Add Row
                  </button>
                </div>

                {cart.length === 0 ? (
                  <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-[2rem]">
                    <QrCode className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">Add items from explorer or manual entry</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item, idx) => (
                      <div key={item.id} className="relative bg-gray-50/50 rounded-3xl border border-gray-100 p-6 group animate-in slide-in-from-bottom-2">
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="absolute -top-2 -right-2 h-8 w-8 bg-white border border-gray-100 text-gray-400 hover:text-red-500 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-10"
                        >
                          <X className="h-4 w-4" />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                          <div className="md:col-span-4 flex gap-3">
                            <div className="flex-1 space-y-2">
                              <p className="text-[8px] font-black text-gray-600 uppercase text-center tracking-tighter">QR Scan</p>
                              <div className="aspect-square relative rounded-2xl border border-gray-200 bg-white overflow-hidden group/img">
                                {item.imagePreview ? (
                                  <img src={item.imagePreview} className="w-full h-full object-cover" alt="QR" />
                                ) : (
                                  <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-all">
                                    <Camera className="h-6 w-6 text-gray-500 group-hover/img:text-primary transition-colors" />
                                    <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFileUpload(item.id, e.target.files[0], 'qr')} />
                                  </label>
                                )}
                                {item.status === 'scanning' && (
                                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                    <Clock className="h-4 w-4 text-primary animate-spin" />
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex-1 space-y-2">
                              <p className="text-[8px] font-black text-gray-600 uppercase text-center tracking-tighter">Reference</p>
                              <div className="aspect-square relative rounded-2xl border border-gray-200 bg-white overflow-hidden">
                                {item.referencePreview ? (
                                  <img src={item.referencePreview} className="w-full h-full object-cover" alt="Ref" />
                                ) : (
                                  <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-all">
                                    <ImageIcon className="h-6 w-6 text-gray-500" />
                                    <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFileUpload(item.id, e.target.files[0], 'reference')} />
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="md:col-span-8 flex flex-col justify-center space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                               <div className="col-span-2">
                                  <div className="flex items-center justify-between mb-1.5 ml-1">
                                     <label className="block text-[9px] font-black text-gray-400 uppercase">QR ID (Manual / Auto)</label>
                                     {item.status === 'searching' && (
                                        <span className="text-[10px] font-black text-blue-500 uppercase animate-pulse">
                                          Searching...
                                        </span>
                                      )}
                                      {item.productName && (
                                       <span className="text-[10px] font-black text-primary uppercase animate-in fade-in zoom-in duration-300">
                                         {item.productName}
                                       </span>
                                     )}
                                  </div>
                                  <div className="relative">
                                    <input 
                                      type="text"
                                      placeholder="ST-00000"
                                      value={item.manualSlug}
                                      onChange={e => updateCartItem(item.id, { manualSlug: e.target.value.toUpperCase() })}
                                      className={`w-full rounded-xl border px-4 py-3 text-xs font-mono font-bold outline-none transition-all ${
                                        item.status === 'success' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-primary focus:bg-white'
                                      }`}
                                    />
                                    {item.status === 'success' && <CheckCircle className="absolute right-4 top-3 h-4 w-4 text-green-500" />}
                                  </div>
                               </div>

                               <div>
                                  <label className="block text-[9px] font-black text-gray-400 uppercase mb-1.5 ml-1">Qty</label>
                                  <input 
                                    type="number"
                                    min="1"
                                    value={item.qty}
                                    onChange={e => updateCartItem(item.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold text-gray-900 focus:border-primary focus:bg-white outline-none transition-all"
                                  />
                               </div>

                               <div className="flex flex-col justify-end">
                                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Unit: {item.unit || 'pcs'}</p>
                               </div>
                             </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 bg-gray-50 border-t border-gray-100">
              <button 
                onClick={() => {
                   if (cart.length === 0) return alert('Your request list is empty.');
                   if (cart.some(item => !item.manualSlug)) return alert('Please provide the QR ID (Slug) for all items.');
                   if (!form.supervisorName.trim()) return alert('Please enter the Supervisor Name.');
                   setShowSubmitModal(true);
                }}
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-gray-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isSubmitting ? (
                  <><Clock className="h-5 w-5 animate-spin" /> Processing...</>
                ) : (
                  <><ClipboardList className="h-5 w-5" /> Preview & Submit Request ({cart.length})</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Unit Explorer */}
        <div className="lg:col-span-6 flex flex-col space-y-6 max-h-[85vh]">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-xl space-y-6 shrink-0">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <Box className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Stock Explorer</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Browse by Product Batch</p>
                  </div>
                </div>
             </div>
            
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search products, IDs, or batches..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full rounded-[1.5rem] border border-gray-100 pl-14 pr-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all bg-gray-50/30"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {loading ? (
               <div className="space-y-6">
                 <CardSkeleton className="h-[200px]" />
                 <CardSkeleton className="h-[200px]" />
                 <CardSkeleton className="h-[200px]" />
               </div>
            ) : filteredInventory.length === 0 ? (
               <div className="p-20 text-center bg-white rounded-[2.5rem] border border-dashed border-gray-100">
                 <Search className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                 <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No matching batches found</p>
               </div>
            ) : (
              filteredInventory.map(product => (
                <div key={product.name} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden transition-all hover:shadow-2xl hover:shadow-primary/5">
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 bg-gray-50 rounded-[1.2rem] flex items-center justify-center text-gray-400">
                          <Package className="h-7 w-7" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">{product.name}</h3>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{product.unit}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] font-black text-primary uppercase tracking-widest mb-1">In Stock</span>
                        <span className="text-3xl font-black text-gray-900">{getFilteredQty(product)}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => setExpandedProduct(expandedProduct === product.name ? null : product.name)}
                      className="w-full mt-6 py-4 bg-gray-50 rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-primary flex items-center justify-center gap-2 transition-all group"
                    >
                      {expandedProduct === product.name ? 'Hide Batch Items' : 'View All QR Slugs'}
                      {expandedProduct === product.name ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {expandedProduct === product.name && (
                      <div className="mt-4 space-y-2 animate-in slide-in-from-top-4 duration-300">
                        {product.items.map(item => (
                          <div key={item.slug} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-white transition-all group/row">
                                <div className="flex flex-col">
                                  <span className="text-sm font-mono font-bold text-gray-900">{item.slug}</span>
                                  <span className="text-[10px] font-black text-gray-400 uppercase">Batch: {item.batch || 'N/A'}</span>
                                </div>
                                <button 
                                  onClick={() => setCart([...cart, { id: Math.random().toString(36).substr(2, 9), slug: item.slug, productName: product.name, manualSlug: item.slug, qty: 1, unit: product.unit || 'pcs', status: 'success' }])}
                                  className="h-10 w-10 bg-white border border-gray-100 text-gray-400 hover:text-primary rounded-xl transition-all shadow-sm flex items-center justify-center"
                                >
                                  <Plus className="h-5 w-5" />
                                </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <History className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">{historySubTab === 'pending' ? 'Pending Approval' : 'Requisition History'}</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Track your unit release requests</p>
                </div>
             </div>
             <button onClick={fetchMyRequests} className={`p-3 rounded-2xl border border-gray-100 bg-white text-gray-400 hover:text-primary transition-all ${isRefreshing ? 'animate-spin' : ''}`}>
                <Activity className="h-5 w-5" />
             </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Asset ID</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {myRequests
                  .filter(r => historySubTab === 'all' || r.status === 'PENDING')
                  .map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-8 py-5 text-sm font-bold text-gray-700">{new Date(req.createdAt).toLocaleDateString()}</td>
                      <td className="px-8 py-5 text-sm font-mono font-bold text-primary">{req.item.slug}</td>
                      <td className="px-8 py-5 text-center font-black text-gray-900">{req.qty} <span className="text-[10px] text-gray-400 uppercase font-bold">{req.unit}</span></td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                          req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                {myRequests.filter(r => historySubTab === 'all' || r.status === 'PENDING').length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                       <Clock className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                       <p className="text-sm font-bold text-gray-400 font-bold uppercase tracking-widest">No requests found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="flex items-center justify-between mt-4 px-8 pb-8">
            <div className="text-xs font-bold text-gray-500">
              Showing {totalRequests === 0 ? 0 : ((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalRequests)} of {totalRequests} entries
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-black uppercase disabled:opacity-50 hover:bg-gray-50 transition-colors shadow-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * pageSize >= totalRequests}
                className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-black uppercase disabled:opacity-50 hover:bg-gray-50 transition-colors shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Personal Stock Inventory</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Items approved for your use or manually added</p>
              </div>
              <button onClick={handleManualStockAdd} className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-primary transition-all">
                <Plus className="h-4 w-4" /> Add Manual Stock
              </button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {staffInventory.map(item => (
                <div 
                  key={item.id} 
                  onDoubleClick={() => setDetailItem(item)}
                  className={`bg-white p-8 rounded-[2.5rem] border shadow-xl group transition-all cursor-pointer relative ${item.qty <= (item.threshold || 5) ? 'border-red-200 bg-red-50/10' : 'border-gray-100'}`}
                >
                   {item.qty <= (item.threshold || 5) && (
                     <div className="absolute top-6 left-6 flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest animate-pulse">
                       <AlertTriangle className="h-3 w-3" /> Low Stock
                     </div>
                   )}
                   <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                     <div className="bg-gray-50 text-[8px] font-black uppercase px-2 py-1 rounded text-gray-400">Double-click for details</div>
                   </div>
                   <div className="h-12 w-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                      <Box className="h-6 w-6" />
                   </div>
                   <h3 className="text-sm font-black text-gray-900 mb-1">{item.productName}</h3>
                   <p className="text-[10px] font-bold text-gray-400 uppercase leading-tight mb-4">{item.specs}</p>
                   <p className="text-[9px] font-bold text-primary uppercase tracking-widest mb-4 bg-primary/5 inline-block px-2 py-1 rounded">{item.unit}</p>
                   <div className="flex items-end justify-between mt-auto">
                      <div>
                        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Available</span>
                        <span className="text-3xl font-black text-gray-900">{item.qty}</span>
                      </div>
                      <button onClick={() => { setSelectedInventoryItem(item); router.push('/dashboard/staff/unit-requisition?tab=releasing'); }} className="p-3 bg-gray-50 text-gray-400 hover:text-white hover:bg-primary rounded-xl transition-all">
                        <Truck className="h-5 w-5" />
                      </button>
                   </div>
                </div>
              ))}
              {staffInventory.length === 0 && (
                <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                   <Box className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                   <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Your inventory is empty</p>
                </div>
              )}
           </div>
        </div>
      )}

      {activeTab === 'releasing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-2xl overflow-hidden flex flex-col">
                 <div className="bg-gray-900 px-8 py-6 flex items-center justify-between">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center">
                      <Truck className="mr-3 h-5 w-5 text-primary" /> Employee Issuance
                    </h2>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bulk Mode</span>
                       <button onClick={() => setIsBulkMode(!isBulkMode)} className={`w-10 h-6 rounded-full transition-all relative ${isBulkMode ? 'bg-primary' : 'bg-gray-700'}`}>
                         <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isBulkMode ? 'left-5' : 'left-1'}`} />
                       </button>
                    </div>
                 </div>
                 <div className="p-8 space-y-6">
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Selected Item</label>
                       <select value={selectedInventoryItem?.id || ''} onChange={(e) => setSelectedInventoryItem(staffInventory.find(i => i.id === e.target.value))} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none">
                          <option value="">Select an item to release...</option>
                          {staffInventory.map(item => (
                            <option key={item.id} value={item.id}>{item.productName} ({item.specs}) • {item.qty} {item.unit} available</option>
                          ))}
                       </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Shift</label>
                          <input type="text" placeholder="Day/Night" value={releasingForm.shift} onChange={e => setReleasingForm({...releasingForm, shift: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none" />
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Department</label>
                          <input type="text" placeholder="Production/Admin" value={releasingForm.department} onChange={e => setReleasingForm({...releasingForm, department: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none" />
                       </div>
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Supervisor</label>
                       <input type="text" placeholder="Authorized Signatory" value={releasingForm.supervisor} onChange={e => setReleasingForm({...releasingForm, supervisor: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none" />
                    </div>
                    <div className="space-y-4">
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{isBulkMode ? 'Employee List' : 'Recipient Details'}</label>
                       {bulkRows.map((row, idx) => (
                         <div key={idx} className="flex gap-4">
                            <input type="text" placeholder="Full Name" value={row.employeeName} onChange={e => { const newRows = [...bulkRows]; newRows[idx].employeeName = e.target.value; setBulkRows(newRows); }} className="flex-1 px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none" />
                            <input type="number" value={row.qty} onChange={e => { const newRows = [...bulkRows]; newRows[idx].qty = parseInt(e.target.value); setBulkRows(newRows); }} className="w-24 px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-center outline-none" />
                            {isBulkMode && idx > 0 && ( <button onClick={() => setBulkRows(bulkRows.filter((_, i) => i !== idx))} className="p-4 text-red-400 hover:text-red-600"><X className="h-5 w-5" /></button> )}
                         </div>
                       ))}
                       {isBulkMode && ( <button onClick={() => setBulkRows([...bulkRows, { employeeName: '', qty: 1 }])} className="w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 transition-all">+ Add Another Employee</button> )}
                    </div>
                    <button onClick={handleReleaseSubmit} disabled={isSubmitting || !selectedInventoryItem} className="w-full py-6 bg-primary text-white rounded-[2rem] text-sm font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                      {isSubmitting ? 'Processing...' : 'Confirm Issuance'}
                    </button>
                 </div>
              </div>
           </div>
           <div className="lg:col-span-7">
              <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl overflow-hidden flex flex-col">
                 <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <div><h2 className="text-xl font-black text-gray-900 tracking-tight">Issuance Log</h2><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">History of items released to employees</p></div>
                    <button onClick={fetchStaffReleases} className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-primary"><Activity className="h-5 w-5" /></button>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead><tr className="bg-gray-50/30"><th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th><th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th><th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Item</th><th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty</th></tr></thead>
                       <tbody className="divide-y divide-gray-50">
                          {staffReleases.map(rel => (
                            <tr key={rel.id} className="hover:bg-gray-50/50 transition-colors">
                               <td className="px-8 py-5 text-sm font-bold text-gray-700">{new Date(rel.date).toLocaleDateString()}</td>
                               <td className="px-8 py-5"><p className="text-sm font-black text-gray-900">{rel.employeeName}</p><p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{rel.department} • {rel.shift}</p></td>
                               <td className="px-8 py-5">
                                 <p className="text-sm font-black text-gray-900">{rel.productName}</p>
                                 <p className="text-[10px] font-bold text-gray-400 uppercase leading-tight">{rel.specs}</p>
                                 {rel.itemSlug && <p className="text-[9px] font-mono text-primary mt-1 opacity-60">Source: {rel.itemSlug}</p>}
                               </td>
                               <td className="px-8 py-5 text-center font-black text-gray-900">{rel.qty}</td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        </div>
      )}

      {showSubmitModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-8 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-2">Approval Verification</h2>
                <p className="text-xs text-gray-500 font-medium">Please print, sign, and upload the unit pull-out form before submitting.</p>
              </div>
              <button onClick={() => setShowSubmitModal(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-full transition-colors shadow-sm">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Document Preview</h3>
                  <button 
                    onClick={() => {
                      const printContent = document.getElementById('printable-area');
                      const windowPrint = window.open('', '', 'left=0,top=0,width=800,height=900');
                      if (windowPrint && printContent) {
                        windowPrint.document.write(`<html><head><title>Unit Pull-Out Form</title><style>body { font-family: sans-serif; padding: 40px; } .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; } .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #000; padding: 10px; text-align: left; } th { background: #eee; font-size: 10px; text-transform: uppercase; } .signatures { display: flex; justify-content: flex-end; margin-top: 50px; } .sig-line { width: 250px; border-top: 1px solid #000; text-align: center; padding-top: 5px; font-weight: bold; }</style></head><body>${printContent.innerHTML}</body></html>`);
                        windowPrint.document.close();
                        windowPrint.print();
                        windowPrint.close();
                      }
                    }}
                    className="px-4 py-2 bg-gray-900 text-white text-[10px] font-black uppercase rounded-xl shadow-lg hover:bg-primary transition-all flex items-center"
                  >
                    <ClipboardList className="w-3.5 h-3.5 mr-2" /> Print Form
                  </button>
                </div>
                <div id="printable-area" className="border border-gray-200 rounded-2xl p-8 bg-white shadow-sm text-xs text-gray-900">
                  <div className="header"><h1 style={{ fontSize: '20px', margin: '0' }}>UNIT PULL-OUT REQUEST</h1><p style={{ margin: '5px 0' }}>Date: {new Date(form.date).toLocaleDateString()}</p></div>
                  <div className="details"><div><p><strong>Supervisor:</strong> {form.supervisorName}</p><p><strong>Remarks:</strong> {form.remarks || 'N/A'}</p></div></div>
                  <table><thead><tr><th>QR ID / Slug</th><th>Product</th><th>Quantity</th></tr></thead>
                    <tbody>{cart.map(item => (<tr key={item.id}><td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{item.manualSlug}</td><td>{item.productName || 'Manual Entry'}</td><td style={{ fontWeight: 'bold' }}>{item.qty} Pairs</td></tr>))}</tbody>
                  </table>
                  <div className="signatures"><div style={{ textAlign: 'center' }}><br/><br/><br/><div className="sig-line">Supervisor Approval Signature</div></div></div>
                </div>
              </div>
              <div className="space-y-6 flex flex-col">
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Upload Signed Form</h3>
                  <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-gray-200 rounded-[2rem] cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all relative overflow-hidden group">
                    {attachmentPreview ? <img src={attachmentPreview} className="w-full h-full object-contain p-4" alt="Signed" /> : <div className="flex flex-col items-center justify-center p-6 text-center"><div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4"><Plus className="w-6 h-6 text-primary" /></div><p className="text-sm text-gray-500 font-bold mb-1">Click to upload signed form</p><p className="text-[10px] text-gray-400 uppercase tracking-widest">PNG, JPG, or PDF (MAX. 5MB)</p></div>}
                    <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
                  </label>
                </div>
                <div className="mt-auto bg-blue-50 p-6 rounded-[2rem] flex items-start border border-blue-100">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-4 flex-shrink-0" />
                  <p className="text-xs text-blue-800 leading-relaxed font-medium">To proceed, you must print this document, have your supervisor sign it, and upload the photo here. Admin will verify the signature before final approval.</p>
                </div>
              </div>
            </div>
            <div className="p-8 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-4">
              <button onClick={() => setShowSubmitModal(false)} className="px-6 py-3 text-xs font-black text-gray-500 uppercase hover:text-gray-900 transition-all">Cancel</button>
              <button onClick={handleFinalSubmit} disabled={!attachmentFile || isSubmitting} className="px-10 py-4 bg-[#50C878] hover:bg-[#45b068] text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-[#50C878]/20 flex items-center justify-center">
                {isSubmitting ? <><Clock className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : <><Send className="w-4 h-4 mr-2" /> Final Submission</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showManualModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-8 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-2">Add Manual Stock</h2>
                <p className="text-xs text-gray-500 font-medium">Add items you already have on-hand.</p>
              </div>
              <button onClick={() => setShowManualModal(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-full transition-colors shadow-sm">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-8 space-y-8 overflow-y-auto max-h-[75vh]">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">1. Product Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. BOTA-W" 
                  value={manualForm.productName} 
                  onChange={e => setManualForm({...manualForm, productName: e.target.value})} 
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-primary/30 transition-all" 
                />
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">2. Quick Add Spec Row</label>
                <div className="bg-gray-50/50 p-6 rounded-[2.5rem] border border-gray-100 space-y-4">
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Description (e.g. White)</label>
                    <input 
                      type="text" 
                      placeholder="Specs..." 
                      value={currentRow.specs} 
                      onChange={e => setCurrentRow({...currentRow, specs: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-bold outline-none" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      type="number" 
                      placeholder="Qty"
                      value={currentRow.qty} 
                      onChange={e => setCurrentRow({...currentRow, qty: parseInt(e.target.value) || 0})}
                      className="px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-bold text-center outline-none" 
                    />
                    <input 
                      type="text" 
                      placeholder="Unit"
                      value={currentRow.unit} 
                      onChange={e => setCurrentRow({...currentRow, unit: e.target.value})}
                      className="px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-bold text-center outline-none" 
                    />
                  </div>
                  <button 
                    onClick={addToBatch}
                    className="w-full py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-lg"
                  >
                    Add to Batch
                  </button>
                </div>
              </div>

              {manualForm.rows.length > 0 && (
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">3. Ready to Import ({manualForm.rows.length})</label>
                  <div className="space-y-2">
                    {manualForm.rows.map((row, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm animate-in zoom-in-95">
                        <div className="flex items-center gap-4">
                          <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-xs font-black">
                            {row.qty}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900">{row.specs}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">{row.unit}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setManualForm({ ...manualForm, rows: manualForm.rows.filter((_, i) => i !== idx) })}
                          className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <button 
                onClick={submitManualStock} 
                disabled={isSubmitting || manualForm.rows.length === 0}
                className="w-full py-6 bg-primary text-white rounded-[2rem] text-sm font-black uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Importing...' : `Submit All (${manualForm.rows.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="flex items-start justify-between">
                <div className="h-20 w-20 bg-primary/5 rounded-3xl flex items-center justify-center text-primary">
                  <Box className="h-10 w-10" />
                </div>
                <button onClick={() => setDetailItem(null)} className="p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-all">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-4xl font-black text-gray-900 tracking-tight">{detailItem.productName}</h2>
                  {detailItem.qty <= (detailItem.threshold || 5) && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-200 animate-pulse">
                      <AlertTriangle className="h-4 w-4" /> Low Stock Warning
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-lg">Last Updated: {new Date(detailItem.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Current Quantity ({detailItem.unit})</label>
                  <input 
                    ref={qtyInputRef}
                    type="number" 
                    value={detailItem.qty} 
                    onChange={e => setDetailItem({...detailItem, qty: parseInt(e.target.value) || 0})}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xl font-black text-gray-900 outline-none focus:border-primary/30 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Restock Threshold</label>
                  <input 
                    type="number" 
                    value={detailItem.threshold} 
                    onChange={e => setDetailItem({...detailItem, threshold: parseInt(e.target.value) || 0})}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xl font-black text-primary outline-none focus:border-primary/30 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Specifications</h3>
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-sm font-bold text-gray-700 leading-relaxed">{detailItem.specs}</p>
                </div>
              </div>

              {!showRestockOptions ? (
                <div className="grid grid-cols-4 gap-3">
                  <button 
                    onClick={handleUpdateItem}
                    disabled={isSubmitting}
                    className="col-span-2 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" /> Save Changes
                  </button>
                  <button 
                    onClick={() => { setSelectedInventoryItem(detailItem); setDetailItem(null); router.push('/dashboard/staff/unit-requisition?tab=releasing'); }}
                    className="py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-primary transition-all flex items-center justify-center gap-2"
                  >
                    <Truck className="h-4 w-4" /> Release
                  </button>
                  <button 
                    onClick={() => setShowRestockOptions(true)}
                    className="py-4 bg-white border-2 border-gray-100 text-gray-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-primary/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" /> Restock
                  </button>
                </div>
              ) : (
                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 animate-in slide-in-from-bottom-2 duration-300">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center">Choose Restock Method</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => { setDetailItem(null); setShowRestockOptions(false); router.push('/dashboard/staff/unit-requisition?tab=create'); }}
                      className="py-4 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all"
                    >
                      Official Request
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm("WARNING: Manual restock bypasses the official 'Unit Requisition Portal' and will not generate a signed approval form. Continue?")) {
                          setShowRestockOptions(false);
                          qtyInputRef.current?.focus();
                        }
                      }}
                      className="py-4 bg-white border border-gray-200 text-gray-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
                    >
                      Manual Restock
                    </button>
                  </div>
                  <button 
                    onClick={() => setShowRestockOptions(false)}
                    className="w-full mt-4 text-[9px] font-bold text-gray-400 uppercase hover:text-gray-600"
                  >
                    Back to Actions
                  </button>
                </div>
              )}
              <button 
                onClick={handleDeleteItem}
                className="w-full py-3 bg-red-50 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Trash2 className="h-4 w-4" /> Delete from Inventory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
