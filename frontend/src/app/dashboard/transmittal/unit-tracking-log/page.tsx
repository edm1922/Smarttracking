'use client';

import { useEffect, useState } from 'react';
import { History, Truck, Search, Filter, ArrowUpRight, Download, Printer } from 'lucide-react';
import api from '@/lib/api';

export default function UnitTrackingLogPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/pull-out-requests');
      setRequests(res.data);
    } catch (err) {
      console.error('Failed to fetch pull out requests', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(req => 
    req.item.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-black uppercase tracking-widest text-gray-400">Loading Logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-2">Unit Tracking Transmittal</h1>
          <p className="text-gray-500 font-medium">Historical audit log of all QR pull-out actions and status updates.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all shadow-sm">
            <Printer className="h-4 w-4" /> Print Log
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search by Asset ID or Requester..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-5 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium text-gray-900"
          />
        </div>
        <button className="p-5 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm hover:bg-gray-50 transition-all">
          <Filter className="h-6 w-6 text-gray-400" />
        </button>
      </div>

      {/* Request History Log Section */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white">
              <History className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Pull Out Request Log</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Formal record of all sub-inventory releases</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Asset ID</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Requester</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-gray-700">{new Date(req.createdAt).toLocaleDateString()}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-mono font-bold text-primary bg-primary/5 px-2 py-1 rounded-md">{req.item.slug}</span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-gray-900">{req.user.username}</p>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <p className="text-sm font-black text-gray-900">{req.qty} <span className="text-[10px] text-gray-400 uppercase">{req.unit}</span></p>
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
                    <button 
                      onClick={() => window.open(`/i/${req.item.slug}`, '_blank')}
                      className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <History className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-sm font-bold text-gray-400">No requests matching your search.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
