'use client';

import { useEffect, useState } from 'react';
import {
  Printer, Plus, Trash2, Search, FileText, ArrowLeft, ClipboardList
} from 'lucide-react';
import api from '@/lib/api';

export default function PRTransmittalPage() {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [prHistory, setPrHistory] = useState<any[]>([]);
  const [prItems, setPrItems] = useState<any[]>([]);
  const [prNo, setPrNo] = useState('');
  const [editingPrId, setEditingPrId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const resetForm = () => {
    setEditingPrId(null);
    setPrItems([]);
    const today = new Date().toLocaleDateString('en-CA');
    setHeaderInfo({
      date: today,
      department: '',
      endUser: '',
      position: '',
      sourceSupplier: '',
      subTitle: 'Purchase Requisition & Procurement Request',
      customSubHeader: '',
      preparedBy: '',
      checkedBy: '',
      receivedBy: '',
      approvedBy: '',
      remarks: ''
    });
    fetchNextPrNo(today);
  };

  const fetchNextPrNo = async (date: string) => {
    try {
      const res = await api.get(`/purchase-requests/next-no?date=${date}`);
      setPrNo(res.data);
    } catch (err) {
      console.error('Failed to fetch next PR no', err);
    }
  };

  // Transmittal Header Info
  const [headerInfo, setHeaderInfo] = useState({
    date: '',
    department: '',
    endUser: '',
    position: '',
    sourceSupplier: '',
    subTitle: 'Purchase Requisition & Procurement Request',
    customSubHeader: '',
    preparedBy: '',
    checkedBy: '',
    receivedBy: '',
    approvedBy: '',
    remarks: ''
  });

  const [visibleSignatories, setVisibleSignatories] = useState({
    preparedBy: true,
    checkedBy: true,
    receivedBy: true,
    approvedBy: true
  });

  useEffect(() => {
    // Generate PR Date on client side only to avoid hydration mismatch
    if (!headerInfo.date) {
      const today = new Date().toLocaleDateString('en-CA');
      setHeaderInfo(prev => ({ ...prev, date: today }));
      fetchNextPrNo(today);
    } else {
      fetchNextPrNo(headerInfo.date);
    }
    const fetchPrHistory = async () => {
      try {
        const res = await api.get('/purchase-requests');
        setPrHistory(res.data);
      } catch (err) {
        console.error('Failed to fetch PR history', err);
      } finally {
        setLoading(false);
      }
    };
    const loadPreset = () => {
      const saved = localStorage.getItem('transmittal_preset');
      if (saved) {
        const preset = JSON.parse(saved);
        setHeaderInfo(prev => ({
          ...prev,
          ...preset,
          date: new Date().toLocaleDateString('en-CA')
        }));
      }
    };

    fetchPrHistory();
    loadPreset();
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handlePrint = () => {
    if (prItems.length === 0) return alert('Build your PR first');
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const savePR = async () => {
    if (prItems.length === 0) return alert('Add items to PR first');
    try {
      const data = {
        prNo,
        department: headerInfo.department,
        endUser: headerInfo.endUser,
        position: headerInfo.position,
        sourceSupplier: headerInfo.sourceSupplier,
        subTitle: headerInfo.subTitle,
        customSubHeader: headerInfo.customSubHeader,
        items: prItems,
        remarks: headerInfo.remarks,
        signatoryConfig: visibleSignatories,
        preparedBy: headerInfo.preparedBy,
        checkedBy: headerInfo.checkedBy,
        receivedBy: headerInfo.receivedBy,
        approvedBy: headerInfo.approvedBy
      };

      if (editingPrId) {
        await api.patch(`/purchase-requests/${editingPrId}`, data);
        alert('Purchase Request Updated!');
      } else {
        await api.post('/purchase-requests', data);
        alert('Purchase Request Saved!');
      }
      
      const res = await api.get('/purchase-requests');
      setPrHistory(res.data);
    } catch (err) {
      alert(editingPrId ? 'Failed to update PR' : 'Failed to save PR');
    }
  };

  const addPrRow = () => {
    setPrItems([...prItems, { id: Math.random().toString(36).substr(2, 9), name: '', unit: 'PCS', quantity: 1, estimatedCost: 0 }]);
  };

  const updatePrItem = (id: string, field: string, value: any) => {
    setPrItems(prItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removePrItem = (id: string) => {
    setPrItems(prItems.filter(item => item.id !== id));
  };

  const loadPrFromHistory = (pr: any) => {
    setEditingPrId(pr.id);
    setHeaderInfo({
      date: new Date(pr.date).toLocaleDateString('en-CA'),
      department: pr.department,
      endUser: pr.endUser,
      position: pr.position,
      sourceSupplier: pr.sourceSupplier,
      subTitle: pr.subTitle || 'Purchase Requisition & Procurement Request',
      customSubHeader: pr.customSubHeader || '',
      preparedBy: pr.preparedBy,
      checkedBy: pr.checkedBy,
      receivedBy: pr.receivedBy,
      approvedBy: pr.approvedBy,
      remarks: pr.remarks || ''
    });
    if (pr.signatoryConfig) {
      setVisibleSignatories(pr.signatoryConfig);
    }
    setPrNo(pr.prNo);
    // Ensure each item has a unique ID for React keys and the builder
    // Also normalize 'description' (from migration) to 'name' (used in UI)
    setPrItems((pr.items || []).map((item: any) => ({
      ...item,
      id: item.id || Math.random().toString(36).substr(2, 9),
      name: item.name || item.description || ''
    })));
  };

  const deletePr = async (id: string) => {
    if (!confirm('Delete this PR from history?')) return;
    try {
      await api.delete(`/purchase-requests/${id}`);
      setPrHistory(prHistory.filter(p => p.id !== id));
    } catch (err) {
      alert('Failed to delete PR');
    }
  };

  return (
    <div className="space-y-8">
      <div className="no-print space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PR Transmittal Builder</h1>
            <p className="text-sm text-gray-500">Create formal purchase requests for procurement</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={resetForm}
              className="inline-flex items-center rounded-md bg-white border border-gray-200 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
            >
              <Plus className="mr-2 h-4 w-4" />
              New PR
            </button>
            <button
              onClick={handlePrint}
              disabled={prItems.length === 0}
              className="inline-flex items-center rounded-md bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              <Printer className="mr-2 h-4 w-4" />
              Generate & Print
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Header */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
              <FileText className="mr-2 h-4 w-4" />
              PR Header Details
            </h3>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Date</label>
              <input type="date" value={headerInfo.date || ''} onChange={e => {
                setHeaderInfo({ ...headerInfo, date: e.target.value });
                fetchNextPrNo(e.target.value);
              }} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">PR Number</label>
              <input readOnly type="text" value={prNo || ''} className="w-full rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-bold text-blue-600 outline-none cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Department</label>
              <input type="text" value={headerInfo.department || ''} onChange={e => setHeaderInfo({ ...headerInfo, department: e.target.value })} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">End-User</label>
              <input type="text" value={headerInfo.endUser || ''} onChange={e => setHeaderInfo({ ...headerInfo, endUser: e.target.value })} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Source / Supplier</label>
              <input type="text" value={headerInfo.sourceSupplier || ''} onChange={e => setHeaderInfo({ ...headerInfo, sourceSupplier: e.target.value })} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Custom Sub-Header</label>
              <input type="text" value={headerInfo.customSubHeader || ''} onChange={e => setHeaderInfo({ ...headerInfo, customSubHeader: e.target.value })} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1" placeholder="Override subtitle..." />
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-4">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Requisitioners</h4>
              {['preparedBy', 'checkedBy', 'receivedBy', 'approvedBy'].map(field => (
                <div key={field} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">{field.replace(/By$/, ' By')}</label>
                    <input 
                      type="checkbox" 
                      checked={(visibleSignatories as any)[field]} 
                      onChange={e => setVisibleSignatories({ ...visibleSignatories, [field]: e.target.checked })}
                      className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <input 
                    type="text" 
                    disabled={!(visibleSignatories as any)[field]}
                    value={(headerInfo as any)[field] || ''} 
                    onChange={e => setHeaderInfo({ ...headerInfo, [field]: e.target.value })} 
                    className={`w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs outline-none focus:ring-1 ${!(visibleSignatories as any)[field] ? 'bg-gray-50 text-gray-400' : ''}`} 
                  />
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-widest">Remarks</label>
              <textarea 
                value={headerInfo.remarks || ''} 
                onChange={e => setHeaderInfo({ ...headerInfo, remarks: e.target.value })} 
                placeholder="Additional notes or instructions..."
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-xs outline-none focus:ring-1 h-20 resize-none"
              />
            </div>
          </div>

          {/* Builder */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Item Builder
                </h3>
                <button onClick={addPrRow} className="text-xs font-bold text-blue-600 hover:underline">+ Add Custom Row</button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b">
                      <th className="pb-2 font-bold uppercase w-12">No.</th>
                      <th className="pb-2 font-bold uppercase">Description</th>
                      <th className="pb-2 font-bold uppercase w-16 text-center">Unit</th>
                      <th className="pb-2 font-bold uppercase w-16 text-center">Qty</th>
                      <th className="pb-2 font-bold uppercase w-24 text-right">Est. Cost</th>
                      <th className="pb-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {prItems.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="py-2 text-gray-400 font-bold">{idx + 1}</td>
                        <td className="py-2"><input type="text" value={item.name || ''} onChange={e => updatePrItem(item.id, 'name', e.target.value)} className="w-full bg-transparent outline-none focus:bg-blue-50 p-1 rounded" /></td>
                        <td className="py-2"><input type="text" value={item.unit || ''} onChange={e => updatePrItem(item.id, 'unit', e.target.value)} className="w-full bg-transparent text-center outline-none focus:bg-blue-50 p-1 rounded" /></td>
                        <td className="py-2"><input type="number" value={isNaN(item.quantity) ? '' : item.quantity} onChange={e => updatePrItem(item.id, 'quantity', parseInt(e.target.value) || 0)} className="w-full bg-transparent text-center font-bold outline-none focus:bg-blue-50 p-1 rounded" /></td>
                        <td className="py-2"><input type="number" value={isNaN(item.estimatedCost) ? '' : item.estimatedCost} onChange={e => updatePrItem(item.id, 'estimatedCost', parseFloat(e.target.value) || 0)} className="w-full bg-transparent text-right outline-none focus:bg-blue-50 p-1 rounded" /></td>
                        <td className="py-2 text-right"><button onClick={() => removePrItem(item.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="h-3 w-3" /></button></td>
                      </tr>
                    ))}
                    {prItems.length === 0 && (
                      <tr><td colSpan={6} className="py-12 text-center text-gray-400 italic">No items added. Click "+ Add Custom Row" to start.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button onClick={() => setPrItems([])} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-600">Clear All</button>
                <button onClick={savePR} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-blue-700">
                  {editingPrId ? 'Update PR Record' : 'Save to History'}
                </button>
              </div>
            </div>

            {/* History */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">PR History Log</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                {prHistory.map(pr => (
                  <button
                    key={pr.id}
                    onClick={() => loadPrFromHistory(pr)}
                    onDoubleClick={() => deletePr(pr.id)}
                    className="flex flex-col p-4 rounded-xl border border-gray-100 bg-gray-50 hover:border-blue-200 transition-all text-left"
                  >
                    <div className="flex justify-between items-center w-full mb-1">
                      <span className="text-sm font-black text-gray-900">{pr.prNo}</span>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 rounded">{pr.items.length} items</span>
                    </div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">{pr.department} • {pr.endUser}</span>
                    <span className="mt-2 text-[9px] text-gray-400">{new Date(pr.date).toLocaleDateString()}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Layout */}
      <div className="hidden print:block bg-white p-12 text-gray-900">
        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-8 mb-12">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 mb-1">Purchase Requisition</h1>
            <p className="text-sm font-bold text-gray-500">{headerInfo.customSubHeader || headerInfo.subTitle}</p>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-gray-400 uppercase mb-1">PR NO.</div>
            <div className="text-xl font-black font-mono">{prNo}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-12">
          <div className="space-y-4">
            <div><div className="text-[10px] font-black text-gray-400 uppercase mb-1">Department:</div><div className="text-base font-bold border-b border-gray-200 pb-1">{headerInfo.department || '____________________'}</div></div>
            <div><div className="text-[10px] font-black text-gray-400 uppercase mb-1">End-User:</div><div className="text-base font-bold border-b border-gray-200 pb-1">{headerInfo.endUser || '____________________'}</div></div>
          </div>
          <div className="space-y-4">
            <div><div className="text-[10px] font-black text-gray-400 uppercase mb-1">Date:</div><div className="text-base font-bold border-b border-gray-200 pb-1">{new Date(headerInfo.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</div></div>
            <div><div className="text-[10px] font-black text-gray-400 uppercase mb-1">Supplier / Project:</div><div className="text-base font-bold border-b border-gray-200 pb-1">{headerInfo.sourceSupplier || '____________________'}</div></div>
          </div>
        </div>

        <table className="w-full border-collapse mb-8">
          <thead>
            <tr className="border-y-2 border-gray-900 bg-gray-50">
              <th className="py-2 px-4 text-left text-[10px] font-black uppercase w-12">No.</th>
              <th className="py-2 px-4 text-left text-[10px] font-black uppercase">Description</th>
              <th className="py-2 px-4 text-center text-[10px] font-black uppercase w-16">Unit</th>
              <th className="py-2 px-4 text-center text-[10px] font-black uppercase w-16">Qty</th>
              <th className="py-2 px-4 text-right text-[10px] font-black uppercase w-28">Est. Cost</th>
              <th className="py-2 px-4 text-right text-[10px] font-black uppercase w-28">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {prItems.map((item, idx) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-2 px-4 text-[10px] font-bold">{idx + 1}</td>
                <td className="py-2 px-4 text-[10px] font-bold uppercase">{item.name}</td>
                <td className="py-2 px-4 text-[10px] text-center uppercase">{item.unit}</td>
                <td className="py-2 px-4 text-[10px] font-black text-center">{item.quantity}</td>
                <td className="py-2 px-4 text-right text-[10px] font-mono">₱{(item.estimatedCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="py-2 px-4 text-right text-[10px] font-black">₱{(item.quantity * item.estimatedCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-900 bg-gray-50">
              <td colSpan={5} className="py-3 px-4 text-right text-xs font-black uppercase tracking-widest">Total Estimated Amount:</td>
              <td className="py-3 px-4 text-right text-base font-black text-blue-700">₱{prItems.reduce((acc, i) => acc + (i.quantity * i.estimatedCost), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        {headerInfo.remarks && (
          <div className="mb-12">
            <div className="text-[10px] font-black text-gray-400 uppercase mb-1">Remarks:</div>
            <div className="text-sm font-medium text-gray-700 whitespace-pre-wrap border border-gray-100 p-4 rounded-lg bg-gray-50/50">
              {headerInfo.remarks}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-12 gap-y-6 pt-8">
          {['preparedBy', 'checkedBy', 'receivedBy', 'approvedBy'].filter(field => (visibleSignatories as any)[field]).map(field => (
            <div key={field} className="flex flex-col items-start border-t border-gray-100 pt-2">
              <div className="w-full text-[9px] font-black text-gray-400 uppercase mb-4">{field.replace(/By$/, ' By')}:</div>
              <div className="w-full">
                <div className="text-[10px] font-black mb-1 uppercase text-center">{(headerInfo as any)[field] || '____________________'}</div>
                <div className="border-b-2 border-gray-900 w-full mb-1"></div>
                <div className="text-center text-[8px] font-bold text-gray-400 uppercase italic tracking-tighter">Signature / Date</div>
              </div>
            </div>
          ))}
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
