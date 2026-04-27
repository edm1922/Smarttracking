'use client';

import { useEffect, useState } from 'react';
import { Search, Clock, CheckCircle, XCircle, ClipboardList, X, FileText, Send, ImageIcon } from 'lucide-react';
import api from '@/lib/api';
import { TableSkeleton } from '@/components/ui/LoadingSkeletons';

interface Request {
  id: string;
  requestNo: string;
  date: string;
  employeeName: string;
  departmentArea: string;
  shift: string;
  quantity: number;
  status: string;
  remarks: string | null;
  attachmentUrl?: string | null;
  additionalImages?: string[] | null;
  product: { name: string; sku: string };
}

export default function PendingRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/internal-requests');
      setRequests(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAppeal = async (req: Request) => {
    const appealReason = prompt('Explain why you are appealing this rejection:');
    if (!appealReason) return;

    try {
      await api.patch(`/internal-requests/${req.id}/status`, { 
        status: 'PENDING', 
        remarks: `[APPEALED] ${appealReason}` 
      });
      fetchRequests();
      setSelectedRequest(null);
      alert('Appeal sent successfully! Your request is now back to PENDING status for review.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send appeal');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'APPROVED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'FULFILLED': return 'bg-green-100 text-green-800 border-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredRequests = requests
    .filter(r => 
      r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.requestNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.product.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const statusOrder: Record<string, number> = {
        'PENDING': 1,
        'APPROVED': 2,
        'FULFILLED': 3,
        'REJECTED': 4,
      };
      return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
    });

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Request Status</h1>
        <p className="text-sm text-gray-500 font-medium">Monitor your pending and past requisition requests</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by request #, item, or employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 pl-11 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Request Info</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee / Dept</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock Item</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <TableSkeleton columns={5} rows={4} />
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-gray-400">
                    <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                      <Search className="h-6 w-6 text-gray-300" />
                    </div>
                    <p className="text-sm font-medium">No requests found matching your search.</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} onDoubleClick={() => setSelectedRequest(req)} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-gray-900 flex items-center gap-2">
                        {req.requestNo}
                        {req.attachmentUrl && (
                          <a href={req.attachmentUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 p-0.5 rounded-sm bg-blue-50 hover:bg-blue-100 transition-colors" title="View Signed Document">
                            <ClipboardList className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 font-medium">{new Date(req.date).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-gray-900">{req.employeeName}</div>
                      <div className="text-[10px] text-gray-500 uppercase font-medium">{req.departmentArea} • {req.shift}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-gray-900">{req.product.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{req.product.sku}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-black text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">{req.quantity}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black border uppercase ${getStatusColor(req.status)}`}>
                          {req.status === 'PENDING' && <Clock className="mr-1.5 h-3 w-3" />}
                          {req.status === 'APPROVED' && <CheckCircle className="mr-1.5 h-3 w-3" />}
                          {req.status === 'REJECTED' && <XCircle className="mr-1.5 h-3 w-3" />}
                          {req.status === 'FULFILLED' && <CheckCircle className="mr-1.5 h-3 w-3" />}
                          {req.status}
                        </span>
                        {req.remarks && (
                          <div className="text-[9px] text-gray-500 mt-1 italic max-w-[200px] text-right leading-tight" title={req.remarks}>
                            "{req.remarks}"
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
                      <span className="text-xs font-black text-gray-500 uppercase">Quantity</span>
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
            
            <div className="p-4 border-t border-gray-100 bg-white flex justify-end space-x-3">
              <button onClick={() => setSelectedRequest(null)} className="px-6 py-2 bg-gray-100 text-gray-500 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-gray-200 transition-colors">
                Close
              </button>
              {selectedRequest.status === 'REJECTED' && (
                <button 
                  onClick={() => handleAppeal(selectedRequest)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-all shadow-md active:scale-95 flex items-center"
                >
                  <Send className="mr-2 h-3.5 w-3.5" />
                  Appeal Request
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
