'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { PageHeaderSkeleton } from '@/components/ui/LoadingSkeletons';
import jsQR from 'jsqr';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { UnitReqHeader } from './components/UnitReqHeader';
import { UnitReqCreateTab } from './components/UnitReqCreateTab';
import { UnitReqHistoryTab } from './components/UnitReqHistoryTab';
import { UnitReqInventoryTab } from './components/UnitReqInventoryTab';
import { UnitReqReleasingTab } from './components/UnitReqReleasingTab';

// Additional UI components (Modals)
import { 
  X, Send, ImageIcon, Plus, Trash2, Box, AlertTriangle, CheckCircle, ClipboardList 
} from 'lucide-react';

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
  const [inventory, setInventory] = useState<any[]>([]);
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
  const [cart, setCart] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Submit Modal & Approval Upload
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'create' | 'history' | 'inventory' | 'releasing'>('create');

  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({ productName: '', rows: [] as any[] });
  const [currentRow, setCurrentRow] = useState<Record<string, any>>({ specs: '', qty: 1, unit: 'pcs' });
  const [detailItem, setDetailItem] = useState<any>(null);
  const [showRestockOptions, setShowRestockOptions] = useState(false);

  useEffect(() => {
    if (tab && ['create', 'history', 'inventory', 'releasing'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [tab]);

  const [historySubTab, setHistorySubTab] = useState<'pending' | 'all'>('pending');
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Staff Inventory & Releasing
  const [staffInventory, setStaffInventory] = useState<any[]>([]);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<any>(null);
  const [staffReleases, setStaffReleases] = useState<any[]>([]);
  const [releaseForm, setReleaseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: '',
    department: '',
    supervisor: '',
    qty: 1,
    remarks: ''
  });

  // Audit State
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [staffActivities, setStaffActivities] = useState<any[]>([]);
  const [auditRequests, setAuditRequests] = useState<any[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);

  // Global Modal Config
  const [modalConfig, setModalConfig] = useState<any>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    onConfirm: () => {},
  });

  const fetchInventory = async () => {
    try {
      const res = await api.get('/items/unit-inventory', { params: { take: 1000 } });
      setInventory(res.data.data || []);
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
      const res = await api.get('/pull-out-requests/mine', { params: { skip, take: pageSize } });
      setMyRequests(res.data.data);
      setTotalRequests(res.data.total);
    } catch (err) {
      console.error('Failed to fetch pull out requests', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const res = await api.get('/pull-out-requests', { params: { status: 'PENDING', take: 100 } });
      setPendingRequests(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch pending requests', err);
    }
  };

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

  const fetchAuditRequests = async () => {
    try {
      setIsAuditLoading(true);
      const [reqRes, actRes] = await Promise.all([
        api.get('/pull-out-requests/mine', { params: { startDate, endDate, take: 1000 } }),
        api.get('/staff-inventory/mine/activities', { params: { startDate, endDate } })
      ]);
      setAuditRequests(reqRes.data.data || []);
      setStaffActivities(actRes.data || []);
    } catch (err) {
      console.error('Failed to fetch audit requests', err);
    } finally {
      setIsAuditLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchStaffInventory();
    fetchMyRequests();
    fetchPendingRequests();
    fetchAuditRequests();
    fetchStaffReleases();
  }, [page]);

  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchAuditRequests();
    }
  }, [activeTab, startDate, endDate]);

  const updateCartItem = (id: string, updates: any) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newItem = { ...item, ...updates };
        if (updates.manualSlug !== undefined && updates.manualSlug !== item.manualSlug) {
          newItem.productName = '';
          newItem.status = 'manual';
        }
        return newItem;
      }
      return item;
    }));
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
            updateCartItem(id, { manualSlug: extractedSlug.toUpperCase(), status: 'success' });
          } else {
            updateCartItem(id, { status: 'manual' });
            toast.error('No QR Code detected');
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      updateCartItem(id, { referenceFile: file, referencePreview: preview });
    }
  };

  const addToCart = () => {
    setCart([...cart, {
      id: Math.random().toString(36).substr(2, 9),
      manualSlug: '',
      qty: 1,
      unit: 'pcs',
      status: 'manual'
    }]);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(i => i.id !== id));
  };

  const handleDeleteRequest = (id: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Delete Pending Request',
      message: 'Are you sure you want to delete this pending request? This action cannot be undone.',
      confirmText: 'Delete Request',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/pull-out-requests/${id}`);
          toast.success('Request deleted');
          fetchMyRequests();
          fetchPendingRequests();
        } catch (err) {
          toast.error('Failed to delete request');
        } finally {
          setModalConfig((prev: any) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleRelease = () => {
    if (!selectedInventoryItem) return;
    setModalConfig({
      isOpen: true,
      title: 'Confirm Issuance',
      message: `Release ${releaseForm.qty} ${selectedInventoryItem.unit} of ${selectedInventoryItem.productName}? (Shift: ${releaseForm.shift}, Dept: ${releaseForm.department})`,
      confirmText: 'Confirm Issuance',
      onConfirm: async () => {
        try {
          setIsSubmitting(true);
          await api.post('/staff-inventory/release', {
            ...releaseForm,
            productName: selectedInventoryItem.productName,
            specs: selectedInventoryItem.specs,
          });
          toast.success('Item released successfully!');
          setSelectedInventoryItem(null);
          setReleaseForm({ date: new Date().toISOString().split('T')[0], shift: '', department: '', supervisor: '', qty: 1, remarks: '' });
          fetchStaffInventory();
          fetchStaffReleases();
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to release item');
        } finally {
          setIsSubmitting(false);
          setModalConfig((prev: any) => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const getFilteredQty = (product: any) => {
    const filters = productFilters[product.name] || {};
    if (Object.keys(filters).length === 0) return product.totalQty;
    return product.items
      .filter((item: any) => Object.entries(filters).every(([fKey, fVal]) => 
        item.fieldValues.some((fv: any) => {
          if (fv.name !== fKey) return false;
          const val = fv.value;
          if (val && typeof val === 'object' && val.useUnitQty) return String(val.main || '') === fVal;
          return String(val) === fVal;
        })
      ))
      .reduce((sum: number, item: any) => sum + item.qty, 0);
  };

  const toggleFilter = (productName: string, specKey: string, specValue: string) => {
    setProductFilters(prev => {
      const currentProductFilters = prev[productName] || {};
      const newFilters = { ...currentProductFilters };
      if (newFilters[specKey] === specValue) delete newFilters[specKey];
      else newFilters[specKey] = specValue;
      return { ...prev, [productName]: newFilters };
    });
  };

  const getAggregatedAudit = () => {
    const summary: Record<string, any> = {};
    staffInventory.forEach(item => {
      const key = `${item.productName}:::${item.specs || 'No Specs'}`;
      summary[key] = { qty: 0, currentStock: item.qty, unit: item.unit || 'pcs', specs: item.specs || 'No Specs', productName: item.productName };
    });
    staffActivities.forEach(act => {
      if (act.action !== 'REQUEST_APPROVED' && act.action !== 'MANUAL_ADJUST') return;
      const key = `${act.productName}:::${act.specs || 'No Specs'}`;
      if (!summary[key]) summary[key] = { qty: 0, currentStock: 0, unit: act.unit || 'pcs', specs: act.specs || 'No Specs', productName: act.productName };
      summary[key].qty += (act.qty || 0);
    });
    return Object.values(summary).sort((a, b) => b.currentStock - a.currentStock);
  };

  const getUnifiedLogs = () => {
    const logs: any[] = [];
    auditRequests.forEach(req => {
      logs.push({ id: req.id, date: req.createdAt, type: 'REQUEST', name: req.item?.name || 'Unknown Item', slug: req.item?.slug || 'N/A', qty: req.qty, unit: req.unit, status: req.status, imageUrl: req.imageUrl });
    });
    staffActivities.forEach(act => {
      if (['PULL_REQUEST', 'REQUEST_APPROVED', 'REQUEST_REJECTED'].includes(act.action)) return;
      let status = act.action;
      if (act.action === 'ITEM_RELEASE') status = 'RELEASED';
      logs.push({ id: act.id, date: act.createdAt, type: 'ACTIVITY', name: act.productName, slug: act.specs || 'No Specs', qty: act.qty, unit: act.unit || 'pcs', status });
    });
    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handleFinalSubmit = async () => {
    if (!attachmentFile) return toast.error('Please upload approval document');
    setIsSubmitting(true);
    try {
      const attachmentFormData = new FormData();
      attachmentFormData.append('file', attachmentFile);
      const attachmentRes = await api.post('/internal-requests/upload', attachmentFormData);
      const attachmentUrl = attachmentRes.data.url;

      const scanIds = cart.filter(item => myRequests.some(r => r.id === item.id)).map(item => item.id);
      const manualItems = cart.filter(item => !myRequests.some(r => r.id === item.id));

      if (scanIds.length > 0) {
        await api.patch('/pull-out-requests/bulk-submit', { ids: scanIds, attachmentUrl, supervisor: form.supervisorName, remarks: form.remarks || 'Bulk Unit Requisition' });
      }

      for (const item of manualItems) {
        let qrImageUrl = '';
        if (item.imageFile) {
          const formData = new FormData();
          formData.append('file', item.imageFile);
          const uploadRes = await api.post('/internal-requests/upload', formData);
          qrImageUrl = uploadRes.data.url;
        }
        await api.post('/pull-out-requests', { itemSlug: item.manualSlug, qty: item.qty, remarks: form.remarks || 'Manual Unit Requisition', imageUrl: qrImageUrl || undefined, attachmentUrl, supervisor: form.supervisorName, status: 'SUBMITTED' });
      }
      
      setCart([]);
      setForm(prev => ({ ...prev, remarks: '' }));
      setAttachmentFile(null);
      setAttachmentPreview(null);
      setShowSubmitModal(false);
      toast.success('Requests submitted!');
      fetchInventory();
      fetchMyRequests();
      fetchStaffInventory();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitManualStock = async () => {
    try {
      setIsSubmitting(true);
      for (const row of manualForm.rows) {
        await api.post('/staff-inventory/adjust', { productName: manualForm.productName, ...row });
      }
      toast.success('Stock added successfully');
      setShowManualModal(false);
      setManualForm({ productName: '', rows: [] });
      fetchStaffInventory();
    } catch (err) {
      toast.error('Failed to add stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
      <UnitReqHeader 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        pendingCount={myRequests.filter(r => r.status === 'PENDING').length} 
      />

      <div className="min-h-[60vh]">
        {activeTab === 'create' && (
          <UnitReqCreateTab 
            form={form} setForm={setForm} cart={cart} myRequests={myRequests}
            pendingRequests={pendingRequests}
            handleDeleteRequest={handleDeleteRequest} removeFromCart={removeFromCart}
            updateCartItem={updateCartItem} handleFileUpload={handleFileUpload}
            addToCart={addToCart} setShowSubmitModal={setShowSubmitModal}
            inventory={inventory} searchTerm={searchTerm} setSearchTerm={setSearchTerm}
            expandedProduct={expandedProduct} setExpandedProduct={setExpandedProduct}
            productFilters={productFilters} toggleFilter={toggleFilter}
            getFilteredQty={getFilteredQty}
            setCart={setCart}
            addPendingScanToCart={(item) => {
              setCart(prev => {
                if (prev.some(c => c.id === item.id)) return prev;
                return [...prev, {
                  id: item.id,
                  slug: item.item?.slug || item.itemId,
                  manualSlug: item.item?.slug || item.itemId,
                  productName: item.item?.name || '',
                  qty: item.qty,
                  unit: item.unit,
                  status: 'success',
                  imageUrl: item.imageUrl,
                }];
              });
              toast.success('Added to list');
            }}
          />
        )}

        {activeTab === 'history' && (
          <UnitReqHistoryTab 
            historySubTab={historySubTab} setHistorySubTab={setHistorySubTab}
            myRequests={myRequests} handleDeleteRequest={handleDeleteRequest}
            page={page} setPage={setPage} totalRequests={totalRequests}
            pageSize={pageSize} isRefreshing={isRefreshing}
          />
        )}

        {activeTab === 'inventory' && (
          <UnitReqInventoryTab 
            staffInventory={staffInventory} searchTerm={searchTerm} setSearchTerm={setSearchTerm}
            startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate}
            getAggregatedAudit={getAggregatedAudit} getUnifiedLogs={getUnifiedLogs}
            setDetailItem={setDetailItem} handleManualStockAdd={() => setShowManualModal(true)}
            isAuditLoading={isAuditLoading}
          />
        )}

        {activeTab === 'releasing' && (
          <UnitReqReleasingTab 
            staffInventory={staffInventory} staffReleases={staffReleases}
            selectedInventoryItem={selectedInventoryItem} setSelectedInventoryItem={setSelectedInventoryItem}
            releaseForm={releaseForm} setReleaseForm={setReleaseForm}
            handleRelease={handleRelease} isProcessingRelease={isSubmitting}
            searchTerm={searchTerm} setSearchTerm={setSearchTerm}
          />
        )}
      </div>

      {/* MODALS */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="bg-primary px-10 py-8 flex items-center justify-between border-b border-gray-100">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center">
                  <CheckCircle className="mr-3 h-5 w-5" />
                  Approval Verification
                </h3>
                <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest mt-1.5">Please print, sign, and upload the unit pull-out form before submitting.</p>
              </div>
              <button onClick={() => setShowSubmitModal(false)} className="text-white/60 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 md:grid-cols-2 gap-10 custom-scrollbar">
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
                <div id="printable-area" className="border border-gray-200 rounded-2xl p-8 bg-white shadow-sm text-xs text-gray-900 space-y-4">
                  <div className="header text-center border-b-2 border-gray-900 pb-3">
                    <h1 className="text-lg font-black tracking-widest uppercase">UNIT PULL-OUT REQUEST</h1>
                    <p className="text-[10px] font-bold text-gray-400 mt-1">Date: {new Date(form.date).toLocaleDateString()}</p>
                  </div>
                  <div className="details grid grid-cols-2 gap-4">
                    <div>
                      <p><strong>Supervisor:</strong> {form.supervisorName || 'N/A'}</p>
                      <p><strong>Remarks:</strong> {form.remarks || 'N/A'}</p>
                    </div>
                  </div>
                  <table className="w-full border-collapse border border-gray-900 mt-4">
                    <thead>
                      <tr className="bg-gray-100 text-[10px] uppercase">
                        <th className="border border-gray-900 p-2 text-left" style={{ width: '35%' }}>Product Name</th>
                        <th className="border border-gray-900 p-2 text-left" style={{ width: '45%' }}>Specification</th>
                        <th className="border border-gray-900 p-2 text-left" style={{ width: '20%' }}>Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map(item => {
                        let name = item.productName || '';
                        let specs = '';
                        if (!name && item.manualSlug) {
                          const foundProduct = inventory.find((p: any) => 
                            p.items.some((ui: any) => ui.slug === item.manualSlug)
                          );
                          if (foundProduct) {
                            name = foundProduct.name;
                            const foundUnitItem = foundProduct.items.find((ui: any) => ui.slug === item.manualSlug);
                            if (foundUnitItem) {
                              specs = foundUnitItem.fieldValues
                                .filter((fv: any) => fv.value)
                                .map((fv: any) => {
                                  const fvName = fv.name ? fv.name.trim().toUpperCase() : '';
                                  const rawVal = fv.value;
                                  const displayVal = typeof rawVal === 'object' ? (rawVal.main || '') : rawVal;
                                  const valStr = String(displayVal || '').trim();

                                  if (fvName === 'PRODUCT NAME' && valStr.toUpperCase() === name.toUpperCase()) {
                                    return null;
                                  }
                                  return displayVal ? `${fv.name}: ${displayVal}` : null;
                                })
                                .filter(Boolean)
                                .join(', ');
                            }
                          }
                        } else {
                          const specsStr = item.specs || '';
                          if (specsStr) {
                            specs = specsStr
                              .split(/[,|]/)
                              .map((part: string) => part.trim())
                              .filter((part: string) => {
                                if (!part) return false;
                                if (part.toUpperCase().startsWith('PRODUCT NAME:')) {
                                  const valPart = part.substring('PRODUCT NAME:'.length).trim();
                                  if (valPart.toUpperCase() === name.toUpperCase()) {
                                    return false;
                                  }
                                }
                                return true;
                              })
                              .join(', ');
                          }
                        }

                        const resolvedName = name || item.manualSlug || 'MANUAL ENTRY';
                        const resolvedSpecs = specs || 'N/A';

                        return (
                          <tr key={item.id} className="text-xs">
                            <td className="border border-gray-900 p-2 font-bold uppercase">{resolvedName}</td>
                            <td className="border border-gray-900 p-2 font-bold uppercase">{resolvedSpecs}</td>
                            <td className="border border-gray-900 p-2 font-bold uppercase">{item.qty} {item.unit || 'pcs'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="signatures flex justify-end mt-12">
                    <div className="text-center">
                      <br /><br />
                      <div className="w-[200px] border-t border-gray-900 pt-1 text-[10px] font-bold uppercase tracking-wider">Supervisor Approval Signature</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6 flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Supervisor Name</label>
                    <input
                      type="text"
                      placeholder="ENTER SUPERVISOR FULL NAME..."
                      value={form.supervisorName}
                      onChange={e => setForm({ ...form, supervisorName: e.target.value.toUpperCase() })}
                      className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all placeholder:text-gray-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Upload Signed Form</label>
                      <span className="text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg">MANDATORY</span>
                    </div>
                    <label className="block">
                      <input type="file" className="hidden" accept="image/*,application/pdf" onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAttachmentFile(file);
                          setAttachmentPreview(URL.createObjectURL(file));
                        }
                      }} />
                      <div className={`w-full py-10 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all cursor-pointer ${attachmentFile ? 'bg-green-50/50 border-green-200 text-green-600' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-primary hover:bg-white'}`}>
                        {attachmentPreview ? (
                          <img src={attachmentPreview} className="h-24 w-full object-contain rounded-xl p-2" alt="Preview" />
                        ) : (
                          <ImageIcon className="h-10 w-10 opacity-40" />
                        )}
                        <span className="text-xs font-black uppercase tracking-widest">
                          {attachmentFile ? attachmentFile.name : 'Upload Signed Form'}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-blue-50/80 p-6 rounded-[2rem] flex items-start border border-blue-100 shadow-sm">
                    <CheckCircle className="w-5 h-5 text-blue-600 mr-4 flex-shrink-0" />
                    <p className="text-[10px] text-blue-800 leading-relaxed font-bold uppercase tracking-tight">
                      To proceed, you must print this document, have your supervisor sign it, and upload the photo here. Admin will verify the signature before final approval.
                    </p>
                  </div>

                  <button
                    onClick={handleFinalSubmit}
                    disabled={isSubmitting || !attachmentFile || !form.supervisorName}
                    className="w-full py-5 bg-[#50C878] hover:bg-[#45b068] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-[#50C878]/30 hover:-translate-y-1 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting...' : 'Complete Requisition'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showManualModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden">
             <div className="bg-gray-900 px-10 py-8 flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Manual Stock Entry</h3>
              <button onClick={() => setShowManualModal(false)} className="text-white/60 hover:text-white"><X className="h-6 w-6" /></button>
            </div>
            <div className="p-10 space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Equipment Name</label>
                <select
                  value={manualForm.productName}
                  onChange={e => {
                    setManualForm({ ...manualForm, productName: e.target.value });
                    setCurrentRow({ specs: '', qty: 1, unit: 'pcs' });
                  }}
                  className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all"
                >
                  <option value="">SELECT EQUIPMENT NAME...</option>
                  {inventory.map((group: any) => (
                    <option key={group.name} value={group.name}>{group.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-50 rounded-[2rem] p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {(() => {
                    const selectedGroup = inventory.find((g: any) => g.name === manualForm.productName);
                    const specKeys = selectedGroup && selectedGroup.specs ? Object.keys(selectedGroup.specs) : [];

                    return (
                      <>
                        {specKeys.length > 0 ? (
                          <div className="md:col-span-6 grid grid-cols-2 gap-2">
                            {specKeys.map(key => (
                              <div key={key} className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{key}</label>
                                <select 
                                  value={currentRow[key] || ''} 
                                  onChange={e => setCurrentRow({ ...currentRow, [key]: e.target.value })} 
                                  className="w-full bg-white border-2 border-transparent rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-primary"
                                >
                                  <option value="">SELECT {key.toUpperCase()}...</option>
                                  {selectedGroup.specs[key].map((val: string) => (
                                    <option key={val} value={val}>{val}</option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="md:col-span-6 space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Specifications</label>
                            <input 
                              type="text" 
                              placeholder="COLOR, SIZE, ETC..." 
                              value={currentRow.specs} 
                              onChange={e => setCurrentRow({ ...currentRow, specs: e.target.value.toUpperCase() })} 
                              className="w-full bg-white border-2 border-transparent rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-primary" 
                            />
                          </div>
                        )}
                        
                        <div className="md:col-span-3 space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Qty</label>
                          <input type="number" value={currentRow.qty} onChange={e => setCurrentRow({ ...currentRow, qty: parseInt(e.target.value) || 1 })} className="w-full bg-white border-2 border-transparent rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-primary" />
                        </div>
                        <div className="md:col-span-3 flex items-end">
                          <button onClick={() => {
                            let finalSpecs = currentRow.specs;
                            if (specKeys.length > 0) {
                              const selectedSpecs = specKeys.map(key => currentRow[key]).filter(Boolean);
                              if (selectedSpecs.length < specKeys.length) return toast.error('Please select all specifications');
                              finalSpecs = selectedSpecs.join(' | ');
                            } else if (!finalSpecs) {
                              return toast.error('Specs required');
                            }
                            setManualForm({ ...manualForm, rows: [...manualForm.rows, { specs: finalSpecs, qty: currentRow.qty, unit: currentRow.unit || 'pcs' }] });
                            setCurrentRow({ specs: '', qty: 1, unit: 'pcs' });
                          }} className="w-full py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest">+ Add</button>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="space-y-2">
                  {manualForm.rows.map((row, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                      <span className="text-xs font-black text-gray-900">{row.specs} - {row.qty} {row.unit}</span>
                      <button onClick={() => setManualForm({ ...manualForm, rows: manualForm.rows.filter((_, idx) => idx !== i) })} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={submitManualStock}
                disabled={isSubmitting || !manualForm.productName || manualForm.rows.length === 0}
                className="w-full py-5 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-gray-900/30 hover:bg-black hover:-translate-y-1 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Add to Inventory'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="bg-primary px-10 py-8 flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Inventory Management</h3>
              <button onClick={() => setDetailItem(null)} className="text-white/60 hover:text-white"><X className="h-6 w-6" /></button>
            </div>
            <div className="p-10 space-y-8">
              <div className="space-y-2">
                <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight">{detailItem.productName}</h4>
                <p className="text-[10px] font-black text-primary bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10 inline-block uppercase tracking-widest">{detailItem.specs}</p>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Stock</label>
                  <input type="number" value={detailItem.qty} onChange={e => setDetailItem({ ...detailItem, qty: parseInt(e.target.value) || 0 })} className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all" />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Low Stock Threshold</label>
                  <input type="number" value={detailItem.threshold || 0} onChange={e => setDetailItem({ ...detailItem, threshold: parseInt(e.target.value) || 0 })} className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all" />
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex gap-4">
                <button 
                  onClick={() => {
                    if (!confirm('Permanently delete this item from your inventory?')) return;
                    api.post('/staff-inventory/delete', { productName: detailItem.productName, specs: detailItem.specs }).then(() => {
                      toast.success('Deleted');
                      setDetailItem(null);
                      fetchStaffInventory();
                    });
                  }}
                  className="flex-1 py-4 border-2 border-red-100 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all"
                >
                  Delete Item
                </button>
                <button 
                  onClick={() => {
                    api.post('/staff-inventory/update', { productName: detailItem.productName, specs: detailItem.specs, qty: detailItem.qty, threshold: detailItem.threshold }).then(() => {
                      toast.success('Updated');
                      setDetailItem(null);
                      fetchStaffInventory();
                    });
                  }}
                  className="flex-[2] py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-dark hover:-translate-y-1 transition-all"
                >
                  Update Records
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        isDestructive={modalConfig.isDestructive}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig((prev: any) => ({ ...prev, isOpen: false }))}
      />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `}</style>
    </div>
  );
}
