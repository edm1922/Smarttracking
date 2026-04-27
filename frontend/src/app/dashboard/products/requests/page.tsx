'use client';

import { useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  Plus, Search, Box, MapPin, X, Info, User, ClipboardList, CheckCircle, Clock, AlertCircle, Trash2, History, Send, Eraser, Printer, ArrowDownToLine, Loader2, FileText, ImageIcon, XCircle
} from 'lucide-react';
import api from '@/lib/api';
import { TableSkeleton, Spinner } from '@/components/ui/LoadingSkeletons';

function getOrdinal(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

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
  attachmentUrl?: string | null;
  additionalImages?: string[] | null;
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
  targetLocationId?: string;
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
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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


  const [page, setPage] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);
  const pageSize = 20;
  const debouncedSearch = useDebounce(searchTerm, 300);

  const fetchInitialData = async () => {
    try {
      const [prodsRes, locsRes] = await Promise.all([
        api.get('/products', { params: { take: 1000 } }),
        api.get('/locations')
      ]);
      setProducts(prodsRes.data.data);
      setLocations(locsRes.data);
    } catch (err) {
      console.error('Failed to fetch initial data', err);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * pageSize;
      const res = await api.get('/internal-requests', {
        params: { skip, take: pageSize, search: debouncedSearch, status: activeTab }
      });
      setRequests(res.data.data);
      setTotalRequests(res.data.total);
    } catch (err) {
      console.error('Failed to fetch requests', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    await fetchRequests();
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchRequests();
    setSelectedIds([]);
  }, [page, debouncedSearch, activeTab]);

  const addRowToDraft = () => {
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
    if (drafts.length === 0) return;
    
    setIsSubmitting(true);
    try {
      // Group by draft to match backend expectations or send one by one
      // The backend has a bulk creation endpoint? No, let's check.
      // If no bulk endpoint, we can use Promise.all
      await Promise.all(drafts.map(draft => 
        api.post('/internal-requests', {
          ...form,
          employeeName: form.employeeName || 'Admin User',
          departmentArea: form.departmentArea || 'Admin Area',
          shift: form.shift || 'N/A',
          supervisor: form.supervisor || 'Admin',
          employeeRole: form.employeeRole || 'Admin',
          productId: draft.productId,
          quantity: draft.quantity,
          remarks: draft.remarks,
          targetLocationId: draft.targetLocationId
        })
      ));
      
      setDrafts([]);
      await fetchData();
      alert(`Successfully submitted ${drafts.length} requests`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit some requests');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeTab]);


  const handleUpdateStatus = async (id: string, status: string) => {
    const remarks = prompt('Any remarks for this status update?');
    setActionLoading(id);
    try {
      await api.patch(`/internal-requests/${id}/status`, { status, remarks });
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkUpdateStatus = async (status: string) => {
    if (selectedIds.length === 0) return alert('No requests selected');
    const remarks = prompt(`Enter remarks for bulk ${status.toLowerCase()} of ${selectedIds.length} items:`);
    setActionLoading('bulk');
    try {
      await api.post('/internal-requests/bulk-status', { ids: selectedIds, status, remarks });
      setSelectedIds([]);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update requests');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this request? Stock will be reverted if previously issued.')) return;
    setActionLoading(id);
    try {
      await api.delete(`/internal-requests/${id}`);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} selected requests? Stock will be reverted for fulfilled items.`)) return;
    setActionLoading('bulk');
    try {
      await api.post('/internal-requests/bulk-delete', { ids: selectedIds });
      setSelectedIds([]);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete requests');
    } finally {
      setActionLoading(null);
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
                  <td>${(r.previousIssuancesCount || 0) + 1 === 1 ? 'First Issuance' : `${getOrdinal((r.previousIssuancesCount || 0) + 1)} Issuance`}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <div class="sign-box">Prepared By</div>
            <div class="sign-box">Approved By (Supervisor)</div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const filteredRequests = requests;



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
        {/* RIGHT COLUMN: Dashboard List */}
        <div className="lg:col-span-12 space-y-6">
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
                {(activeTab === 'PENDING' || activeTab === 'ALL' || activeTab === 'REJECTED') && (
                  <button onClick={() => handleBulkUpdateStatus('APPROVED')} className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black rounded-md uppercase">Approve</button>
                )}
                {(activeTab === 'PENDING' || activeTab === 'ALL' || activeTab === 'APPROVED') && (
                  <button onClick={() => handleBulkUpdateStatus('REJECTED')} className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-black rounded-md uppercase">Reject</button>
                )}
                {activeTab !== 'PENDING' && (
                  <button onClick={() => handleBulkUpdateStatus('PENDING')} className="px-3 py-1.5 bg-gray-600 text-white text-[10px] font-black rounded-md uppercase">Reset to Pending</button>
                )}
                {(activeTab === 'APPROVED' || activeTab === 'ALL') && (
                  <button onClick={() => handleBulkUpdateStatus('FULFILLED')} className="px-3 py-1.5 bg-green-600 text-white text-[10px] font-black rounded-md uppercase">Fulfill</button>
                )}
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
                  <TableSkeleton columns={7} rows={6} />
                ) : filteredRequests.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400 italic">No requests found.</td></tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr key={req.id} onDoubleClick={() => setSelectedRequest(req)} className={`hover:bg-gray-50 transition-colors group cursor-pointer ${selectedIds.includes(req.id) ? 'bg-primary/5' : ''}`}>
                      <td className="px-6 py-4 text-center">
                        <input type="checkbox" checked={selectedIds.includes(req.id)} onChange={() => toggleSelectOne(req.id)} className="rounded border-gray-300 text-primary" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-gray-900 flex items-center gap-2">
                          {req.requestNo}
                          {req.attachmentUrl && (
                            <a href={req.attachmentUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 p-0.5 rounded-sm bg-blue-50 hover:bg-blue-100 transition-colors" title="View Signed Document">
                              <ClipboardList className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
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
                            {(req.previousIssuancesCount || 0) + 1 === 1 ? '1st Issuance' : `${getOrdinal((req.previousIssuancesCount || 0) + 1)} Issuance`}
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
                        {req.remarks && (
                          <div className="text-[9px] text-gray-500 mt-1 italic max-w-[150px] leading-tight" title={req.remarks}>
                            "{req.remarks}"
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {actionLoading === req.id ? (
                            <div className="p-1"><Spinner className="h-4 w-4" /></div>
                          ) : (
                            <>
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
                            </>
                          )}
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
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h2 className="text-lg font-black text-gray-900 tracking-tight">Request Details</h2>
                <p className="text-xs text-gray-500 mt-1 uppercase font-bold tracking-widest">{selectedRequest.requestNo}</p>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100">
              <div className="p-6 space-y-6 flex-1 bg-white">
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Employee Information</h3>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs font-bold text-gray-500">Name</span>
                      <span className="text-xs font-black text-gray-900">{selectedRequest.employeeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs font-bold text-gray-500">Department</span>
                      <span className="text-xs font-black text-gray-900">{selectedRequest.departmentArea}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs font-bold text-gray-500">Shift</span>
                      <span className="text-xs font-black text-gray-900">{selectedRequest.shift}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Item Details</h3>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs font-bold text-gray-500">Item Name</span>
                      <span className="text-xs font-black text-gray-900">{selectedRequest.product.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs font-bold text-gray-500">Tracking No.</span>
                      <span className="text-xs font-black text-gray-900 font-mono">{selectedRequest.product.sku}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                      <span className="text-xs font-black text-gray-500 uppercase">Quantity Requested</span>
                      <span className="text-lg font-black text-primary">{selectedRequest.quantity}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Current Status</h3>
                  <div className={`p-4 rounded-xl border flex items-center gap-3 ${getStatusColor(selectedRequest.status)}`}>
                    {selectedRequest.status === 'PENDING' && <Clock className="h-5 w-5" />}
                    {selectedRequest.status === 'APPROVED' && <CheckCircle className="h-5 w-5" />}
                    {selectedRequest.status === 'REJECTED' && <XCircle className="h-5 w-5" />}
                    {selectedRequest.status === 'FULFILLED' && <CheckCircle className="h-5 w-5" />}
                    <span className="font-black text-xs uppercase tracking-widest">{selectedRequest.status}</span>
                  </div>
                </div>

                {selectedRequest.remarks && (
                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Remarks / Reason</h3>
                    <p className="text-xs text-gray-700 bg-yellow-50 p-3 rounded-lg border border-yellow-100 leading-relaxed italic">{selectedRequest.remarks}</p>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col bg-gray-50/50 p-6">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex justify-between items-center">
                  <span>Attached Document</span>
                  {selectedRequest.attachmentUrl && (
                    <a href={selectedRequest.attachmentUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 underline text-[9px]">Open in new tab</a>
                  )}
                </h3>
                
                <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-inner flex items-center justify-center min-h-[300px]">
                  {selectedRequest.attachmentUrl ? (
                    selectedRequest.attachmentUrl.toLowerCase().endsWith('.pdf') ? (
                      <iframe src={selectedRequest.attachmentUrl} className="w-full h-full border-0" title="Attached Document"></iframe>
                    ) : (
                      <img src={selectedRequest.attachmentUrl} alt="Attached Document" className="max-w-full max-h-full object-contain p-2" />
                    )
                  ) : (
                    <div className="text-center text-gray-400">
                      <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-medium">No document attached</p>
                    </div>
                  )}
                </div>

                {selectedRequest.additionalImages && selectedRequest.additionalImages.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center">
                      <ImageIcon className="mr-2 h-3 w-3" />
                      Optional Support Photos
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedRequest.additionalImages.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-xl border border-gray-200 overflow-hidden hover:opacity-80 transition-opacity bg-white">
                          <img src={url} alt={`Support ${idx + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-white flex justify-end">
              <button onClick={() => setSelectedRequest(null)} className="px-6 py-2 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-gray-800 transition-colors shadow-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {actionLoading === 'bulk' && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gray-900/10 backdrop-blur-[2px] animate-in fade-in duration-300">
          <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center space-y-4 border border-gray-100 scale-90 animate-in zoom-in-95">
            <div className="relative">
              <div className="h-12 w-12 border-4 border-primary/20 rounded-full animate-pulse"></div>
              <Loader2 className="h-12 w-12 text-primary animate-spin absolute inset-0" />
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-gray-900 uppercase tracking-widest">Processing</p>
              <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">Please wait while we process the selected items...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
