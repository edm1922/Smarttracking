'use client';

import { useEffect, useState } from 'react';
import {
  Printer, Plus, Trash2, Search, Box,
  User, Calendar, MapPin, Building2, FileText, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  stocks: { quantity: number; location: { name: string } }[];
}

interface TransmittalItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  quantity: number;
}

export default function ProductTransmittalPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectionMode, setSelectionMode] = useState<'PRODUCT' | 'LOG'>('PRODUCT');
  const [logs, setLogs] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState<'IN' | 'OUT'>('OUT');
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
    sourceSupplier: '',
    subject: 'Material Transmittal',
    subTitle: 'Enterprise Logistics & Supply Chain Tracking',
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

  useEffect(() => {
    setHeaderInfo(prev => ({
      ...prev,
      transmittalNo: prev.transmittalNo || `TR-${Date.now().toString().slice(-6)}`,
      date: prev.date || new Date().toLocaleDateString('en-CA'),
      from: localStorage.getItem('username') || ''
    }));

    const fetchProducts = async () => {
      try {
        const res = await api.get('/products');
        setProducts(res.data);

        // Load pending items from multi-select
        const pending = localStorage.getItem('pending_transmittal');
        if (pending) {
          const items = JSON.parse(pending);
          setSelectedItems(items.map((p: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            productId: p.id,
            name: p.name,
            sku: p.sku,
            quantity: 1
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
        const res = await api.get('/products/logs');
        setLogs(res.data);
      } catch (err) {
        console.error('Failed to fetch logs', err);
      }
    };
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

    fetchProducts();
    fetchLogs();
    loadPreset();
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const addItem = (product: Product) => {
    if (selectedItems.find(item => item.productId === product.id)) return;
    setSelectedItems([...selectedItems, {
      id: Math.random().toString(36).substr(2, 9),
      productId: product.id,
      name: product.name,
      sku: product.sku,
      quantity: 1
    }]);
  };

  const addLogItem = (log: any) => {
    setSelectedItems([...selectedItems, {
      id: Math.random().toString(36).substr(2, 9),
      productId: log.product.id,
      name: log.product.name,
      sku: log.product.sku,
      quantity: log.quantity
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

  const savePreset = () => {
    const { date, transmittalNo, ...presetData } = headerInfo;
    localStorage.setItem('transmittal_preset', JSON.stringify(presetData));
    alert('Header Preset Saved!');
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLogs = logs.filter(log =>
    log.type === logFilter &&
    (log.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.remarks || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      {/* Builder Interface (Hidden when printing) */}
      <div className="no-print space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Product Transmittal Builder</h1>
            <p className="text-sm text-gray-500">Create transmittals for stock issuance and movements</p>
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
          <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
              <FileText className="mr-2 h-4 w-4" />
              Header Details
            </h3>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Date</label>
              <input type="date" value={headerInfo.date || ''} onChange={e => setHeaderInfo({ ...headerInfo, date: e.target.value })} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Department</label>
              <input type="text" value={headerInfo.department || ''} onChange={e => setHeaderInfo({ ...headerInfo, department: e.target.value })} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1" placeholder="e.g. INVENTORY" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">End-User / Recipient</label>
              <input type="text" value={headerInfo.endUser || ''} onChange={e => setHeaderInfo({ ...headerInfo, endUser: e.target.value })} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1" placeholder="Name" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Position</label>
              <input type="text" value={headerInfo.position || ''} onChange={e => setHeaderInfo({ ...headerInfo, position: e.target.value })} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1" placeholder="Job Title" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Source / Supplier</label>
              <input type="text" value={headerInfo.sourceSupplier || ''} onChange={e => setHeaderInfo({ ...headerInfo, sourceSupplier: e.target.value })} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1" placeholder="Vendor" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Subject</label>
              <input type="text" value={headerInfo.subject || ''} onChange={e => setHeaderInfo({ ...headerInfo, subject: e.target.value })} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1" />
            </div>

            <div className="pt-4">
              <button 
                onClick={savePreset}
                className="w-full flex items-center justify-center space-x-2 py-2 rounded-lg border-2 border-dashed border-gray-200 text-gray-400 hover:border-primary hover:text-primary transition-all text-[10px] font-black uppercase"
              >
                <Box className="h-3 w-3" />
                <span>Save Header Preset</span>
              </button>
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-3">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Signatories</h4>
              <div className="space-y-4">
                {['preparedBy', 'checkedBy', 'receivedBy', 'approvedBy'].map(field => {
                  const showField = field === 'preparedBy' ? 'showPrepared' : 
                                  field === 'checkedBy' ? 'showChecked' :
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
          </div>

          {/* Item Selection */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
                  <Box className="mr-2 h-4 w-4" />
                  Select Items
                </h3>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button onClick={() => setSelectionMode('PRODUCT')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${selectionMode === 'PRODUCT' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}>Products</button>
                  <button onClick={() => setSelectionMode('LOG')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${selectionMode === 'LOG' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}>Stock History</button>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search items or SKU..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2 text-sm outline-none focus:ring-1"
                  />
                </div>
                {selectionMode === 'LOG' && (
                  <select value={logFilter} onChange={e => setLogFilter(e.target.value as 'IN' | 'OUT')} className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1 bg-white">
                    <option value="OUT">Stock OUT</option>
                    <option value="IN">Stock IN</option>
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2">
                {selectionMode === 'PRODUCT' ? (
                  filteredProducts.map(product => (
                    <button key={product.id} onClick={() => addItem(product)} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-primary/5 hover:border-primary/20 transition-all text-left">
                      <div>
                        <div className="text-xs font-bold text-gray-900">{product.name}</div>
                        <div className="text-[10px] font-mono text-gray-500">{product.sku}</div>
                        {product.description && <div className="text-[10px] text-gray-400 italic mt-0.5 line-clamp-1">{product.description}</div>}
                      </div>
                      <Plus className="h-4 w-4 text-gray-400" />
                    </button>
                  ))
                ) : (
                  filteredLogs.map(log => (
                    <button key={log.id} onClick={() => addLogItem(log)} className="flex flex-col p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-primary/5 hover:border-primary/20 transition-all text-left">
                      <div className="flex items-center justify-between w-full mb-1">
                        <div className="text-xs font-bold text-gray-900">{log.product.name}</div>
                        <div className="text-[10px] font-black text-primary bg-primary/10 px-1.5 rounded">{log.quantity}</div>
                      </div>
                      <div className="text-[10px] text-gray-500 italic line-clamp-1">{log.remarks || 'No remarks'}</div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Selected Items Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Selected Items for Transmittal</h3>
                <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-full">{selectedItems.length} items</span>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Product</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quantity</th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedItems.map(item => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{item.name}</div>
                        <div className="text-[10px] font-mono text-gray-500">{item.sku}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input type="number" value={isNaN(item.quantity) ? '' : item.quantity} onChange={e => updateQuantity(item.id, parseInt(e.target.value) || 0)} className="w-20 rounded border border-gray-200 px-3 py-1 text-sm outline-none focus:ring-1" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {selectedItems.length === 0 && (
                    <tr><td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-400 italic">No products selected.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Form */}
      <div className="hidden print:block bg-white p-12 text-gray-900 min-h-screen">
        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-8 mb-12">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 mb-1">Material Transmittal</h1>
            <p className="text-sm font-bold text-gray-500">{headerInfo.subTitle}</p>
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
            <div><div className="text-[10px] font-black text-gray-400 uppercase mb-1">Source / Supplier:</div><div className="text-base font-bold border-b border-gray-200 pb-1">{headerInfo.sourceSupplier || '____________________'}</div></div>
            <div><div className="text-[10px] font-black text-gray-400 uppercase mb-1">Subject:</div><div className="text-base font-bold border-b border-gray-200 pb-1">{headerInfo.subject}</div></div>
          </div>
        </div>

        <table className="w-full border-collapse mb-8">
          <thead>
            <tr className="border-y-2 border-gray-900 bg-gray-50">
              <th className="py-2 px-4 text-left text-[10px] font-black uppercase tracking-widest w-12">No.</th>
              <th className="py-2 px-4 text-left text-[10px] font-black uppercase tracking-widest">Description</th>
              <th className="py-2 px-4 text-left text-[10px] font-black uppercase tracking-widest w-20">Qty</th>
              <th className="py-2 px-4 text-left text-[10px] font-black uppercase tracking-widest">Part No. / SKU</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {selectedItems.map((item, idx) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-2 px-4 text-[10px] font-bold">{idx + 1}</td>
                <td className="py-2 px-4 text-[10px] font-bold">{item.name}</td>
                <td className="py-2 px-4 text-[10px] font-black">{item.quantity} PCS</td>
                <td className="py-2 px-4 text-[10px] font-mono">{item.sku || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid grid-cols-2 gap-x-24 gap-y-12 pt-12">
          {['preparedBy', 'checkedBy', 'receivedBy', 'approvedBy'].filter(field => {
            const showField = field === 'preparedBy' ? 'showPrepared' : 
                            field === 'checkedBy' ? 'showChecked' :
                            field === 'receivedBy' ? 'showReceived' : 'showApproved';
            return (headerInfo as any)[showField];
          }).map(field => (
            <div key={field} className="flex flex-col items-center">
              <div className="w-full text-[10px] font-black text-gray-400 uppercase mb-8">{field.replace(/By$/, ' By')}:</div>
              <div className="text-[10px] font-black mb-1 uppercase text-center">{(headerInfo as any)[field] || '____________________'}</div>
              <div className="border-b-2 border-gray-900 w-full mb-2"></div>
              <div className="text-center text-[10px] font-bold text-gray-500 uppercase italic">Signature / Date</div>
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
