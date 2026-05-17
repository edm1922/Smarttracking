'use client';

import { useEffect, useState, Suspense } from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import { UnitTrackingHeaderForm } from './components/UnitTrackingHeaderForm';
import { UnitTrackingItemSelector } from './components/UnitTrackingItemSelector';
import { UnitTrackingSelectedItems } from './components/UnitTrackingSelectedItems';
import { PrintableUnitTracking } from './components/PrintableUnitTracking';
import { PageHeaderSkeleton } from '@/components/ui/LoadingSkeletons';

interface TransmittalItem {
  id: string;
  requestId: string;
  name: string;
  assetId: string;
  quantity: number;
  unit: string;
}

export default function UnitTrackingLogPage() {
  return (
    <Suspense fallback={<div className="p-10"><PageHeaderSkeleton /></div>}>
      <UnitTrackingLogContent />
    </Suspense>
  );
}

function UnitTrackingLogContent() {
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
    subject: 'UNIT TRACKING TRANSMITTAL',
    subTitle: 'SUB-INVENTORY TRACKING & UNIT RELEASE AUTHORIZATION',
    customSubHeader: '',
    preparedBy: '',
    checkedBy: '',
    receivedBy: '',
    approvedBy: '',
    remarks: '',
    showPrepared: true,
    showChecked: false,
    showReceived: true,
    showApproved: true
  });

  const [selectedItems, setSelectedItems] = useState<TransmittalItem[]>([]);

  useEffect(() => {
    setHeaderInfo(prev => ({
      ...prev,
      transmittalNo: prev.transmittalNo || `TR-UNIT-${Date.now().toString().slice(-6)}`,
      date: prev.date || new Date().toLocaleDateString('en-CA'),
      preparedBy: localStorage.getItem('username')?.toUpperCase() || ''
    }));

    const fetchRequests = async () => {
      try {
        const res = await api.get('/pull-out-requests');
        setRequests(res.data.data || []);
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

  if (loading) return <div className="p-10"><PageHeaderSkeleton /></div>;

  return (
    <div className="max-w-[1600px] mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
      {/* Builder Interface (Hidden when printing) */}
      <div className="no-print space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <Link href="/dashboard/transmittal" className="inline-flex items-center text-[10px] font-black text-primary uppercase tracking-widest hover:translate-x-[-4px] transition-transform">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Portals
            </Link>
            <div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Unit Log Builder</h1>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Lifecycle Tracking & Release Documentation</p>
            </div>
          </div>
          <button
            onClick={handlePrint}
            disabled={selectedItems.length === 0}
            className="px-10 py-5 bg-primary text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:bg-primary-dark hover:-translate-y-1 transition-all active:translate-y-0 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none flex items-center gap-3"
          >
            <Printer className="h-5 w-5" />
            Generate Documentation
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4">
            <UnitTrackingHeaderForm headerInfo={headerInfo} setHeaderInfo={setHeaderInfo} />
          </div>
          <div className="lg:col-span-8 space-y-8">
            <UnitTrackingItemSelector 
              searchTerm={searchTerm} 
              setSearchTerm={setSearchTerm} 
              filteredRequests={filteredRequests} 
              addRequestItem={addRequestItem} 
              selectedItems={selectedItems} 
            />
            <UnitTrackingSelectedItems 
              selectedItems={selectedItems} 
              removeItem={removeItem} 
              updateQuantity={updateQuantity} 
            />
          </div>
        </div>
      </div>

      <PrintableUnitTracking headerInfo={headerInfo} selectedItems={selectedItems} />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `}</style>
    </div>
  );
}
