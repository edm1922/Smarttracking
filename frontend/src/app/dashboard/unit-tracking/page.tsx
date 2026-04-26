'use client';

import { useEffect, useState } from 'react';
import { 
  Boxes, Package, Search, Filter, ArrowRight, 
  ChevronRight, ChevronDown, ChevronUp, History,
  TrendingDown, TrendingUp, AlertTriangle, Box,
  QrCode, Clock, User, ArrowUpRight, Check, X, Truck, Activity, FileText, Printer, LayoutGrid, Trash2
} from 'lucide-react';
import api from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { TableSkeleton, CardSkeleton, PageHeaderSkeleton } from '@/components/ui/LoadingSkeletons';


export default function UnitTrackingPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'summary' | 'requisition'>('inventory');
  const [requisitionSubTab, setRequisitionSubTab] = useState<'pending' | 'history'>('pending');

  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [isBuildingTransmittal, setIsBuildingTransmittal] = useState(false);
  const [groupBySpecs, setGroupBySpecs] = useState(false);
  const [transmittalHeader, setTransmittalHeader] = useState({
    transmittalNo: `TR-UNIT-${Date.now().toString().slice(-6)}`,
    date: new Date().toLocaleDateString('en-CA'),
    department: '',
    recipient: '',
    preparedBy: '',
    checkedBy: '',
    receivedBy: '',
    approvedBy: '',
    remarks: ''
  });
  
  const [logSearch, setLogSearch] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [viewingLog, setViewingLog] = useState<any>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [productFilters, setProductFilters] = useState<Record<string, Record<string, string>>>({});

  const [page, setPage] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);
  const pageSize = 20;
  const debouncedLogSearch = useDebounce(logSearch, 300);

  useEffect(() => {
    fetchInventory();
    
    // Set preparedBy on client-side
    const user = localStorage.getItem('username');
    if (user) {
      setTransmittalHeader(prev => ({ ...prev, preparedBy: user }));
    }
  }, []);

  const fetchRequests = async () => {
    try {
      const skip = (page - 1) * pageSize;
      const res = await api.get('/pull-out-requests', { params: { skip, take: pageSize, search: debouncedLogSearch } });
      setRequests(res.data.data);
      setTotalRequests(res.data.total);
    } catch (err) {
      console.error('Failed to fetch pull out requests', err);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, debouncedLogSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedLogSearch]);

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this pull-out? It will deduct stock immediately.')) return;
    setProcessingId(id);
    try {
      await api.patch(`/pull-out-requests/${id}/approve`);
      await Promise.all([fetchRequests(), fetchInventory()]);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Reject this pull-out request?')) return;
    setProcessingId(id);
    try {
      await api.patch(`/pull-out-requests/${id}/reject`);
      await fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm('Are you sure you want to delete this log entry? This will not revert stock.')) return;
    try {
      await api.delete(`/pull-out-requests/${id}`);
      await fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete log entry');
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await api.get('/items/unit-inventory');
      console.log('Unit Inventory Data:', res.data);
      setInventory(res.data);
    } catch (err) {
      console.error('Failed to fetch unit inventory', err);
    } finally {
      setLoading(false);
    }
  };

  const totalUnitsAvailable = inventory.reduce((acc, p) => acc + p.totalQty, 0);
  const lowStockItems = inventory.flatMap(p => 
    p.items.filter((item: any) => item.qty <= (item.threshold || 0))
  );

  const handleRefill = async (item: any) => {
    const newQtyStr = prompt(`Refill Cellophane ${item.slug}\nEnter new quantity:`, item.qty);
    if (newQtyStr === null) return;
    
    const qtyNum = parseInt(newQtyStr);
    if (isNaN(qtyNum)) {
      alert('Invalid quantity');
      return;
    }

    try {
      const fieldValues = item.fieldValues.map((fv: any) => {
        if (fv.value && typeof fv.value === 'object' && fv.value.useUnitQty) {
          return {
            fieldId: fv.fieldId,
            value: { ...fv.value, qty: qtyNum }
          };
        }
        return { fieldId: fv.fieldId, value: fv.value };
      });

      await api.patch(`/items/${item.slug}`, { fieldValues });
      fetchInventory();
    } catch (err) {
      alert('Failed to refill item');
    }
  };

  const toggleRequestSelection = (id: string) => {
    setSelectedRequestIds(prev => 
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };

  const handlePrintTransmittal = () => {
    window.print();
  };


  const filteredInventory = inventory.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleFilter = (productName: string, specKey: string, specValue: string) => {
    setProductFilters(prev => {
      const currentProductFilters = prev[productName] || {};
      const newFilters = { ...currentProductFilters };
      
      if (newFilters[specKey] === specValue) {
        delete newFilters[specKey]; // Deselect
      } else {
        newFilters[specKey] = specValue; // Select
      }
      
      return { ...prev, [productName]: newFilters };
    });
  };

  const getFilteredQty = (product: any) => {
    const filters = productFilters[product.name] || {};
    if (Object.keys(filters).length === 0) return product.totalQty;
    
    return product.items
      .filter((item: any) => {
        return Object.entries(filters).every(([fKey, fVal]) => {
          return item.fieldValues.some((fv: any) => {
            if (fv.name !== fKey) return false;
            const val = fv.value;
            if (val && typeof val === 'object' && val.useUnitQty) {
              return String(val.main || '') === fVal;
            }
            return String(val) === fVal;
          });
        });
      })
      .reduce((sum: number, item: any) => sum + item.qty, 0);
  };

  const getGroupedRequests = () => {
    let filtered = requests;

    // Filtering is handled server-side

    // Apply date range filter
    if (dateRange.start) {
      filtered = filtered.filter(r => new Date(r.createdAt) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => new Date(r.createdAt) <= end);
    }

    // Filter by sub-tab (Pending vs History)
    if (activeTab === 'requisition') {
      if (requisitionSubTab === 'pending') {
        filtered = filtered.filter(r => r.status === 'PENDING');
      } else {
        filtered = filtered.filter(r => r.status !== 'PENDING');
      }
    }

    if (!groupBySpecs) return filtered;

    const groups: Record<string, any> = {};
    
    filtered.forEach(req => {
      // Create a unique key based on name and all field values
      const specKey = `${req.item.name || 'Unnamed'}-${req.item.fieldValues?.map((fv: any) => fv.value).join('|')}`;
      
      if (!groups[specKey]) {
        groups[specKey] = {
          ...req,
          ids: [req.id],
          totalQty: req.qty,
          itemsCount: 1,
          slugs: [req.item.slug],
          isGrouped: true
        };
      } else {
        groups[specKey].ids.push(req.id);
        groups[specKey].totalQty += req.qty;
        groups[specKey].itemsCount += 1;
        if (!groups[specKey].slugs.includes(req.item.slug)) {
          groups[specKey].slugs.push(req.item.slug);
        }
      }
    });

    return Object.values(groups);
  };

  const displayRequests = getGroupedRequests();

  const totalStock = totalUnitsAvailable;
  const totalProducts = inventory.length;
  const totalQRs = inventory.reduce((acc, p) => acc + p.items.length, 0);

  if (loading) {
    return (
      <div className="space-y-10 animate-in fade-in duration-300">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden mt-8">
           <div className="px-8 py-6 border-b border-gray-100 flex gap-4">
             <div className="h-10 w-32 bg-gray-100 rounded-xl animate-pulse" />
             <div className="h-10 w-32 bg-gray-100 rounded-xl animate-pulse" />
           </div>
           <table className="w-full">
             <tbody>
               <TableSkeleton columns={6} rows={5} />
             </tbody>
           </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-4">Unit Tracking Hub</h1>
          <div className="flex items-center gap-2 mb-2">
             <button 
               onClick={() => setActiveTab('inventory')}
               className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-900 bg-gray-50'}`}
             >
               Detailed List
             </button>
             <button 
               onClick={() => setActiveTab('summary')}
               className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'summary' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-900 bg-gray-50'}`}
             >
               Summary Dashboard
             </button>
             <button 
               onClick={() => setActiveTab('requisition')}
               className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'requisition' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-900 bg-gray-50'}`}
             >
               Unit Requisition (QR)
             </button>
          </div>
          
          {activeTab === 'requisition' && (
            <div className="flex items-center gap-4 mt-4 animate-in fade-in slide-in-from-left-4 duration-300">
               <button 
                 onClick={() => setRequisitionSubTab('pending')}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${requisitionSubTab === 'pending' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
               >
                 <Clock className="h-3 w-3" /> Pending ({requests.filter(r => r.status === 'PENDING').length})
               </button>
               <button 
                 onClick={() => setRequisitionSubTab('history')}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${requisitionSubTab === 'history' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
               >
                 <History className="h-3 w-3" /> Release History
               </button>
            </div>
          )}
          <p className="text-gray-500 font-medium">Live sub-inventory of all QR-tracked units and stock levels.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end px-6 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Total Units</span>
            <span className="text-2xl font-black text-gray-900 leading-none">{totalStock.toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-end px-6 py-3 bg-gray-900 rounded-2xl shadow-xl shadow-gray-900/10">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Active QRs</span>
            <span className="text-2xl font-black text-white leading-none">{totalQRs.toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      {/* Pending Approvals Section */}
      {requests.filter(r => r.status === 'PENDING').length > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-[2.5rem] p-8 space-y-6 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-orange-600/10 rounded-2xl flex items-center justify-center">
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Pending Approvals</h2>
                <p className="text-xs font-bold text-orange-600/60 uppercase tracking-widest">New pull-out requests waiting for review</p>
              </div>
            </div>
            <span className="px-4 py-1.5 bg-orange-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest animate-pulse">
              {requests.filter(r => r.status === 'PENDING').length} Action Required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.filter(r => r.status === 'PENDING').map((req) => (
              <div 
                key={req.id} 
                onDoubleClick={() => setViewingLog(req)}
                className={`relative bg-white p-6 rounded-3xl border border-orange-100 shadow-sm hover:shadow-md transition-all group cursor-pointer select-none overflow-hidden ${processingId === req.id ? 'opacity-70 pointer-events-none' : ''}`}
                title="Double-click to view details & evidence"
              >
                {processingId === req.id && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Processing...</span>
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                      <Truck className="h-5 w-5 text-gray-400 group-hover:text-orange-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Asset ID</p>
                      <p className="text-sm font-mono font-bold text-gray-900">{req.item.slug}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-0.5">Qty to Release</p>
                    <p className="text-xl font-black text-gray-900 tracking-tighter">
                      {req.qty} <span className="text-[10px] text-gray-400 uppercase">{req.unit}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex flex-col">
                    <p className="text-[9px] font-black text-gray-400 uppercase">Requested By</p>
                    <p className="text-xs font-bold text-gray-700">{req.user.username}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleReject(req.id)}
                      className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"
                      title="Reject Request"
                    >
                      <X className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => handleApprove(req.id)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-orange-600 transition-all shadow-lg active:scale-95"
                    >
                      <Check className="h-4 w-4" /> Approve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           {/* Stats Grid */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl flex items-center gap-6">
                 <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                    <Boxes className="h-8 w-8" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Available Units</p>
                    <p className="text-3xl font-black text-gray-900 tracking-tighter">{totalUnitsAvailable.toLocaleString()}</p>
                 </div>
              </div>

              <div className={`bg-white p-8 rounded-[2.5rem] border shadow-xl flex items-center gap-6 transition-colors ${lowStockItems.length > 0 ? 'border-red-100 bg-red-50/10' : 'border-gray-100'}`}>
                 <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${lowStockItems.length > 0 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-green-50 text-green-600'}`}>
                    <AlertTriangle className="h-8 w-8" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Critical Refills Needed</p>
                    <p className={`text-3xl font-black tracking-tighter ${lowStockItems.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>{lowStockItems.length}</p>
                 </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl flex items-center gap-6">
                 <div className="h-16 w-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                    <LayoutGrid className="h-8 w-8" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tracked Product Types</p>
                    <p className="text-3xl font-black text-gray-900 tracking-tighter">{inventory.length}</p>
                 </div>
              </div>
           </div>

           {/* Quick Refill Queue */}
           <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
              <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-200">
                       <Truck className="h-6 w-6" />
                    </div>
                    <div>
                       <h2 className="text-xl font-black text-gray-900 tracking-tight">Priority Refill Queue</h2>
                       <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cellophanes that have dropped below your custom threshold</p>
                    </div>
                 </div>
              </div>
              
              <div className="p-8">
                 {lowStockItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {lowStockItems.map((item: any) => (
                          <div key={item.slug} className="p-6 rounded-3xl border border-red-100 bg-red-50/30 flex items-center justify-between group hover:bg-red-50 transition-all">
                             <div>
                                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">QR ID: {item.slug}</p>
                                <p className="text-lg font-black text-gray-900 tracking-tight">{item.qty} Remaining</p>
                                <p className="text-[10px] font-bold text-red-600">Threshold: {item.threshold}</p>
                             </div>
                             <button 
                                onClick={() => handleRefill(item)}
                                className="p-4 bg-red-600 text-white rounded-2xl shadow-lg shadow-red-200 hover:scale-105 active:scale-95 transition-all"
                             >
                                <Activity className="h-5 w-5" />
                             </button>
                          </div>
                       ))}
                    </div>
                 ) : (
                    <div className="py-12 text-center">
                       <Check className="h-12 w-12 text-green-500 mx-auto mb-4 bg-green-50 p-3 rounded-full" />
                       <p className="text-sm font-bold text-gray-400">All cellophanes are currently above their thresholds.</p>
                    </div>
                 ) }
              </div>
           </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Control Bar */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search items by product name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 py-5 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium text-gray-900"
              />
            </div>
            <button className="p-5 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm hover:bg-gray-50 transition-all">
              <Filter className="h-6 w-6 text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredInventory.map((product, idx) => (
          <div 
            key={product.name}
            className="group relative bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden transition-all hover:shadow-2xl hover:shadow-primary/5"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            
            <div className="p-8">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <Box className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">{product.name}</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{product.unit}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className="block text-[10px] font-black text-primary uppercase tracking-widest mb-1">
                    {Object.keys(productFilters[product.name] || {}).length > 0 ? 'Filtered Stock' : 'Live Stock'}
                  </span>
                  <span className={`text-3xl font-black tracking-tighter leading-none transition-all ${Object.keys(productFilters[product.name] || {}).length > 0 ? 'text-blue-600' : 'text-gray-900'}`}>
                    {getFilteredQty(product)}
                  </span>
                  {Object.keys(productFilters[product.name] || {}).length > 0 && (
                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">of {product.totalQty} total</p>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-gray-50 rounded-full overflow-hidden mb-8 border border-gray-100/50">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-1000 ease-out" 
                  style={{ width: `${Math.min(100, (product.totalQty / 100) * 100)}%` }}
                />
              </div>

              {/* Quick Summary */}
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                <div className="flex items-center gap-2">
                  <QrCode className="h-3 w-3" />
                  <span>{product.items.length} Linked QR Codes</span>
                </div>
                <button 
                  onClick={() => setExpandedProduct(expandedProduct === product.name ? null : product.name)}
                  className="flex items-center gap-1 text-primary hover:underline transition-all"
                >
                  View Details {expandedProduct === product.name ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>

              {/* Expanded content */}
              {expandedProduct === product.name && (
                <div className="mt-8 pt-8 border-t border-gray-100 animate-in slide-in-from-top-4 duration-300">
                  {/* Group Specs Summary */}
                  {product.specs && (
                    <div className="mb-8 grid grid-cols-2 gap-y-6 gap-x-4 border-b border-orange-100/30 pb-8">
                      {Object.entries(product.specs).map(([key, values]: [string, any]) => (
                        <div key={key} className="animate-in fade-in slide-in-from-left-2 duration-500">
                          <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{key}</span>
                          <div className="flex flex-wrap gap-1">
                            {values.map((val: string, i: number) => {
                              const isActive = (productFilters[product.name]?.[key] === val);
                              return (
                                <button 
                                  key={i} 
                                  onClick={() => toggleFilter(product.name, key, val)}
                                  className={`text-sm font-black px-3 py-1 rounded-lg transition-all ${
                                    isActive 
                                      ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105' 
                                      : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
                                  }`}
                                >
                                  {val}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-4">QR Reference Breakdown</p>
                  <div className="grid grid-cols-1 gap-2">
                    {product.items.map((item: any) => {
                      const isLowStock = item.qty <= (item.threshold || 0);
                      return (
                        <div 
                          key={item.slug}
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all group/row ${
                            isLowStock 
                              ? 'bg-red-50 border-red-200 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                              : 'bg-gray-50/50 border-gray-100/50 hover:bg-white hover:border-primary/20'
                          } ${
                            Object.entries(productFilters[product.name] || {}).every(([fKey, fVal]) => 
                              item.fieldValues.some((fv: any) => {
                                if (fv.name !== fKey) return false;
                                const val = fv.value;
                                if (val && typeof val === 'object' && val.useUnitQty) return String(val.main || '') === fVal;
                                return String(val) === fVal;
                              })
                            ) ? 'opacity-100' : 'opacity-40 grayscale-[0.5]'
                          }`}
                        >
                          <div className="flex-1 cursor-pointer" onClick={() => window.open(`/i/${item.slug}`, '_blank')}>
                            <div className="flex items-center gap-3 mb-1.5">
                              <div className={`w-2 h-2 rounded-full ${isLowStock ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`} />
                              <span className="text-sm font-mono font-bold text-gray-700">{item.slug}</span>
                              {item.batch && <span className="px-2 py-0.5 bg-gray-200 text-[9px] font-black rounded-md">{item.batch}</span>}
                              {isLowStock && (
                                <span className="px-2 py-0.5 bg-red-600 text-white text-[8px] font-black rounded-md uppercase tracking-tighter">Needs Refill</span>
                              )}
                            </div>
                          
                          {/* Form Content / Specs Breakdown */}
                          <div className="flex flex-wrap gap-2 ml-5">
                            {item.fieldValues?.map((fv: any, idx: number) => {
                              const v = fv.value as any;
                              let displayValue = '';
                              
                              if (v && typeof v === 'object' && v.useUnitQty) {
                                displayValue = v.main || `${v.qty ?? 0} ${v.unit ?? ''}`;
                              } else {
                                displayValue = typeof fv.value === 'object' ? JSON.stringify(fv.value) : String(fv.value);
                              }

                              if (!displayValue || displayValue.trim() === '') return null;

                              return (
                                <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-100 rounded-lg shadow-sm">
                                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100 pr-1.5">{fv.name}</span>
                                  <span className="text-[10px] font-bold text-gray-800">{displayValue}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="text-right mr-2">
                             <span className={`text-sm font-black ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>{item.qty} <span className="text-[10px] text-gray-400 uppercase">{product.unit}</span></span>
                             {isLowStock && <p className="text-[8px] font-bold text-red-400 uppercase tracking-tighter">Limit: {item.threshold}</p>}
                           </div>
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               handleRefill(item);
                             }}
                             className={`p-2 rounded-xl transition-all ${
                               isLowStock 
                                 ? 'bg-red-600 text-white shadow-lg shadow-red-200' 
                                 : 'bg-white border border-gray-100 text-gray-400 hover:text-primary hover:border-primary/20'
                             }`}
                             title="Refill Stock"
                           >
                             <Activity className="h-4 w-4" />
                           </button>
                           <ArrowUpRight 
                             className="h-4 w-4 text-gray-300 group-hover/row:text-primary transition-colors cursor-pointer" 
                             onClick={() => window.open(`/i/${item.slug}`, '_blank')}
                           />
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

          {filteredInventory.length === 0 && (
            <div className="col-span-2 py-20 text-center">
              <Boxes className="h-16 w-16 text-gray-200 mx-auto mb-4" />
              <p className="text-xl font-bold text-gray-400 tracking-tight">No unit-tracked products found.</p>
              <p className="text-sm text-gray-400 mt-1">Try a different search term or check your custom fields.</p>
            </div>
          )}
        </div>
      </div>
    )}

      {activeTab === 'requisition' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gray-50/30">
             <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <History className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Pull Out Request Log</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Historical record of all unit release actions</p>
                </div>
             </div>
             
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search log..."
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/5 transition-all w-48"
                />
              </div>

              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-100">
                <input 
                  type="date" 
                  value={dateRange.start}
                  onChange={e => setDateRange({...dateRange, start: e.target.value})}
                  className="bg-transparent border-none text-[10px] font-black uppercase outline-none px-2 py-1"
                />
                <span className="text-gray-300">/</span>
                <input 
                  type="date" 
                  value={dateRange.end}
                  onChange={e => setDateRange({...dateRange, end: e.target.value})}
                  className="bg-transparent border-none text-[10px] font-black uppercase outline-none px-2 py-1"
                />
              </div>

              <button 
                onClick={() => setGroupBySpecs(!groupBySpecs)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${groupBySpecs ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-100'}`}
              >
                <LayoutGrid className="h-4 w-4" /> {groupBySpecs ? 'Grouped' : 'Individual'}
              </button>

              {selectedRequestIds.length > 0 && (
                <button 
                  onClick={() => setIsBuildingTransmittal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 animate-in zoom-in-95"
                >
                  <FileText className="h-4 w-4" /> Build Transmittal ({selectedRequestIds.length})
                </button>
              )}
            </div>
          </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-5 w-12">
                   <input 
                    type="checkbox" 
                    onChange={(e) => {
                        if (e.target.checked) setSelectedRequestIds(requests.map(r => r.id));
                        else setSelectedRequestIds([]);
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                   />
                </th>
                <th className="px-4 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{groupBySpecs ? 'Assets' : 'Asset ID'}</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Requester</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayRequests.map((req) => (
                <tr 
                  key={req.id} 
                  onDoubleClick={() => setViewingLog(req)}
                  className={`hover:bg-gray-50/50 transition-colors group cursor-pointer select-none ${selectedRequestIds.includes(req.id) ? 'bg-primary/5' : ''}`}
                  title="Double-click to view details"
                >
                  <td className="px-8 py-5">
                    <input 
                      type="checkbox" 
                      checked={selectedRequestIds.includes(req.id)}
                      onChange={() => toggleRequestSelection(req.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-5">
                    <p className="text-sm font-bold text-gray-700">{new Date(req.createdAt).toLocaleDateString()}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </td>
                  <td className="px-8 py-5">
                    {req.isGrouped ? (
                      <div className="space-y-1">
                        <p className="text-sm font-black text-gray-900">{req.item.name || 'Multiple Assets'}</p>
                        <p className="text-[10px] text-primary font-bold">{req.itemsCount} QRs • {req.slugs.slice(0,2).join(', ')}{req.slugs.length > 2 ? '...' : ''}</p>
                      </div>
                    ) : (
                      <span className="text-sm font-mono font-bold text-primary bg-primary/5 px-2 py-1 rounded-md">{req.item.slug}</span>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-gray-900">{req.user.username}</p>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <p className="text-sm font-black text-gray-900">{req.isGrouped ? req.totalQty : req.qty} <span className="text-[10px] text-gray-400 uppercase">{req.unit}</span></p>
                    {req.isGrouped && <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Aggregated</p>}
                  </td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                      req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {req.status === 'PENDING' && (
                        <>
                          <button 
                            disabled={processingId === req.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(req.id);
                            }}
                            className="p-2 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-xl transition-all disabled:opacity-50"
                            title="Approve Pull-Out"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button 
                            disabled={processingId === req.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReject(req.id);
                            }}
                            className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all disabled:opacity-50"
                            title="Reject Request"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLog(req.id);
                        }}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Delete Log Entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <History className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-sm font-bold text-gray-400">No requests recorded yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )}

      {/* Transmittal Builder Overlay */}
      {isBuildingTransmittal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Transmittal Builder</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Configure transmittal details for {selectedRequestIds.length} items</p>
                </div>
              </div>
              <button 
                onClick={() => setIsBuildingTransmittal(false)}
                className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-10">
              {/* Header Config */}
              <div className="md:col-span-1 space-y-6">
                <h3 className="text-[10px] font-black text-primary uppercase tracking-widest">Transmittal Header</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Transmittal No</label>
                    <input 
                        type="text" 
                        value={transmittalHeader.transmittalNo}
                        onChange={e => setTransmittalHeader({...transmittalHeader, transmittalNo: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Date</label>
                    <input 
                        type="date" 
                        value={transmittalHeader.date}
                        onChange={e => setTransmittalHeader({...transmittalHeader, date: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Department</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Operations - Logistics"
                        value={transmittalHeader.department}
                        onChange={e => setTransmittalHeader({...transmittalHeader, department: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Recipient / End-User</label>
                    <input 
                        type="text" 
                        placeholder="Name of recipient"
                        value={transmittalHeader.recipient}
                        onChange={e => setTransmittalHeader({...transmittalHeader, recipient: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-50 space-y-4">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-widest">Signatories</h3>
                  {['preparedBy', 'checkedBy', 'receivedBy', 'approvedBy'].map(field => (
                    <div key={field}>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{field.endsWith('By') ? field.slice(0, -2) + ' By' : field}</label>
                        <input 
                            type="text" 
                            placeholder={field === 'checkedBy' ? 'Optional' : 'Name'}
                            value={(transmittalHeader as any)[field]}
                            onChange={e => setTransmittalHeader({...transmittalHeader, [field]: e.target.value})}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                        />
                    </div>
                  ))}

                  <div className="pt-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Remarks</label>
                    <textarea 
                        placeholder="Additional notes..."
                        value={transmittalHeader.remarks}
                        onChange={e => setTransmittalHeader({...transmittalHeader, remarks: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none h-20 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Items Preview */}
              <div className="md:col-span-2 space-y-6">
                <h3 className="text-[10px] font-black text-primary uppercase tracking-widest">Selected Items Breakdown</h3>
                <div className="border border-gray-100 rounded-3xl overflow-hidden bg-gray-50/30">
                  <table className="w-full text-left">
                    <thead className="bg-white border-b border-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">No.</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Asset ID</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Qty</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {requests.filter(r => selectedRequestIds.includes(r.id)).map((req, idx) => (
                        <tr key={req.id}>
                          <td className="px-6 py-4 text-xs font-bold text-gray-400">{idx + 1}</td>
                          <td className="px-6 py-4 text-xs font-mono font-bold text-gray-900">{req.item.slug}</td>
                          <td className="px-6 py-4 text-xs font-black text-gray-900">{req.qty} {req.unit}</td>
                          <td className="px-6 py-4">
                            <span className="text-[9px] font-black uppercase text-gray-400">{req.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="pt-6 flex justify-end gap-3">
                    <button 
                        onClick={() => setSelectedRequestIds([])}
                        className="px-6 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all"
                    >
                        Clear Selection
                    </button>
                    <button 
                        onClick={handlePrintTransmittal}
                        className="px-8 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-gray-900/10 hover:bg-primary transition-all flex items-center gap-2"
                    >
                        <Printer className="h-4 w-4" /> Print Transmittal
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print View (Visible only during print) */}
      <div className="hidden print:block bg-white p-12 text-gray-900 h-screen">
        <div className="flex justify-between items-start border-b-4 border-gray-900 pb-8 mb-12">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 mb-1">Material Transmittal</h1>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Unit Tracking & Release Authorization</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black text-gray-400 uppercase mb-1">Transmittal No.</div>
            <div className="text-2xl font-black font-mono">{transmittalHeader.transmittalNo}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-12">
          <div className="space-y-4">
            <div><div className="text-[10px] font-black text-gray-400 uppercase mb-1">Department:</div><div className="text-lg font-bold border-b-2 border-gray-100 pb-1">{transmittalHeader.department || '____________________'}</div></div>
            <div><div className="text-[10px] font-black text-gray-400 uppercase mb-1">Recipient - End-User:</div><div className="text-lg font-bold border-b-2 border-gray-100 pb-1">{transmittalHeader.recipient || '____________________'}</div></div>
          </div>
          <div className="space-y-4">
            <div><div className="text-[10px] font-black text-gray-400 uppercase mb-1">Date:</div><div className="text-lg font-bold border-b-2 border-gray-100 pb-1">{new Date(transmittalHeader.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</div></div>
            <div><div className="text-[10px] font-black text-gray-400 uppercase mb-1">Prepared By:</div><div className="text-lg font-bold border-b-2 border-gray-100 pb-1">{transmittalHeader.preparedBy}</div></div>
          </div>
        </div>

        <table className="w-full border-collapse mb-12">
          <thead>
            <tr className="border-y-4 border-gray-900 bg-gray-50">
              <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest w-12">No.</th>
              <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest">Asset ID / Description</th>
              <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest w-32">Quantity</th>
              <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-gray-100">
            {requests.filter(r => selectedRequestIds.includes(r.id)).map((req, idx) => (
              <tr key={req.id}>
                <td className="py-4 px-4 text-xs font-bold text-gray-400">{idx + 1}</td>
                <td className="py-4 px-4 text-xs font-bold uppercase">{req.item.slug}</td>
                <td className="py-4 px-4 text-xs font-black">{req.qty} {req.unit}</td>
                <td className="py-4 px-4 text-xs italic text-gray-400">Authorized Release</td>
              </tr>
            ))}
          </tbody>
        </table>

        {transmittalHeader.remarks && (
          <div className="mb-12">
            <div className="text-[10px] font-black text-gray-400 uppercase mb-1">Remarks:</div>
            <div className="text-sm font-medium text-gray-700 whitespace-pre-wrap border-l-4 border-gray-100 pl-4 py-1">
              {transmittalHeader.remarks}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 pt-12 border-t-2 border-gray-50">
          {['preparedBy', 'checkedBy', 'receivedBy', 'approvedBy'].map(field => (
            <div key={field} className="space-y-8">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{field.endsWith('By') ? field.slice(0, -2) + ' By' : field}:</div>
              <div className="border-b-2 border-gray-900 text-center pb-2">
                <span className="text-sm font-black uppercase">{(transmittalHeader as any)[field] || '____________________'}</span>
              </div>
              <div className="text-center text-[8px] font-bold text-gray-400 uppercase italic tracking-tighter">Signature - Date</div>
            </div>
          ))}
        </div>

        <div className="mt-20 pt-12 border-t border-dashed border-gray-200">
            <p className="text-[9px] font-medium text-gray-400 text-center uppercase tracking-widest italic">
                This material transmittal is generated automatically by the Smart Tracking System.
            </p>
        </div>
      </div>

      {/* Log Detail Modal */}
      {viewingLog && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-gray-900/20">
                  <History className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Request Details</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Historical Entry Reference</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingLog(null)}
                className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Date & Time</p>
                  <p className="text-sm font-bold text-gray-900">{new Date(viewingLog.createdAt).toLocaleDateString()}</p>
                  <p className="text-[10px] text-gray-400 font-medium">{new Date(viewingLog.createdAt).toLocaleTimeString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    viewingLog.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                    viewingLog.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {viewingLog.status}
                  </span>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-50">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Asset Information</p>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black text-gray-400 uppercase">Asset ID:</span>
                    <span className="text-sm font-mono font-bold text-primary">{viewingLog.item.slug}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black text-gray-400 uppercase">Product:</span>
                    <span className="text-sm font-bold text-gray-900 text-right">{viewingLog.item.name || 'Unnamed Asset'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black text-gray-400 uppercase">Release Qty:</span>
                    <span className="text-sm font-black text-gray-900">{viewingLog.qty} {viewingLog.unit}</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-50">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Involved Parties</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase">Requester</p>
                      <p className="text-sm font-bold text-gray-900">{viewingLog.user.username}</p>
                    </div>
                  </div>
                </div>
              </div>

              {viewingLog.remarks && (
                <div className="pt-6 border-t border-gray-50">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">System Remarks</p>
                  <p className="text-sm text-gray-600 bg-orange-50/50 p-4 rounded-2xl italic font-medium">
                    "{viewingLog.remarks}"
                  </p>
                </div>
              )}

              {viewingLog.attachmentUrl && (
                <div className="pt-6 border-t border-gray-50">
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">Signed Approval Form</p>
                  <div className="rounded-3xl overflow-hidden border-2 border-orange-100 shadow-sm bg-orange-50/20">
                    <img 
                      src={viewingLog.attachmentUrl} 
                      alt="Signed Form" 
                      className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500 cursor-zoom-in"
                      onClick={() => window.open(viewingLog.attachmentUrl, '_blank')}
                    />
                  </div>
                  <p className="mt-2 text-[10px] text-gray-400 font-bold italic text-center uppercase tracking-tighter">Click image to enlarge verification document</p>
                </div>
              )}

              {(viewingLog.imageUrl || (viewingLog.additionalImages && viewingLog.additionalImages.length > 0)) && (
                <div className="pt-6 border-t border-gray-50">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Evidence & Reference Photos</p>
                  <div className="grid grid-cols-2 gap-3">
                    {viewingLog.imageUrl && (
                      <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm aspect-square bg-gray-50">
                        <img 
                          src={viewingLog.imageUrl} 
                          alt="Evidence" 
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-500 cursor-zoom-in"
                          onClick={() => window.open(viewingLog.imageUrl, '_blank')}
                        />
                      </div>
                    )}
                    {viewingLog.additionalImages?.map((img: string, i: number) => (
                      <div key={i} className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm aspect-square bg-gray-50">
                        <img 
                          src={img} 
                          alt={`Reference ${i + 1}`} 
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-500 cursor-zoom-in"
                          onClick={() => window.open(img, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-6">
                <button 
                  onClick={() => window.open(`/i/${viewingLog.item.slug}`, '_blank')}
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-gray-900/10 hover:bg-primary transition-all active:scale-95"
                >
                  View Digital Twin Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



    </div>
  );
}
