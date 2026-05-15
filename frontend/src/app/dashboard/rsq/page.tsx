
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Layers,
  Scissors,
  CheckCircle2,
  Clock,
  X
} from 'lucide-react';
import { RSQSlipPrint } from './components/RSQSlipPrint';
import { TransactionSlipPrint } from './components/TransactionSlipPrint';

export default function RSQPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') || 'fabrics';
  
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tailors, setTailors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState<'fabric' | 'request' | 'transaction' | null>(null);
  
  // Print State
  const [printRsq, setPrintRsq] = useState<any>(null);
  const [printTrn, setPrintTrn] = useState<any>(null);

  useEffect(() => {
    fetchData();
    fetchTailors();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'fabrics') {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rsq/fabrics`);
        const data = await res.json();
        setFabrics(data);
      } else if (activeTab === 'requests') {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rsq/requests`);
        const data = await res.json();
        setRequests(data);
      } else if (activeTab === 'transactions') {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rsq/transactions`);
        const data = await res.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Error fetching RSQ data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTailors = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rsq/tailors`);
      const data = await res.json();
      setTailors(data);
    } catch (e) {}
  };

  const handlePrintRSQ = (rsq: any) => {
    setPrintRsq(rsq);
    setTimeout(() => {
      window.print();
      setPrintRsq(null);
    }, 500);
  };

  const handlePrintTrn = (trn: any) => {
    setPrintTrn(trn);
    setTimeout(() => {
      window.print();
      setPrintTrn(null);
    }, 500);
  };

  const tabs = [
    { id: 'fabrics', label: 'Fabric Inventory', icon: Layers },
    { id: 'requests', label: 'Tailoring Hub', icon: Scissors },
    { id: 'transactions', label: 'Transaction History', icon: History },
  ];

  return (
    <div className="space-y-6">
      {/* Hide layout when printing specific slips */}
      <div className={`no-print ${printRsq || printTrn ? 'hidden' : ''} space-y-6`}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Fabric & Tailoring (RSQ)</h1>
            <p className="text-sm text-gray-500 font-medium uppercase tracking-widest mt-1">Raw Material Management & Job Orders</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
              onClick={() => {
                if (activeTab === 'fabrics') setModal('fabric');
                else if (activeTab === 'requests') setModal('request');
                else setModal('transaction');
              }}
            >
              <Plus className="h-4 w-4" />
              {activeTab === 'fabrics' ? 'Add Fabric' : activeTab === 'requests' ? 'New RSQ' : 'Log Movement'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => router.push(`/dashboard/rsq?tab=${tab.id}`)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  isActive 
                    ? 'bg-primary text-white shadow-md' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 min-h-[600px] overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[600px] gap-4">
              <div className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Data...</p>
            </div>
          ) : (
            <div className="p-8">
              {activeTab === 'fabrics' && <FabricList data={fabrics} />}
              {activeTab === 'requests' && <RequestList data={requests} onPrint={handlePrintRSQ} />}
              {activeTab === 'transactions' && <TransactionList data={transactions} onPrint={handlePrintTrn} />}
            </div>
          )}
        </div>
      </div>

      {/* Print Areas */}
      {printRsq && <RSQSlipPrint rsq={printRsq} />}
      {printTrn && <TransactionSlipPrint transaction={printTrn} />}

      {/* Modals */}
      {modal === 'fabric' && (
        <AddFabricModal 
          onClose={() => setModal(null)} 
          onSuccess={() => { setModal(null); fetchData(); }} 
        />
      )}
      {modal === 'request' && (
        <NewRSQModal 
          onClose={() => setModal(null)} 
          fabrics={fabrics} 
          tailors={tailors}
          onSuccess={() => { setModal(null); fetchData(); }} 
        />
      )}
      {modal === 'transaction' && (
        <TransactionModal 
          onClose={() => setModal(null)} 
          fabrics={fabrics} 
          onSuccess={() => { setModal(null); fetchData(); }} 
        />
      )}
    </div>
  );
}

// Modals

