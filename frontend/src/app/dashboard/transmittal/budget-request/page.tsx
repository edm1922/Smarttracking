'use client';

import { useEffect, useState } from 'react';
import { Printer, Plus } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { BudgetItem } from '../types';
import { BudgetRequestHeaderForm } from '../components/BudgetRequestHeaderForm';
import { BudgetRequestItemBuilder } from '../components/BudgetRequestItemBuilder';
import { BudgetRequestHistory } from '../components/BudgetRequestHistory';
import { PrintableBudgetRequest } from '../components/PrintableBudgetRequest';

export default function BudgetRequestPage() {
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [bgtNo, setBgtNo] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setItems([]);
    const today = new Date().toLocaleDateString('en-CA');
    setHeaderInfo({
      date: today,
      department: '',
      endUser: '',
      position: '',
      category: 'SERVICE',
      customSubHeader: '',
      preparedBy: '',
      checkedBy: '',
      receivedBy: '',
      approvedBy: '',
      remarks: ''
    });
    fetchNextBgtNo();
  };

  const fetchNextBgtNo = async () => {
    try {
      const res = await api.get('/budget-requests/next-no');
      setBgtNo(res.data);
    } catch (err) {
      console.error('Failed to fetch next BGT no', err);
    }
  };

  const [headerInfo, setHeaderInfo] = useState({
    date: '',
    department: '',
    endUser: '',
    position: '',
    category: 'SERVICE',
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
    }
    fetchNextBgtNo();

    const fetchHistory = async () => {
      try {
        const res = await api.get('/budget-requests');
        setHistory(res.data);
      } catch (err) {
        console.error('Failed to fetch budget history', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handlePrint = () => {
    if (items.length === 0) return toast.warning('Add line items first');
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const onSave = async () => {
    if (items.length === 0) return toast.warning('Add line items first');
    try {
      const data = {
        bgtNo,
        department: headerInfo.department,
        endUser: headerInfo.endUser,
        position: headerInfo.position,
        category: headerInfo.category,
        customSubHeader: headerInfo.customSubHeader,
        items,
        remarks: headerInfo.remarks,
        signatoryConfig: visibleSignatories,
        preparedBy: headerInfo.preparedBy,
        checkedBy: headerInfo.checkedBy,
        receivedBy: headerInfo.receivedBy,
        approvedBy: headerInfo.approvedBy
      };

      if (editingId) {
        await api.patch(`/budget-requests/${editingId}`, data);
        toast.success('Budget Request Updated!');
      } else {
        await api.post('/budget-requests', data);
        toast.success('Budget Request Saved!');
      }

      const res = await api.get('/budget-requests');
      setHistory(res.data);
    } catch (err) {
      toast.error(editingId ? 'Failed to update' : 'Failed to save');
    }
  };

  const addRow = (initialData?: Partial<BudgetItem>) => {
    setItems([...items, {
      id: Math.random().toString(36).substr(2, 9),
      description: initialData?.description || '',
      estimatedCost: initialData?.estimatedCost ?? 0,
      vendor: initialData?.vendor || '',
      contractor: initialData?.contractor || '',
      startDate: initialData?.startDate || '',
      endDate: initialData?.endDate || '',
      duration: initialData?.duration || '',
      remarks: initialData?.remarks || ''
    }]);
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const loadFromHistory = (record: any) => {
    setEditingId(record.id);
    setHeaderInfo({
      date: new Date(record.date).toLocaleDateString('en-CA'),
      department: record.department,
      endUser: record.endUser,
      position: record.position || '',
      category: record.category || 'SERVICE',
      customSubHeader: record.customSubHeader || '',
      preparedBy: record.preparedBy,
      checkedBy: record.checkedBy,
      receivedBy: record.receivedBy,
      approvedBy: record.approvedBy,
      remarks: record.remarks || ''
    });
    if (record.signatoryConfig) {
      setVisibleSignatories(record.signatoryConfig);
    }
    setBgtNo(record.bgtNo);
    setItems((record.items || []).map((item: any) => ({
      id: item.id || Math.random().toString(36).substr(2, 9),
      description: item.description || '',
      estimatedCost: item.estimatedCost || 0,
      vendor: item.vendor || '',
      contractor: item.contractor || '',
      startDate: item.startDate || '',
      endDate: item.endDate || '',
      duration: item.duration || '',
      remarks: item.remarks || ''
    })));
  };

  const appendItems = (record: any) => {
    const newItems = (record.items || []).map((item: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      description: item.description || '',
      estimatedCost: item.estimatedCost || 0,
      vendor: item.vendor || '',
      contractor: item.contractor || '',
      startDate: item.startDate || '',
      endDate: item.endDate || '',
      duration: item.duration || '',
      remarks: item.remarks || ''
    }));
    setItems(prev => [...prev, ...newItems]);
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this budget request from history?')) return;
    try {
      await api.delete(`/budget-requests/${id}`);
      setHistory(history.filter(h => h.id !== id));
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="no-print space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Budget Request Builder</h1>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-2">Create service or labor budget requests</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={resetForm}
              className="inline-flex items-center rounded-xl bg-white border-2 border-gray-100 px-6 py-4 text-sm font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 hover:border-gray-200 transition-all shadow-lg shadow-gray-100/50"
            >
              <Plus className="mr-3 h-5 w-5" />
              New Request
            </button>
            <button
              onClick={handlePrint}
              disabled={items.length === 0}
              className="inline-flex items-center rounded-xl bg-blue-600 px-8 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all active:translate-y-0 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
            >
              <Printer className="mr-3 h-5 w-5" />
              Generate & Print
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:sticky lg:top-8">
            <BudgetRequestHeaderForm
              headerInfo={headerInfo}
              setHeaderInfo={setHeaderInfo}
              bgtNo={bgtNo}
              visibleSignatories={visibleSignatories}
              setVisibleSignatories={setVisibleSignatories}
            />
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="h-[600px]">
              <BudgetRequestItemBuilder
                items={items}
                addRow={addRow}
                updateItem={updateItem}
                removeItem={removeItem}
                setItems={setItems}
                onSave={onSave}
                editingId={editingId}
              />
            </div>

            <BudgetRequestHistory
              history={history}
              loadFromHistory={loadFromHistory}
              appendItems={appendItems}
              deleteItem={deleteItem}
            />
          </div>
        </div>
      </div>

      <PrintableBudgetRequest
        headerInfo={headerInfo}
        bgtNo={bgtNo}
        items={items}
        visibleSignatories={visibleSignatories}
      />

      <style jsx global>{`
        @media print {
          @page { size: portrait; margin: 0.3in !important; }
          body { background: white !important; }
          .no-print { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
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
