'use client';

import { useEffect, useState } from 'react';
import { 
  Printer as PrinterIcon, ArrowLeft, Plus, Minus, 
  Trash2, Search, QrCode, ClipboardList, CheckCircle2,
  ListPlus, LayoutGrid, X
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { QRCodeSVG } from 'qrcode.react';

interface Item {
  id: string;
  slug: string;
  name: string | null;
}

interface QueuedItem {
  item: Item;
  quantity: number;
}

export default function PrintPage() {
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [printQueue, setPrintQueue] = useState<QueuedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await api.get('/items');
        setAvailableItems(response.data);
      } catch (err) {
        console.error('Failed to fetch items', err);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const addToQueue = (item: Item) => {
    setPrintQueue(prev => {
      const existing = prev.find(q => q.item.id === item.id);
      if (existing) {
        return prev.map(q => q.item.id === item.id ? { ...q, quantity: q.quantity + 1 } : q);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setPrintQueue(prev => prev.map(q => {
      if (q.item.id === itemId) {
        const newQty = Math.max(1, q.quantity + delta);
        return { ...q, quantity: newQty };
      }
      return q;
    }));
  };

  const removeFromQueue = (itemId: string) => {
    setPrintQueue(prev => prev.filter(q => q.item.id !== itemId));
  };

  const addAll = () => {
    const newItems = availableItems.filter(ai => !printQueue.some(q => q.item.id === ai.id));
    setPrintQueue(prev => [...prev, ...newItems.map(item => ({ item, quantity: 1 }))]);
  };

  const clearQueue = () => setPrintQueue([]);

  const handlePrint = () => {
    window.print();
  };

  const filteredAvailable = availableItems.filter(item => 
    item.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  // Flatten queue for printing
  const printFlattened = printQueue.flatMap(q => 
    Array.from({ length: q.quantity }, () => q.item)
  );

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse font-bold">Initializing Label Engine...</div>;

  return (
    <div className="space-y-8 min-h-screen">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Print Label Center</h1>
          <p className="text-sm text-gray-500 font-medium">Select assets and define quantities for bulk printing</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/dashboard/items"
            className="inline-flex items-center rounded-2xl bg-white border border-gray-200 px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-all"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
          <button
            onClick={handlePrint}
            disabled={printQueue.length === 0}
            className="inline-flex items-center rounded-2xl bg-primary px-8 py-2.5 text-sm font-bold text-white shadow-xl shadow-primary/30 hover:bg-primary-dark transition-all disabled:opacity-50 active:scale-95"
          >
            <PrinterIcon className="mr-2 h-4 w-4" />
            Launch Print Wizard
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 no-print">
        {/* Selection Area */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-[2rem] border border-gray-200 p-8 shadow-sm h-[600px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-gray-900 flex items-center tracking-tight">
                <LayoutGrid className="mr-2 h-5 w-5 text-primary" />
                Select QR Assets
              </h3>
              <button 
                onClick={addAll}
                className="text-xs font-bold text-primary hover:underline uppercase tracking-widest"
              >
                Add All Items
              </button>
            </div>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search slug or name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-200">
              {filteredAvailable.map(item => {
                const inQueue = printQueue.find(q => q.item.id === item.id);
                return (
                  <div key={item.id} className="group flex items-center justify-between p-4 rounded-2xl hover:bg-primary/5 border border-transparent hover:border-primary/10 transition-all">
                    <div className="flex items-center space-x-3">
                      <div className="bg-white p-2 rounded-lg border border-gray-100">
                        <QrCode className="h-4 w-4 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900 font-mono tracking-tighter uppercase">{item.slug}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase truncate max-w-[150px]">{item.name || 'No Name'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => addToQueue(item)}
                      className={`p-2 rounded-xl transition-all ${inQueue ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400 group-hover:bg-primary group-hover:text-white'}`}
                    >
                      {inQueue ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Print Queue Area */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-[2rem] border border-gray-200 p-8 shadow-sm h-[600px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-gray-900 flex items-center tracking-tight">
                <ClipboardList className="mr-2 h-5 w-5 text-primary" />
                Print Queue
                <span className="ml-3 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase">
                  {printFlattened.length} Labels Total
                </span>
              </h3>
              <button 
                onClick={clearQueue}
                className="text-xs font-bold text-red-500 hover:underline uppercase tracking-widest"
              >
                Clear Queue
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {printQueue.map(q => (
                <div key={q.item.id} className="flex items-center justify-between p-5 rounded-2xl bg-gray-50 border border-gray-100 animate-in slide-in-from-right-4">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center border border-gray-200">
                      <QRCodeSVG value={q.item.slug} size={32} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 uppercase font-mono">{q.item.slug}</p>
                      <p className="text-xs text-gray-400 font-bold uppercase">{q.item.name || 'Untitled'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
                      <button onClick={() => updateQuantity(q.item.id, -1)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-4 text-sm font-black text-gray-900 min-w-[30px] text-center">
                        {q.quantity}
                      </span>
                      <button onClick={() => updateQuantity(q.item.id, 1)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromQueue(q.item.id)}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
              {printQueue.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-30">
                  <PrinterIcon className="h-12 w-12 text-gray-400" />
                  <p className="text-sm font-bold uppercase tracking-widest text-gray-400">Queue is empty. Select items to start.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print Preview Grid */}
      <div className="bg-white rounded-[2rem] border border-gray-200 p-12 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 no-print">
          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">A4 Preview Mode</span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {printFlattened.map((item, index) => (
            <div 
              key={`${item.id}-${index}`} 
              className="flex flex-col items-center justify-center p-6 border border-gray-100 rounded-3xl bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              style={{ pageBreakInside: 'avoid' }}
            >
              <QRCodeSVG 
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/i/${item.slug}`}
                size={140}
                level="M"
                includeMargin={false}
              />
              <div className="mt-4 flex flex-col items-center">
                <span className="text-[10px] font-mono font-black text-primary uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full">
                  {item.slug}
                </span>
                {item.name && (
                  <span className="mt-2 text-[8px] font-bold text-gray-400 uppercase truncate w-full text-center max-w-[120px]">
                    {item.name}
                  </span>
                )}
              </div>
              <div className="absolute top-0 right-0 h-10 w-10 opacity-5">
                <QrCode className="h-full w-full rotate-12" />
              </div>
            </div>
          ))}
          
          {printQueue.length === 0 && (
            <div className="col-span-full py-32 text-center">
              <div className="max-w-xs mx-auto border-2 border-dashed border-gray-100 rounded-[3rem] p-10">
                <LayoutGrid className="h-12 w-12 text-gray-100 mx-auto mb-4" />
                <p className="text-xs font-black text-gray-200 uppercase tracking-widest leading-loose">
                  Select assets above to generate the printable A4 grid layout
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .pl-64 { padding-left: 0 !important; }
          main { padding: 0 !important; margin: 0 !important; }
          .max-w-7xl { max-width: none !important; width: 100% !important; }
          .bg-gray-50, body { background-color: white !important; }
          .rounded-[2rem], .shadow-sm, .border { border: none !important; box-shadow: none !important; border-radius: 0 !important; }
          .grid { 
            gap: 0.5cm !important; 
            grid-template-columns: repeat(4, 1fr) !important;
            padding: 0 !important;
          }
          .p-12 { padding: 0 !important; }
          .flex-col { 
            border: 0.5pt solid #eee !important; 
            padding: 10pt !important;
            margin-bottom: 0.5cm !important;
          }
        }
      `}</style>
    </div>
  );
}
