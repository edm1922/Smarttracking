'use client';

import { useEffect, useState } from 'react';
import { Printer, Plus } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { PRItem } from '../types';
import { PRHeaderForm } from '../components/PRHeaderForm';
import { PRItemBuilder } from '../components/PRItemBuilder';
import { PRHistoryLog } from '../components/PRHistoryLog';
import { PrintablePR } from '../components/PrintablePR';

export default function PRTransmittalPage() {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [prHistory, setPrHistory] = useState<any[]>([]);
  const [prItems, setPrItems] = useState<PRItem[]>([]);
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

      const pendingPrItems = localStorage.getItem('pending_pr_items');
      if (pendingPrItems) {
        setPrItems(JSON.parse(pendingPrItems));
        localStorage.removeItem('pending_pr_items');
      }
    };

    fetchPrHistory();
    loadPreset();
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handlePrint = () => {
    if (prItems.length === 0) return toast.warning('Build your PR first');
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const savePR = async () => {
    if (prItems.length === 0) return toast.warning('Add items to PR first');
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
        toast.success('Purchase Request Updated!');
      } else {
        await api.post('/purchase-requests', data);
        toast.success('Purchase Request Saved!');
      }
      
      const res = await api.get('/purchase-requests');
      setPrHistory(res.data);
    } catch (err) {
      toast.error(editingPrId ? 'Failed to update PR' : 'Failed to save PR');
    }
  };

  const addPrRow = (initialData?: Partial<PRItem>) => {
    setPrItems([...prItems, { id: Math.random().toString(36).substr(2, 9), name: initialData?.name || '', description: initialData?.description || '', unit: initialData?.unit || 'PCS', quantity: initialData?.quantity ?? 1, estimatedCost: initialData?.estimatedCost ?? 0, currentStock: initialData?.currentStock ?? 0 }]);
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
    setPrItems((pr.items || []).map((item: any) => ({
      ...item,
      id: item.id || Math.random().toString(36).substr(2, 9),
      name: item.name || item.description || '',
      description: item.description || '',
      currentStock: item.currentStock ?? 0
    })));
  };

  const appendPrItems = (pr: any) => {
    const newItems = (pr.items || []).map((item: any) => ({
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      name: item.name || item.description || '',
      description: item.description || '',
      currentStock: item.currentStock ?? 0
    }));
    setPrItems(prev => [...prev, ...newItems]);
  };

  const deletePr = async (id: string) => {
    if (!confirm('Delete this PR from history?')) return;
    try {
      await api.delete(`/purchase-requests/${id}`);
      setPrHistory(prHistory.filter(p => p.id !== id));
    } catch (err) {
      toast.error('Failed to delete PR');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="no-print space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">PR Transmittal Builder</h1>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-2">Create formal purchase requests for procurement</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={resetForm}
              className="inline-flex items-center rounded-xl bg-white border-2 border-gray-100 px-6 py-4 text-sm font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 hover:border-gray-200 transition-all shadow-lg shadow-gray-100/50"
            >
              <Plus className="mr-3 h-5 w-5" />
              New PR
            </button>
            <button
              onClick={handlePrint}
              disabled={prItems.length === 0}
              className="inline-flex items-center rounded-xl bg-blue-600 px-8 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all active:translate-y-0 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
            >
              <Printer className="mr-3 h-5 w-5" />
              Generate & Print
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:sticky lg:top-8">
            <PRHeaderForm 
              headerInfo={headerInfo}
              setHeaderInfo={setHeaderInfo}
              prNo={prNo}
              fetchNextPrNo={fetchNextPrNo}
              visibleSignatories={visibleSignatories}
              setVisibleSignatories={setVisibleSignatories}
            />
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="h-[600px]">
              <PRItemBuilder 
                prItems={prItems}
                addPrRow={addPrRow}
                updatePrItem={updatePrItem}
                removePrItem={removePrItem}
                setPrItems={setPrItems}
                savePR={savePR}
                editingPrId={editingPrId}
              />
            </div>

            <PRHistoryLog 
              prHistory={prHistory}
              loadPrFromHistory={loadPrFromHistory}
              appendPrItems={appendPrItems}
              deletePr={deletePr}
            />
          </div>
        </div>
      </div>

      <PrintablePR 
        headerInfo={headerInfo}
        prNo={prNo}
        prItems={prItems}
        visibleSignatories={visibleSignatories}
      />

      <style jsx global>{`
        @media print {
          @page { size: portrait; margin: 0.3in !important; }
          body { background: white !important; }
          .no-print { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          #__next { padding: 0 !important; }
          .print-container { padding: 0 !important; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </div>
  );
}
