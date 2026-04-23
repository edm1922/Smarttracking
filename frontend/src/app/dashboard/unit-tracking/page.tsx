'use client';

import { useEffect, useState } from 'react';
import { 
  Boxes, Package, Search, Filter, ArrowRight, 
  ChevronRight, ChevronDown, Activity, History,
  TrendingDown, TrendingUp, AlertTriangle, Box,
  QrCode, Clock, User, ArrowUpRight
} from 'lucide-react';
import api from '@/lib/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

export default function UnitTrackingPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await api.get('/items/unit-inventory');
      setInventory(res.data);
    } catch (err) {
      console.error('Failed to fetch unit inventory', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalStock = inventory.reduce((acc, p) => acc + p.totalQty, 0);
  const totalProducts = inventory.length;
  const totalQRs = inventory.reduce((acc, p) => acc + p.items.length, 0);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-black uppercase tracking-widest text-gray-400">Loading Sub-Inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-2">Unit Tracking Hub</h1>
          <p className="text-gray-500 font-medium">Live sub-inventory of all QR-tracked units and stock levels.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end px-6 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Total Units</span>
            <span className="text-2xl font-black text-gray-900 leading-none">{totalStock.toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-end px-6 py-3 bg-gray-900 rounded-2xl shadow-xl shadow-gray-900/10">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Active QRs</span>
            <span className="text-2xl font-black text-white leading-none">{totalQRs.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search items by product name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-5 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium text-gray-900"
          />
        </div>
        <button className="p-5 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm hover:bg-gray-50 transition-all">
          <Filter className="h-6 w-6 text-gray-400" />
        </button>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredInventory.map((product, idx) => (
          <div 
            key={product.name}
            className="group relative bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden transition-all hover:shadow-2xl hover:shadow-primary/5"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            
            <div className="p-8">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <Box className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">{product.name}</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{product.unit}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className="block text-[10px] font-black text-primary uppercase tracking-widest mb-1">Live Stock</span>
                  <span className="text-3xl font-black text-gray-900 tracking-tighter leading-none">
                    {product.totalQty}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-gray-50 rounded-full overflow-hidden mb-8 border border-gray-100/50">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-1000 ease-out" 
                  style={{ width: `${Math.min(100, (product.totalQty / 100) * 100)}%` }}
                />
              </div>

              {/* Quick Summary */}
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                <div className="flex items-center gap-2">
                  <QrCode className="h-3 w-3" />
                  <span>{product.items.length} Linked QR Codes</span>
                </div>
                <button 
                  onClick={() => setExpandedProduct(expandedProduct === product.name ? null : product.name)}
                  className="flex items-center gap-1 text-primary hover:underline transition-all"
                >
                  View Details {expandedProduct === product.name ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>

              {/* Expanded QR List */}
              {expandedProduct === product.name && (
                <div className="mt-8 pt-8 border-t border-gray-50 space-y-4 animate-in slide-in-from-top-4 duration-300">
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">QR Reference Breakdown</p>
                  <div className="grid grid-cols-1 gap-2">
                    {product.items.map((item: any) => (
                      <div 
                        key={item.slug}
                        className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50 hover:bg-white hover:border-primary/20 transition-all cursor-pointer group/row"
                        onClick={() => window.open(`/i/${item.slug}`, '_blank')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                          <span className="text-sm font-mono font-bold text-gray-700">{item.slug}</span>
                          {item.batch && <span className="px-2 py-0.5 bg-gray-200 text-[9px] font-black rounded-md">{item.batch}</span>}
                        </div>
                        <div className="flex items-center gap-4">
                           <span className="text-sm font-black text-gray-900">{item.qty} <span className="text-[10px] text-gray-400 uppercase">{product.unit}</span></span>
                           <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover/row:text-primary transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredInventory.length === 0 && (
          <div className="col-span-2 py-20 text-center">
            <Boxes className="h-16 w-16 text-gray-200 mx-auto mb-4" />
            <p className="text-xl font-bold text-gray-400 tracking-tight">No unit-tracked products found.</p>
            <p className="text-sm text-gray-400 mt-1">Try a different search term or check your custom fields.</p>
          </div>
        )}
      </div>

      {/* Analytics Hook (Optional Aesthetic) */}
      <div className="bg-gray-900 rounded-[3rem] p-12 text-white overflow-hidden relative">
         <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full -mr-48 -mt-48 blur-[100px]" />
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex-1 space-y-6">
               <div className="inline-flex items-center px-4 py-1.5 bg-white/10 rounded-full text-xs font-black uppercase tracking-widest text-primary border border-white/5">
                 <Activity className="h-3 w-3 mr-2" /> Live Analytics
               </div>
               <h2 className="text-4xl font-black tracking-tighter leading-tight">Unit Flow Intelligence</h2>
               <p className="text-gray-400 font-medium text-lg leading-relaxed max-w-md">Every QR pull-out is automatically synchronized with your central warehouse stock logs. Tracking precision is now at 100% across all distribution channels.</p>
               <div className="flex gap-4">
                  <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
                     <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Peak Activity</p>
                     <p className="text-xl font-black">WAREHOUSE A</p>
                  </div>
                  <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
                     <p className="text-[10px] font-black text-green-400 uppercase tracking-[0.2em] mb-2">Log Sync Status</p>
                     <p className="text-xl font-black">REAL-TIME</p>
                  </div>
               </div>
            </div>
            
            <div className="w-full md:w-[400px] h-[250px] bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-sm">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inventory.slice(0, 5)}>
                     <Bar dataKey="totalQty" radius={[6, 6, 0, 0]}>
                        {inventory.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#60a5fa'} />
                        ))}
                     </Bar>
                     <XAxis dataKey="name" hide />
                     <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        content={({active, payload}) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-gray-800 border border-white/10 p-4 rounded-2xl shadow-2xl">
                                <p className="text-[10px] font-black text-primary uppercase mb-1">{payload[0].payload.name}</p>
                                <p className="text-lg font-black">{payload[0].value} Units</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                     />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>
    </div>
  );
}