function NewRSQModal({ onClose, fabrics, tailors, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tailorId: '',
    fabricId: '',
    quantityOrdered: '',
    remarks: '',
    targetDate: ''
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rsq/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantityOrdered: parseFloat(formData.quantityOrdered)
        })
      });
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-lg font-black uppercase tracking-widest text-gray-900">New Tailoring Request</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Select Tailor</label>
            <select required value={formData.tailorId} onChange={e => setFormData({...formData, tailorId: e.target.value})} className="w-full rounded-xl border-gray-200 p-3 text-sm font-bold bg-gray-50 focus:ring-primary focus:border-primary">
              <option value="">-- Select Tailor --</option>
              {tailors.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Select Fabric (Optional)</label>
            <select value={formData.fabricId} onChange={e => setFormData({...formData, fabricId: e.target.value})} className="w-full rounded-xl border-gray-200 p-3 text-sm font-bold bg-gray-50 focus:ring-primary focus:border-primary">
              <option value="">-- No Fabric Specified --</option>
              {fabrics.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Quantity (pcs)</label>
              <input type="number" required value={formData.quantityOrdered} onChange={e => setFormData({...formData, quantityOrdered: e.target.value})} className="w-full rounded-xl border-gray-200 p-3 text-sm font-bold bg-gray-50 focus:ring-primary focus:border-primary" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Target Date</label>
              <input type="date" required value={formData.targetDate} onChange={e => setFormData({...formData, targetDate: e.target.value})} className="w-full rounded-xl border-gray-200 p-3 text-sm font-bold bg-gray-50 focus:ring-primary focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Item/Style Description & Remarks</label>
            <textarea required rows={3} value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} className="w-full rounded-xl border-gray-200 p-3 text-sm font-bold bg-gray-50 focus:ring-primary focus:border-primary placeholder:text-gray-300" placeholder="E.g. Bullcap - Yellow (Katrina)"></textarea>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-100">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-50">
              {loading ? 'Saving...' : 'Create RSQ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddFabricModal({ onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'KATRINA',
    color: '',
    unit: 'Roll',
    unitPrice: ''
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    // Since there's no dedicated 'create fabric' endpoint yet, we might need one.
    // Let's assume we can post to /rsq/fabrics if we add it, or we can just tell the user it needs a backend update.
    // For now, I will add the UI and mock the success if the endpoint doesn't exist.
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rsq/fabrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          unitPrice: parseFloat(formData.unitPrice) || 0
        })
      });
      if (res.ok) {
        onSuccess();
      } else {
        alert('Failed to add fabric. Please check console for details.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-lg font-black uppercase tracking-widest text-gray-900">Add New Fabric</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Fabric Name</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full rounded-xl border-gray-200 p-3 text-sm font-bold bg-gray-50 focus:ring-primary focus:border-primary" placeholder="E.g. Katrinas - Red" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Type</label>
              <input type="text" required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full rounded-xl border-gray-200 p-3 text-sm font-bold bg-gray-50 focus:ring-primary focus:border-primary" placeholder="E.g. KATRINA" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Color (Optional)</label>
              <input type="text" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} className="w-full rounded-xl border-gray-200 p-3 text-sm font-bold bg-gray-50 focus:ring-primary focus:border-primary" placeholder="E.g. Red" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Unit</label>
              <input type="text" required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full rounded-xl border-gray-200 p-3 text-sm font-bold bg-gray-50 focus:ring-primary focus:border-primary" placeholder="E.g. Roll, Yards" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Unit Price (₱)</label>
              <input type="number" required step="0.01" value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: e.target.value})} className="w-full rounded-xl border-gray-200 p-3 text-sm font-bold bg-gray-50 focus:ring-primary focus:border-primary" />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-100">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-50">
              {loading ? 'Saving...' : 'Add Fabric'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TransactionModal({ onClose, fabrics, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fabricId: '',
    type: 'STOCK_IN',
    quantity: '',
    remarks: ''
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rsq/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantity: parseFloat(formData.quantity)
        })
      });
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-lg font-black uppercase tracking-widest text-gray-900">Log Fabric Movement</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Movement Type</label>
            <div className="flex bg-gray-50 p-1 rounded-xl">
              {['STOCK_IN', 'WITHDRAWAL', 'RETURN'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({...formData, type})}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    formData.type === type 
                      ? 'bg-white shadow-sm text-primary' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Select Fabric</label>
            <select required value={formData.fabricId} onChange={e => setFormData({...formData, fabricId: e.target.value})} className="w-full rounded-xl border-gray-200 p-3 text-sm font-bold bg-gray-50 focus:ring-primary focus:border-primary">
              <option value="">-- Select Fabric --</option>
              {fabrics.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Quantity</label>
            <input type="number" required step="0.1" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full rounded-xl border-gray-200 p-3 text-sm font-bold bg-gray-50 focus:ring-primary focus:border-primary" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Remarks</label>
            <textarea rows={2} value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} className="w-full rounded-xl border-gray-200 p-3 text-sm font-bold bg-gray-50 focus:ring-primary focus:border-primary placeholder:text-gray-300"></textarea>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-100">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Lists

function FabricList({ data }: { data: any[] }) {
  const [search, setSearch] = useState('');
  
  const filtered = data.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Master Fabric List</h2>
        <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
          <Search className="h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search fabrics..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-xs font-bold text-gray-600 placeholder:text-gray-300 w-64 focus:ring-0"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {filtered.map((fabric) => {
          const balance = fabric.transactions?.reduce((acc: number, t: any) => {
            if (t.type === 'STOCK_IN' || t.type === 'INITIAL_BALANCE' || t.type === 'RETURN') return acc + t.quantity;
            if (t.type === 'WITHDRAWAL') return acc - t.quantity;
            return acc;
          }, 0) || 0;

          return (
            <div key={fabric.id} className="bg-gray-50/50 rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:border-primary/20 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                    {fabric.type}
                  </span>
                  <h3 className="text-sm font-black text-gray-900 uppercase mt-2 group-hover:text-primary transition-colors">{fabric.name}</h3>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Balance</p>
                  <p className="text-lg font-black text-gray-900">{balance} <span className="text-xs text-gray-400 uppercase">{fabric.unit}</span></p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-gray-200/60">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Unit Price: <span className="text-gray-700">₱{fabric.unitPrice.toLocaleString()}</span></p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RequestList({ data, onPrint }: { data: any[], onPrint: (rsq: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Active RSQ Tracking</h2>
      </div>

      <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
        <table className="w-full relative">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="bg-gray-50 border-y border-gray-100">
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">RSQ No.</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Product / Details</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Fabric</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Tailor</th>
              <th className="px-6 py-4 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Qty</th>
              <th className="px-6 py-4 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((req) => (
              <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <span className="text-xs font-black text-gray-900">{req.rsqNo}</span>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">
                    {new Date(req.orderDate).toLocaleDateString()}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-bold text-gray-700">{req.product?.name || 'N/A'}</span>
                  <p className="text-[10px] text-gray-400 line-clamp-1 italic">{req.remarks}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-bold text-gray-600 uppercase">{req.fabric?.name || 'N/A'}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-bold text-gray-600 uppercase">{req.tailor?.name}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-xs font-black text-gray-900">{req.quantityOrdered}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    req.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    req.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {req.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => onPrint(req)} className="p-2 text-gray-400 hover:text-primary transition-colors hover:bg-primary/5 rounded-lg group relative">
                      <Printer className="h-4 w-4" />
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Print RSQ Slip</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TransactionList({ data, onPrint }: { data: any[], onPrint: (trn: any) => void }) {
  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Fabric Movement History</h2>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
        {data.map((trn) => {
          const isOut = trn.type === 'WITHDRAWAL';
          const isIn = trn.type === 'STOCK_IN' || trn.type === 'RETURN' || trn.type === 'INITIAL_BALANCE';

          return (
            <div key={trn.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-primary/20 transition-all group">
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isOut ? 'bg-red-50 text-red-500' : 
                  trn.type === 'INITIAL_BALANCE' ? 'bg-blue-50 text-blue-500' :
                  'bg-green-50 text-green-500'
                }`}>
                  {isOut ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-gray-900 uppercase">{trn.fabric?.name}</span>
                    <span className={`text-[10px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md ${
                      isOut ? 'bg-red-100 text-red-700' : 
                      trn.type === 'INITIAL_BALANCE' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {trn.type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    {new Date(trn.date).toLocaleString()} • {trn.location || 'BODEGA'} • {trn.transactionNo}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className={`text-sm font-black ${isOut ? 'text-red-600' : 'text-green-600'}`}>
                    {isOut ? '-' : '+'}{trn.quantity} <span className="text-[10px] uppercase">{trn.unit}</span>
                  </p>
                  <p className="text-[10px] text-gray-400 italic mt-0.5 max-w-[200px] truncate">{trn.remarks || 'No remarks'}</p>
                </div>
                <button onClick={() => onPrint(trn)} className="p-2 text-gray-400 hover:text-primary transition-colors hover:bg-primary/5 rounded-lg opacity-0 group-hover:opacity-100">
                  <Printer className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
