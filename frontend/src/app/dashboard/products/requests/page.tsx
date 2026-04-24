'use client';

import { useEffect, useState } from 'react';
import { 
  Plus, Search, Box, MapPin, X, Info, User, ClipboardList, CheckCircle, Clock, AlertCircle, Trash2, History, Send, Eraser, Printer, ArrowDownToLine
} from 'lucide-react';
import api from '@/lib/api';

interface Request {
  id: string;
  requestNo: string;
  date: string;
  employeeName: string;
  employeeRole: string;
  departmentArea: string;
  shift: string;
  supervisor: string;
  locationId: string;
  productId: string;
  quantity: number;
  status: string;
  remarks: string | null;
  createdAt: string;
  location: { name: string };
  targetLocation?: { name: string } | null;
  product: { name: string; sku: string };
  previousIssuancesCount?: number;
}

interface DraftItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  remarks: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  stocks: {
    locationId: string;
    quantity: number;
  }[];
}

interface Location {
  id: string;
  name: string;
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'FULFILLED' | 'REJECTED' | 'ALL'>('PENDING');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Form state
  const [form, setForm] = useState({
    date: '',
    employeeName: '',
    employeeRole: '',
    departmentArea: '',
    shift: 'SHIFT 1',
    supervisor: '',
    locationId: '',
    targetLocationId: '', // Added for transfers
    productId: '',
    quantity: 1,
    remarks: ''
  });
  
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [reqsRes, prodsRes, locsRes] = await Promise.all([
        api.get('/internal-requests'),
        api.get('/products'),
        api.get('/locations')
      ]);
      setRequests(reqsRes.data);
      setProducts(prodsRes.data);
      setLocations(locsRes.data);
      if (locsRes.data.length > 0 && !form.locationId) {
        setForm(f => ({ ...f, locationId: locsRes.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!form.date) {
      setForm(prev => ({ ...prev, date: new Date().toLocaleDateString('en-CA') }));
    }
    fetchData();

    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.product-search-container')) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addRowToDraft = () => {
    if (!form.productId) return alert('Please select a product first');
    const product = products.find(p => p.id === form.productId);
    if (!product) return;

    const newDraft: DraftItem & { targetLocationId: string } = {
      id: Math.random().toString(36).substr(2, 9),
      productId: form.productId,
      productName: product.name,
      sku: product.sku,
      quantity: form.quantity,
      remarks: form.remarks,
      targetLocationId: form.targetLocationId
    };

    setDrafts([...drafts, newDraft] as any);
    // Clear item fields but keep employee info and location
    setForm({ ...form, productId: '', quantity: 1, remarks: '', targetLocationId: '' });
    setProductSearch('');
  };

  const removeDraft = (id: string) => {
    setDrafts(drafts.filter(d => d.id !== id));
  };

  const submitAllDrafts = async () => {
    if (drafts.length === 0) return alert('No items in draft');
    if (!form.employeeName || !form.locationId) return alert('Employee info and Location are required');

    setIsSubmitting(true);
    try {
      // Prepare bulk data
      const requestsData = drafts.map(draft => ({
        ...form,
        productId: draft.productId,
        quantity: draft.quantity,
        remarks: draft.remarks
      }));

      await api.post('/internal-requests/bulk', { requests: requestsData });
      
      setDrafts([]);
      alert('All requests submitted successfully!');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit some requests');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const remarks = prompt('Any remarks for this status update?');
    try {
      await api.patch(`/internal-requests/${id}/status`, { status, remarks });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleBulkUpdateStatus = async (status: string) => {
    if (selectedIds.length === 0) return alert('No requests selected');
    const remarks = prompt(`Enter remarks for bulk ${status.toLowerCase()} of ${selectedIds.length} items:`);
    try {
      await api.post('/internal-requests/bulk-status', { ids: selectedIds, status, remarks });
      setSelectedIds([]);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update requests');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this request? Stock will be reverted if previously issued.')) return;
    try {
      await api.delete(`/internal-requests/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete request');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} selected requests? Stock will be reverted for fulfilled items.`)) return;
    try {
      await api.post('/internal-requests/bulk-delete', { ids: selectedIds });
      setSelectedIds([]);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete requests');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRequests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRequests.map(r => r.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handlePrintIssuanceLog = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dataToPrint = selectedIds.length > 0 
      ? requests.filter(r => selectedIds.includes(r.id))
      : filteredRequests.filter(r => r.status === 'FULFILLED');

    if (dataToPrint.length === 0) return alert('No fulfilled requests to print');

    const html = `
      <html>
        <head>
          <title>Internal Issuance Log - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; font-size: 12px; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .header { text-align: center; margin-bottom: 30px; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; }
            .sign-box { border-top: 1px solid black; width: 200px; text-align: center; padding-top: 5px; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Internal Stock Issuance Log</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Shift</th>
                <th>Item Requested</th>
                <th>Quantity</th>
                <th>History</th>
              </tr>
            </thead>
            <tbody>
              ${dataToPrint.map(r => `
                <tr>
                  <td>${new Date(r.date).toLocaleDateString()}</td>
                  <td>${r.employeeName}</td>
                  <td>${r.departmentArea}</td>
                  <td>${r.shift}</td>
                  <td>${r.product.name}</td>
                  <td>${r.quantity}</td>
                  <td>${(r.previousIssuancesCount || 0) + 1 === 1 ? 'First Issuance' : `${(r.previousIssuancesCount || 0) + 1}th Issuance`}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <div class="sign-box">Prepared By</div>
            <div class="sign-box">Received By (Employee)</div>
            <div class="sign-box">Approved By (Supervisor)</div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const filteredRequests = requests.filter(r => {
    const matchesSearch = 
      r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.requestNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.product.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'ALL') return matchesSearch;
    return matchesSearch && r.status === activeTab;
  });

  const availableProducts = products.filter(p => 
    p.stocks.some(s => s.locationId === form.locationId && s.quantity > 0)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'APPROVED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'FULFILLED': return 'bg-green-100 text-green-800 border-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Requisition Workspace</h1>
          <p className="text-sm text-gray-500">Fast-entry mode for multiple stock requests</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Entry Form */}
        <div className="lg:col-span-4 space-y-6 sticky top-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-primary px-6 py-4">
              <h2 className="text-sm font-bold text-white flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                New Requisition Form
              </h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Employee Info Section (Sticky Fields) */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                  <User className="mr-2 h-3 w-3" />
                  Employee Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Request Date</label>
                    <input type="date" value={form.date || ''} onChange={e => setForm({...form, date: e.target.value})} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:ring-1 ring-primary outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Employee Name</label>
                    <input type="text" placeholder="Juan Dela Cruz" value={form.employeeName || ''} onChange={e => setForm({...form, employeeName: e.target.value})} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:ring-1 ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Shift</label>
                    <input type="text" placeholder="SHIFT 1" value={form.shift || ''} onChange={e => setForm({...form, shift: e.target.value.toUpperCase()})} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:ring-1 ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Dept/Area</label>
                    <input type="text" placeholder="Production" value={form.departmentArea || ''} onChange={e => setForm({...form, departmentArea: e.target.value})} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:ring-1 ring-primary outline-none" />
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-100" />

              {/* Product Entry Section */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                  <Box className="mr-2 h-3 w-3" />
                  Item Selection
                </h3>
                
                <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Storage Source</label>
                    <select value={form.locationId} onChange={e => setForm({...form, locationId: e.target.value})} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-white outline-none">
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Target (Optional: for Transfers)</label>
                    <select value={form.targetLocationId} onChange={e => setForm({...form, targetLocationId: e.target.value})} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-white outline-none">
                      <option value="">None (Direct Issuance)</option>
                      {locations.filter(l => l.id !== form.locationId).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Search Stock</label>
                    <div className="relative product-search-container">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Type stock name..."
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setShowProductDropdown(true);
                          setForm({ ...form, productId: '' });
                        }}
                        onFocus={() => setShowProductDropdown(true)}
                        className={`w-full rounded-md border pl-10 pr-3 py-2 text-sm outline-none bg-white transition-all ${
                          !form.productId && productSearch && availableProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 focus:border-primary'
                        }`}
                      />
                      {showProductDropdown && productSearch && (
                        <div className="absolute z-[60] left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-xl">
                          {availableProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                            <button key={p.id} type="button" onClick={() => { setForm({ ...form, productId: p.id }); setProductSearch(p.name); setShowProductDropdown(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-primary/5 transition-colors border-b border-gray-50 last:border-0">
                              <div className="font-bold text-gray-900">{p.name}</div>
                              <div className="text-[10px] text-gray-500 font-mono">
                                {p.sku} • {p.stocks.find(s => s.locationId === form.locationId)?.quantity} in stock
                              </div>
                              {p.description && <div className="text-[10px] text-gray-400 italic mt-0.5 line-clamp-1">{p.description}</div>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Quantity</label>
                      <input type="number" min="1" value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value) || 1})} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-white outline-none" />
                    </div>
                    <div className="flex-[2]">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Remarks</label>
                      <input type="text" placeholder="Optional" value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-white outline-none" />
                    </div>
                  </div>

                  <button 
                    onClick={addRowToDraft}
                    disabled={!form.productId}
                    className="w-full py-2 bg-gray-900 text-white rounded-md text-xs font-bold hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center"
                  >
                    <Plus className="mr-2 h-3 w-3" />
                    Add to Request List
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* DRAFT LIST */}
          {drafts.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-primary/20 shadow-lg overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-primary/5 px-6 py-3 border-b border-primary/10 flex items-center justify-between">
                <h2 className="text-xs font-bold text-primary flex items-center">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Items to Request ({drafts.length})
                </h2>
                <button onClick={() => setDrafts([])} className="text-[10px] font-bold text-gray-400 hover:text-red-500 flex items-center">
                  <Eraser className="mr-1 h-3 w-3" /> Clear List
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {drafts.map((draft, idx) => (
                  <div key={draft.id} className="p-4 border-b border-gray-50 flex items-center justify-between group">
                    <div>
                      <div className="text-xs font-bold text-gray-900">{draft.productName}</div>
                      <div className="text-[10px] text-gray-500 font-bold">{draft.quantity} UNITS • {draft.sku}</div>
                    </div>
                    <button onClick={() => removeDraft(draft.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-gray-50">
                <button 
                  onClick={submitAllDrafts}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <Clock className="animate-spin mr-2 h-4 w-4" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Submit All Requests
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Dashboard List */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex space-x-1 rounded-lg bg-gray-100 p-1 w-fit">
              {(['PENDING', 'APPROVED', 'FULFILLED', 'REJECTED', 'ALL'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSelectedIds([]); }}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                    activeTab === tab ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'FULFILLED' ? 'Issuance Log' : tab}
                </button>
              ))}
            </div>

            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Filter requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2 text-sm focus:ring-1 ring-primary outline-none"
              />
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 flex items-center justify-between animate-in slide-in-from-top-2">
              <span className="text-xs font-bold text-primary">{selectedIds.length} items selected</span>
              <div className="flex space-x-2">
                <button onClick={handlePrintIssuanceLog} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-[10px] font-black rounded-md uppercase flex items-center">
                  <Printer className="mr-1 h-3 w-3" /> Print Log
                </button>
                <button onClick={() => handleBulkUpdateStatus('APPROVED')} className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black rounded-md uppercase">Approve</button>
                <button onClick={() => handleBulkUpdateStatus('REJECTED')} className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-black rounded-md uppercase">Reject</button>
                {activeTab !== 'PENDING' && (
                  <button onClick={() => handleBulkUpdateStatus('PENDING')} className="px-3 py-1.5 bg-gray-600 text-white text-[10px] font-black rounded-md uppercase">Reset to Pending</button>
                )}
                {activeTab === 'APPROVED' && <button onClick={() => handleBulkUpdateStatus('FULFILLED')} className="px-3 py-1.5 bg-green-600 text-white text-[10px] font-black rounded-md uppercase">Fulfill</button>}
                <button onClick={handleBulkDelete} className="px-3 py-1.5 bg-gray-900 text-white text-[10px] font-black rounded-md uppercase flex items-center">
                  <Trash2 className="mr-1 h-3 w-3" /> Delete Selected
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 w-10 text-center">
                    <input type="checkbox" checked={selectedIds.length === filteredRequests.length && filteredRequests.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300 text-primary" />
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Request Info</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee / Dept</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock Item</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400 italic">Loading requests...</td></tr>
                ) : filteredRequests.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400 italic">No requests found.</td></tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr key={req.id} className={`hover:bg-gray-50 transition-colors group ${selectedIds.includes(req.id) ? 'bg-primary/5' : ''}`}>
                      <td className="px-6 py-4 text-center">
                        <input type="checkbox" checked={selectedIds.includes(req.id)} onChange={() => toggleSelectOne(req.id)} className="rounded border-gray-300 text-primary" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-gray-900">{req.requestNo}</div>
                        <div className="text-[10px] text-gray-500">{new Date(req.date).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-gray-900">{req.employeeName}</div>
                        <div className="text-[10px] text-gray-500 uppercase">
                          {req.departmentArea} • {req.shift}
                        </div>
                        {req.targetLocation && (
                          <div className="mt-1 flex items-center gap-1 text-[9px] font-black text-primary uppercase">
                            <ArrowDownToLine className="h-3 w-3" />
                            To: {req.targetLocation.name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-gray-900">{req.product.name}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 font-mono">{req.product.sku}</span>
                          <span className={`text-[9px] font-black px-1.5 rounded-full ${
                            (req.previousIssuancesCount || 0) === 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {(req.previousIssuancesCount || 0) + 1 === 1 ? '1st Issuance' : `${(req.previousIssuancesCount || 0) + 1}th Issuance`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs font-black text-primary">{req.quantity}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black border uppercase ${getStatusColor(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {req.status === 'PENDING' ? (
                            <>
                              <button onClick={() => handleUpdateStatus(req.id, 'APPROVED')} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Approve"><CheckCircle className="h-4 w-4" /></button>
                              <button onClick={() => handleUpdateStatus(req.id, 'REJECTED')} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Reject"><X className="h-4 w-4" /></button>
                            </>
                          ) : (
                            <button 
                              onClick={() => {
                                if(confirm('Undo this action and move back to Pending? Stock will be reverted if previously issued.')) {
                                  handleUpdateStatus(req.id, 'PENDING');
                                }
                              }} 
                              className="flex items-center text-[10px] font-black text-gray-400 hover:text-primary uppercase tracking-tighter"
                            >
                              <History className="mr-1 h-3 w-3" />
                              Undo / Reset
                            </button>
                          )}
                          {req.status === 'APPROVED' && (
                            <button onClick={() => handleUpdateStatus(req.id, 'FULFILLED')} className="text-[10px] font-black text-green-600 hover:underline">ISSUE</button>
                          )}
                          <button onClick={() => handleDelete(req.id)} className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
