'use client';

import { useEffect, useState } from 'react';
import {
  Printer, Plus, Trash2, Search, Box,
  User, Calendar, Building2, FileText, ArrowLeft, History, X, ClipboardList
} from 'lucide-react';
import api from '@/lib/api';

interface TransmittalItem {
  id: string;
  requestId: string;
  name: string;
  assetId: string;
  quantity: number;
  unit: string;
}

export default function UnitTrackingLogPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Transmittal Header Info
  const [headerInfo, setHeaderInfo] = useState({
    transmittalNo: '',
    date: '',
    department: '',
    endUser: '',
    position: '',
    subject: 'Unit Tracking Transmittal',
    subTitle: 'Sub-Inventory Tracking & Unit Release Authorization',
    customSubHeader: '',
    preparedBy: '',
    receivedBy: '',
    approvedBy: '',
    showPrepared: true,
    showReceived: true,
    showApproved: true
  });

  const [selectedItems, setSelectedItems] = useState<TransmittalItem[]>([]);

  useEffect(() => {
    setHeaderInfo(prev => ({
      ...prev,
      transmittalNo: prev.transmittalNo || `TR-UNIT-${Date.now().toString().slice(-6)}`,
      date: prev.date || new Date().toLocaleDateString('en-CA'),
      preparedBy: localStorage.getItem('username') || ''
    }));

    const fetchRequests = async () => {
      try {
        const res = await api.get('/pull-out-requests');
        setRequests(res.data);
      } catch (err) {
        console.error('Failed to fetch requests', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const addRequestItem = (req: any) => {
    if (selectedItems.find(item => item.requestId === req.id)) return;
    setSelectedItems([...selectedItems, {
      id: Math.random().toString(36).substr(2, 9),
      requestId: req.id,
      name: req.item.name,
      assetId: req.item.slug,
      quantity: req.qty,
      unit: req.unit
    }]);
  };

  const removeItem = (id: string) => {
    setSelectedItems(selectedItems.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    setSelectedItems(selectedItems.map(item =>
      item.id === id ? { ...item, quantity: Math.max(1, qty) } : item
    ));
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const filteredRequests = requests.filter(req =>
    req.item.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Builder Interface (Hidden when printing) */}
      <div className="no-print space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Unit Transmittal Builder</h1>
            <p className="text-sm text-gray-500">Generate formal documentation for unit releases and pull-outs</p>
          </div>
          <button
            onClick={handlePrint}
            disabled={selectedItems.length === 0}
            className="inline-flex items-center rounded-md bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50"
          >
            <Printer className="mr-2 h-4 w-4" />
            Generate & Print
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Header Configuration */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4 h-fit">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
              <FileText className="mr-2 h-4 w-4" />
              Header Details
            </h3>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Date</label>
              <input type="date" value={headerInfo.date} onChange={e => setHeaderInfo({ ...headerInfo, date: e.target.value })} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Department</label>
              <input type="text" value={headerInfo.department} onChange={e => setHeaderInfo({ ...headerInfo, department: e.target.value })} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1" placeholder="e.g. OPERATIONS" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">End-User / Recipient</label>
              <input type="text" value={headerInfo.endUser} onChange={e => setHeaderInfo({ ...headerInfo, endUser: e.target.value })} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1" placeholder="Recipient Name" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Position</label>
              <input type="text" value={headerInfo.position} onChange={e => setHeaderInfo({ ...headerInfo, position: e.target.value })} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1" placeholder="Job Title" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Subject</label>
              <input type="text" value={headerInfo.subject} onChange={e => setHeaderInfo({ ...headerInfo, subject: e.target.value })} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Custom Sub-Header</label>
              <input type="text" value={headerInfo.customSubHeader} onChange={e => setHeaderInfo({ ...headerInfo, customSubHeader: e.target.value })} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1" placeholder="Override subtitle..." />
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-3">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Signatories</h4>
              {['preparedBy', 'receivedBy', 'approvedBy'].map(field => {
                const showField = field === 'preparedBy' ? 'showPrepared' : 
                                field === 'receivedBy' ? 'showReceived' : 'showApproved';
                return (
                  <div key={field} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">{field.replace(/By$/, ' By')}</label>
                      <input 
                        type="checkbox" 
                        checked={(headerInfo as any)[showField]} 
                        onChange={e => setHeaderInfo({ ...headerInfo, [showField]: e.target.checked })}
                        className="h-3 w-3 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </div>
                    <input 
                      type="text" 
                      disabled={!(headerInfo as any)[showField]}
                      value={(headerInfo as any)[field] || ''} 
                      onChange={e => setHeaderInfo({ ...headerInfo, [field]: e.target.value })} 
                      className={`w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs outline-none focus:ring-1 ${!(headerInfo as any)[showField] ? 'bg-gray-50 text-gray-400' : ''}`} 
                      placeholder="Name" 
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selection & Builder */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
                <History className="mr-2 h-4 w-4" />
                Select from Request History
              </h3>
              
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search Asset ID or Requester..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2 text-sm outline-none focus:ring-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2">
                {filteredRequests.map(req => (
                  <button 
                    key={req.id} 
                    onClick={() => addRequestItem(req)} 
                    className={`flex flex-col p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-primary/5 hover:border-primary/20 transition-all text-left ${selectedItems.find(i => i.requestId === req.id) ? 'opacity-50 cursor-default ring-1 ring-primary' : ''}`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="text-xs font-bold text-gray-900">{req.item.slug}</div>
                      <div className="text-[10px] font-black text-primary bg-primary/10 px-1.5 rounded">{req.qty} {req.unit}</div>
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold">{req.user.username} • {new Date(req.createdAt).toLocaleDateString()}</div>
                    <div className="text-[9px] text-gray-400 uppercase mt-1 font-black">{req.status}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Items Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Items for Transmittal</h3>
                <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-full">{selectedItems.length} entries</span>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Asset ID</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quantity</th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedItems.map(item => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900 font-mono">{item.assetId}</div>
                        <div className="text-[10px] text-gray-500">{item.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <input type="number" value={isNaN(item.quantity) ? '' : item.quantity} onChange={e => updateQuantity(item.id, parseInt(e.target.value) || 0)} className="w-16 rounded border border-gray-200 px-2 py-1 text-sm outline-none focus:ring-1" />
                          <span className="text-[10px] font-bold text-gray-400 uppercase">{item.unit}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {selectedItems.length === 0 && (
                    <tr><td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-400 italic">No entries selected. Use the search above to pick from history.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Form */}
      <div className="hidden print:block bg-white p-12 text-gray-900">
        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-8 mb-12">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 mb-1">{headerInfo.subject}</h1>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">{headerInfo.customSubHeader || headerInfo.subTitle}</p>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-gray-400 uppercase mb-1">Transmittal No.</div>
            <div className="text-xl font-black font-mono">{headerInfo.transmittalNo}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-12">
          <div className="space-y-4">
            <div><div className="text-[10px] font-black text-gray-400 uppercase mb-1">Department:</div><div className="text-base font-bold border-b border-gray-200 pb-1">{headerInfo.department || '____________________'}</div></div>
            <div><div className="text-[10px] font-black text-gray-400 uppercase mb-1">End-User / Recipient:</div><div className="text-base font-bold border-b border-gray-200 pb-1">{headerInfo.endUser || '____________________'}</div></div>
            <div><div className="text-[10px] font-black text-gray-400 uppercase mb-1">Position:</div><div className="text-base font-bold border-b border-gray-200 pb-1">{headerInfo.position || '____________________'}</div></div>
          </div>
          <div className="space-y-4">
            <div><div className="text-[10px] font-black text-gray-400 uppercase mb-1">Date:</div><div className="text-base font-bold border-b border-gray-200 pb-1">{new Date(headerInfo.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</div></div>
            <div><div className="text-[10px] font-black text-gray-400 uppercase mb-1">Subject:</div><div className="text-base font-bold border-b border-gray-200 pb-1">{headerInfo.subject}</div></div>
          </div>
        </div>

        <table className="w-full border-collapse mb-12">
          <thead>
            <tr className="border-y-2 border-gray-900 bg-gray-50">
              <th className="py-2 px-4 text-left text-[10px] font-black uppercase tracking-widest w-12">No.</th>
              <th className="py-2 px-4 text-left text-[10px] font-black uppercase tracking-widest">Asset ID / Description</th>
              <th className="py-2 px-4 text-left text-[10px] font-black uppercase tracking-widest w-24 text-center">Qty</th>
              <th className="py-2 px-4 text-left text-[10px] font-black uppercase tracking-widest">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {selectedItems.map((item, idx) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-3 px-4 text-[10px] font-bold">{idx + 1}</td>
                <td className="py-3 px-4 text-[10px] font-bold uppercase">{item.assetId} - {item.name}</td>
                <td className="py-3 px-4 text-[10px] font-black text-center">{item.quantity} {item.unit}</td>
                <td className="py-3 px-4 text-[10px] italic text-gray-400 uppercase tracking-tighter font-bold">Authorized Release</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid grid-cols-3 gap-x-12 gap-y-12 pt-12">
          {['preparedBy', 'receivedBy', 'approvedBy'].filter(field => {
            const showField = field === 'preparedBy' ? 'showPrepared' : 
                            field === 'receivedBy' ? 'showReceived' : 'showApproved';
            return (headerInfo as any)[showField];
          }).map(field => (
            <div key={field} className="flex flex-col items-center">
              <div className="w-full text-[9px] font-black text-gray-400 uppercase mb-6 text-center">{field.replace(/By$/, ' By')}:</div>
              <div className="w-full">
                <div className="text-[10px] font-black mb-1 uppercase text-center">{(headerInfo as any)[field] || '____________________'}</div>
                <div className="border-b-2 border-gray-900 w-full mb-1"></div>
                <div className="text-center text-[8px] font-bold text-gray-400 uppercase italic tracking-tighter">Signature / Date</div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-20 pt-12 border-t border-dashed border-gray-100 text-center">
           <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em]">Automated Transmittal Generation • Smart Tracking System</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white; }
          .no-print { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  );
}
