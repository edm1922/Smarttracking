'use client';

import { useEffect, useState } from 'react';
import { History, Truck, Search, Filter, ArrowUpRight, Download, Printer, FileText, X } from 'lucide-react';
import api from '@/lib/api';

export default function UnitTrackingLogPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [isBuildingTransmittal, setIsBuildingTransmittal] = useState(false);
  const [transmittalHeader, setTransmittalHeader] = useState({
    transmittalNo: `TR-UNIT-${Date.now().toString().slice(-6)}`,
    date: new Date().toLocaleDateString('en-CA'),
    department: '',
    recipient: '',
    preparedBy: '',
    receivedBy: '',
    approvedBy: ''
  });

  useEffect(() => {
    fetchRequests();
    const user = localStorage.getItem('username');
    if (user) {
      setTransmittalHeader(prev => ({ ...prev, preparedBy: user }));
    }
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

  const toggleRequestSelection = (id: string) => {
    setSelectedRequestIds(prev => 
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };

  const handlePrintTransmittal = () => {
    window.print();
  };

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

          <div className="flex items-center gap-3 no-print">
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
                <th className="px-8 py-5 w-12 text-center no-print">
                   <input 
                    type="checkbox" 
                    onChange={(e) => {
                        if (e.target.checked) setSelectedRequestIds(filteredRequests.map(r => r.id));
                        else setSelectedRequestIds([]);
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                   />
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Asset ID</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Requester</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right no-print">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRequests.map((req) => (
                <tr key={req.id} className={`hover:bg-gray-50/50 transition-colors group ${selectedRequestIds.includes(req.id) ? 'bg-primary/5' : ''}`}>
                  <td className="px-8 py-5 text-center no-print">
                    <input 
                      type="checkbox" 
                      checked={selectedRequestIds.includes(req.id)}
                      onChange={() => toggleRequestSelection(req.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </td>
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
                  <td className="px-8 py-5 text-right no-print">
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
                        placeholder="e.g. Operations / Logistics"
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
                  {['preparedBy', 'receivedBy', 'approvedBy'].map(field => (
                    <div key={field}>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{field.replace(/By$/, ' By')}</label>
                        <input 
                            type="text" 
                            value={(transmittalHeader as any)[field]}
                            onChange={e => setTransmittalHeader({...transmittalHeader, [field]: e.target.value})}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                        />
                    </div>
                  ))}
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
            <div><div className="text-[10px] font-black text-gray-400 uppercase mb-1">Recipient / End-User:</div><div className="text-lg font-bold border-b-2 border-gray-100 pb-1">{transmittalHeader.recipient || '____________________'}</div></div>
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

        <div className="grid grid-cols-3 gap-12 pt-12 border-t-2 border-gray-50">
          {['preparedBy', 'receivedBy', 'approvedBy'].map(field => (
            <div key={field} className="space-y-8">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{field.replace(/By$/, ' By')}:</div>
              <div className="border-b-2 border-gray-900 text-center pb-2">
                <span className="text-sm font-black uppercase">{(transmittalHeader as any)[field] || '____________________'}</span>
              </div>
              <div className="text-center text-[8px] font-bold text-gray-400 uppercase italic tracking-tighter">Signature / Date</div>
            </div>
          ))}
        </div>

        <div className="mt-20 pt-12 border-t border-dashed border-gray-200">
            <p className="text-[9px] font-medium text-gray-400 text-center uppercase tracking-widest italic">
                This material transmittal is generated automatically by the Smart Tracking System.
            </p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white; color: black; }
          .no-print { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  );
}
