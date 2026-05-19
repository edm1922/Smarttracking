'use client';

import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import api from '@/lib/api';
import { TransmittalHeaderInfo, TransmittalItem } from '../types';
import { TransmittalHeaderForm } from '../components/TransmittalHeaderForm';
import { TransmittalItemSelector } from '../components/TransmittalItemSelector';
import { TransmittalSelectedItems } from '../components/TransmittalSelectedItems';
import { PrintableTransmittal } from '../components/PrintableTransmittal';

export default function ProductTransmittalPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectionMode, setSelectionMode] = useState<'PRODUCT' | 'LOG' | 'RELEASE'>('PRODUCT');
  const [transmittalType, setTransmittalType] = useState<'MATERIAL' | 'EMPLOYEE'>('MATERIAL');
  const [logs, setLogs] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [pullRequests, setPullRequests] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState<'IN' | 'OUT'>('OUT');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Transmittal Header Info
  const [headerInfo, setHeaderInfo] = useState<TransmittalHeaderInfo>({
    transmittalNo: '',
    date: '',
    department: '',
    endUser: '',
    position: '',
    sourceSupplier: '',
    subject: 'Material Transmittal',
    subTitle: 'Enterprise Logistics & Supply Chain Tracking',
    customSubHeader: '',
    preparedBy: '',
    checkedBy: '',
    receivedBy: '',
    approvedBy: '',
    showPrepared: true,
    showChecked: false,
    showReceived: true,
    showApproved: true
  });

  const [selectedItems, setSelectedItems] = useState<TransmittalItem[]>([]);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products', { params: { take: 1000, search: searchTerm } });
      setProducts(res.data.data);

      // Load pending items from multi-select
      const pending = localStorage.getItem('pending_transmittal');
      if (pending) {
        const items = JSON.parse(pending);
        setSelectedItems(items.map((p: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          productId: p.id,
          name: p.name,
          sku: p.sku,
          description: p.description,
          unit: p.unit || 'PCS',
          quantity: 1,
          logIds: []
        })));
        localStorage.removeItem('pending_transmittal');
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await api.get('/products/logs', { params: { take: 10000, search: searchTerm } });
      setLogs(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }
  };

  const fetchReleases = async () => {
    try {
      const res = await api.get('/staff-inventory/admin/releases');
      setReleases(res.data || []);
    } catch (err) {
      console.error('Failed to fetch releases', err);
    }
  };

  const fetchPullRequests = async () => {
    try {
      const res = await api.get('/pull-out-requests', { params: { take: 1000 } });
      setPullRequests(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch pull requests', err);
    }
  };

  useEffect(() => {
    setHeaderInfo(prev => ({
      ...prev,
      transmittalNo: prev.transmittalNo || `TR-${Date.now().toString().slice(-6)}`,
      date: prev.date || new Date().toLocaleDateString('en-CA')
    }));

    const loadPreset = () => {
      const saved = localStorage.getItem('transmittal_preset');
      if (saved) {
        const preset = JSON.parse(saved);
        setHeaderInfo(prev => ({
          ...prev,
          ...preset,
          date: new Date().toLocaleDateString('en-CA'),
          transmittalNo: prev.transmittalNo
        }));
      }
    };

    loadPreset();
    setMounted(true);
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (!mounted) return;

    const timeout = setTimeout(() => {
      fetchProducts();
      fetchLogs();
      fetchReleases();
      fetchPullRequests();
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchTerm, mounted]);

  const updateSubject = (mode: 'PRODUCT' | 'LOG' | 'RELEASE', filter: 'IN' | 'OUT', type?: 'MATERIAL' | 'EMPLOYEE') => {
    const currentType = type || transmittalType;
    if (currentType === 'EMPLOYEE') {
      setHeaderInfo(prev => ({ ...prev, subject: 'Employee Receiving Transmittal' }));
      return;
    }

    if (mode === 'PRODUCT') {
      setHeaderInfo(prev => ({ ...prev, subject: 'Material Transmittal' }));
    } else if (mode === 'LOG') {
      setHeaderInfo(prev => ({ ...prev, subject: filter === 'IN' ? 'Stock IN' : 'Stock OUT' }));
    } else {
      setHeaderInfo(prev => ({ ...prev, subject: 'Employee Issuance' }));
    }
  };

  if (!mounted) return null;

  const addItem = (product: any) => {
    if (transmittalType !== 'EMPLOYEE') {
      const existing = selectedItems.find(item => item.productId === product.id);
      if (existing) {
        setSelectedItems(selectedItems.map(item => 
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        ));
        return;
      }
    }

    setSelectedItems([...selectedItems, {
      id: Math.random().toString(36).substr(2, 9),
      productId: product.id,
      logIds: [],
      name: product.name,
      sku: product.sku,
      description: product.description,
      unit: product.unit || 'PCS',
      quantity: 1
    }]);
  };

  const addLogItem = (log: any) => {
    let parsedRequester = '';
    if (log.remarks?.includes('Req by:')) {
      parsedRequester = log.remarks.split('Req by:')[1]?.trim();
    } else if (log.remarks?.includes('Legacy Quick Pull:')) {
      if (log.remarks.includes('| Req by:')) {
        parsedRequester = log.remarks.split('| Req by:')[1]?.trim();
      } else {
        parsedRequester = log.remarks.split('Legacy Quick Pull:')[1]?.split('(')[0]?.trim();
      }
    } else if (log.remarks?.includes('Issued to ')) {
      parsedRequester = log.remarks.split('Issued to ')[1]?.trim();
    } else if (log.remarks?.includes('Transferred to ')) {
      parsedRequester = log.remarks.split('Transferred to ')[1]?.trim();
    }

    if (transmittalType !== 'EMPLOYEE') {
      const existing = selectedItems.find(item => item.productId === log.product.id);
      if (existing) {
        if (existing.logIds.includes(log.id)) return;
        setSelectedItems(selectedItems.map(item => 
          item.productId === log.product.id 
            ? { ...item, quantity: item.quantity + log.quantity, logIds: [...item.logIds, log.id] } 
            : item
        ));
        
        if (parsedRequester) {
          setHeaderInfo(prev => ({
            ...prev,
            endUser: parsedRequester,
            department: log.location?.name || prev.department
          }));
        }
        return;
      }
    }

    setSelectedItems([...selectedItems, {
      id: Math.random().toString(36).substr(2, 9),
      productId: log.product.id,
      logIds: [log.id],
      name: log.product.name,
      sku: log.product.sku,
      description: log.product.description,
      unit: log.product.unit || 'PCS',
      quantity: log.quantity,
      requestedBy: parsedRequester || 'System Personnel',
      dateRequested: new Date(log.createdAt).toLocaleDateString()
    }]);

    if (parsedRequester) {
      setHeaderInfo(prev => ({
        ...prev,
        endUser: parsedRequester,
        department: log.location?.name || prev.department
      }));
    }
  };

  const addReleaseItem = (rel: any) => {
    const itemId = rel.id;
    if (selectedItems.some(i => i.logIds.includes(itemId))) return;

    // Resolve the real unit from the products list or fallback to rel.unit / 'PCS'
    const foundProduct = products.find(p => 
      p.sku?.toLowerCase() === rel.itemSlug?.toLowerCase() ||
      p.name?.toLowerCase() === rel.productName?.toLowerCase()
    );
    const resolvedUnit = rel.unit || foundProduct?.unit || 'PCS';

    setSelectedItems([...selectedItems, {
      id: Math.random().toString(36).substr(2, 9),
      productId: rel.itemSlug || rel.productName,
      logIds: [itemId],
      name: rel.productName,
      sku: rel.itemSlug || 'N/A',
      description: rel.specs || rel.description || foundProduct?.description,
      unit: resolvedUnit,
      quantity: rel.qty,
      requestedBy: rel.employeeName,
      dateRequested: new Date(rel.date).toLocaleDateString()
    }]);

    // Auto-fill header
    setHeaderInfo(prev => ({
      ...prev,
      endUser: rel.employeeName,
      department: rel.department,
      position: rel.supervisor ? `Supervisor: ${rel.supervisor}` : prev.position
    }));
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

  const savePreset = () => {
    const { date, transmittalNo, ...presetData } = headerInfo;
    localStorage.setItem('transmittal_preset', JSON.stringify(presetData));
    alert('Header Preset Saved! This will be the default for future transmittals.');
  };

  const filteredProducts = products.filter(p => {
    const isSelected = selectedItems.some(item => item.productId === p.id);
    if (isSelected) return false;
    return p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredLogs = logs.filter(log => {
    const isSelectedLog = selectedItems.some(item => item.logIds.includes(log.id));
    if (isSelectedLog) return false;

    const matchesType = log.type === logFilter;
    const matchesSearch = log.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.remarks || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesDate = true;
    if (startDate || endDate) {
      const logDate = new Date(log.createdAt);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (logDate < start) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (logDate > end) matchesDate = false;
      }
    }

    return matchesType && matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Builder Interface (Hidden when printing) */}
      <div className="no-print space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Stock Transmittal Builder</h1>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-2">Create transmittals for stock issuance and movements</p>
          </div>
          <button
            onClick={handlePrint}
            disabled={selectedItems.length === 0}
            className="inline-flex items-center rounded-xl bg-primary px-8 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-primary/20 hover:bg-primary-dark hover:-translate-y-0.5 transition-all active:translate-y-0 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
          >
            <Printer className="mr-3 h-5 w-5" />
            Generate & Print
          </button>
        </div>

        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 w-fit no-print">
          <button 
            onClick={() => { setTransmittalType('MATERIAL'); updateSubject(selectionMode, logFilter, 'MATERIAL'); }} 
            className={`px-8 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${transmittalType === 'MATERIAL' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Material Transmittal
          </button>
          <button 
            onClick={() => { setTransmittalType('EMPLOYEE'); updateSubject(selectionMode, logFilter, 'EMPLOYEE'); }} 
            className={`px-8 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${transmittalType === 'EMPLOYEE' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Employee Receiving
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:sticky lg:top-8">
            <TransmittalHeaderForm 
              headerInfo={headerInfo} 
              setHeaderInfo={setHeaderInfo} 
              savePreset={savePreset} 
            />
          </div>

          <div className="lg:col-span-2 space-y-8">
            <TransmittalItemSelector 
              selectionMode={selectionMode}
              setSelectionMode={setSelectionMode}
              transmittalType={transmittalType}
              setTransmittalType={setTransmittalType}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              logFilter={logFilter}
              setLogFilter={setLogFilter}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              filteredProducts={filteredProducts}
              filteredLogs={filteredLogs}
              pullRequests={pullRequests}
              releases={releases}
              addItem={addItem}
              addLogItem={addLogItem}
              addReleaseItem={addReleaseItem}
              updateSubject={updateSubject}
            />

            <div className="h-[500px]">
              <TransmittalSelectedItems 
                transmittalType={transmittalType}
                selectedItems={selectedItems}
                removeItem={removeItem}
                updateQuantity={updateQuantity}
              />
            </div>
          </div>
        </div>
      </div>

      <PrintableTransmittal 
        headerInfo={headerInfo}
        transmittalType={transmittalType}
        selectedItems={selectedItems}
      />

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 0; }
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
