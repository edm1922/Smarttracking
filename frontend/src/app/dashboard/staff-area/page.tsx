'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Users, Search, Box, Clock, User, ClipboardList, Activity, Trash2, AlertTriangle, ShieldAlert, CheckCircle, ArrowRight, Filter, X
} from 'lucide-react';
import api from '@/lib/api';
import { TableSkeleton, PageHeaderSkeleton } from '@/components/ui/LoadingSkeletons';

export default function StaffAreaPage() {
  return (
    <Suspense fallback={<div className="p-10"><PageHeaderSkeleton /></div>}>
      <StaffAreaContent />
    </Suspense>
  );
}

function StaffAreaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get('tab') || 'summary';
  const [activeTab, setActiveTab] = useState<'summary' | 'activities'>(tab as any);
  
  const [activities, setActivities] = useState<any[]>([]);
  const [inventorySummary, setInventorySummary] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailItem, setDetailItem] = useState<any>(null);

  useEffect(() => {
    if (tab && (tab === 'summary' || tab === 'activities')) {
      setActiveTab(tab as any);
    }
  }, [tab]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [actRes, invRes] = await Promise.all([
        api.get('/staff-inventory/admin/activities'),
        api.get('/staff-inventory/admin/inventory')
      ]);
      setActivities(actRes.data);
      setInventorySummary(invRes.data);
    } catch (err) {
      console.error('Failed to fetch staff area data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'MANUAL_ADJUST': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'ITEM_RELEASE': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'BULK_RELEASE': return 'text-indigo-600 bg-indigo-50 border-indigo-100';
      case 'DELETE_ITEM': return 'text-red-600 bg-red-50 border-red-100';
      case 'UPDATE_ITEM': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'PULL_REQUEST': return 'text-purple-600 bg-purple-50 border-purple-100';
      case 'REQUEST_APPROVED': return 'text-green-600 bg-green-50 border-green-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  const filteredActivities = activities.filter(a => 
    a.user?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInventory = inventorySummary.filter(i => 
    i.user?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <Users className="h-5 w-5" />
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight italic uppercase">Staff Area</h1>
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Central Audit & Inventory Monitoring</p>
        </div>

        <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-3xl border border-gray-100">
          <button 
            onClick={() => { setActiveTab('summary'); router.push('/dashboard/staff-area?tab=summary'); }}
            className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'summary' ? 'bg-white text-primary shadow-lg scale-105' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Inventory Summary
          </button>
          <button 
            onClick={() => { setActiveTab('activities'); router.push('/dashboard/staff-area?tab=activities'); }}
            className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'activities' ? 'bg-white text-primary shadow-lg scale-105' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Staff Activities
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-4">
           <div className="relative flex-1 max-w-md group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="text"
                placeholder={activeTab === 'summary' ? "Search staff or products..." : "Search activities, staff, products..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-8 py-5 bg-white border border-gray-100 rounded-3xl text-sm font-bold shadow-xl focus:outline-none focus:border-primary/30 transition-all"
              />
           </div>
           <button onClick={fetchData} className="p-5 bg-white border border-gray-100 rounded-3xl shadow-xl hover:bg-gray-50 transition-all">
             <Clock className="h-5 w-5 text-gray-400" />
           </button>
        </div>

        {activeTab === 'summary' && (
          <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Staff Member</th>
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Specifications</th>
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty</th>
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <TableSkeleton columns={5} rows={5} />
                ) : filteredInventory.length > 0 ? (
                  filteredInventory.map((item) => (
                    <tr 
                      key={item.id} 
                      onDoubleClick={() => setDetailItem(item)}
                      title="Double-click for details"
                      className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 font-black text-xs uppercase">
                            {item.user?.username[0]}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{item.user?.username}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Staff Member</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8 text-sm font-black text-gray-900 uppercase tracking-tight">{item.productName}</td>
                      <td className="px-10 py-8">
                        <p className="text-xs font-bold text-gray-500 max-w-xs truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all">
                          {item.specs}
                        </p>
                      </td>
                      <td className="px-10 py-8 text-center">
                        <span className={`px-4 py-2 rounded-xl text-xs font-black tracking-tight ${item.qty <= (item.threshold || 5) ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-primary/5 text-primary'}`}>
                          {item.qty} {item.unit}
                        </span>
                      </td>
                      <td className="px-10 py-8 text-right text-xs font-bold text-gray-400 uppercase">
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-10 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">No staff inventory found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Timestamp</th>
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Staff</th>
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                  <th className="px-10 py-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <TableSkeleton columns={5} rows={5} />
                ) : filteredActivities.length > 0 ? (
                  filteredActivities.map((act) => (
                    <tr key={act.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-10 py-8 text-xs font-bold text-gray-400 uppercase whitespace-nowrap">
                        {new Date(act.createdAt).toLocaleString()}
                      </td>
                      <td className="px-10 py-8">
                        <span className="text-sm font-black text-gray-900 uppercase tracking-tight">{act.user?.username}</span>
                      </td>
                      <td className="px-10 py-8">
                        <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getActionColor(act.action)}`}>
                          {act.action.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        <p className="text-sm font-bold text-gray-600">{act.description}</p>
                      </td>
                      <td className="px-10 py-8 text-right">
                        {act.productName && (
                          <div className="text-[10px] font-black text-gray-400 uppercase">
                            {act.productName} {act.qty ? `(${act.qty})` : ''}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-10 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">No activities recorded</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="flex items-start justify-between">
                <div className="h-20 w-20 bg-primary/5 rounded-3xl flex items-center justify-center text-primary">
                  <Box className="h-10 w-10" />
                </div>
                <button 
                  onClick={() => setDetailItem(null)}
                  className="p-3 bg-gray-50 text-gray-400 rounded-full hover:bg-red-50 hover:text-red-500 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-4xl font-black text-gray-900 tracking-tight">{detailItem.productName}</h2>
                  {detailItem.qty <= (detailItem.threshold || 5) && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-200 animate-pulse">
                      <AlertTriangle className="h-4 w-4" /> Low Stock Warning
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${detailItem.qty <= (detailItem.threshold || 5) ? 'bg-red-500 text-white' : 'bg-primary text-white'}`}>Available: {detailItem.qty} {detailItem.unit}</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-lg">Last Updated: {new Date(detailItem.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Specifications</h3>
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-sm font-bold text-gray-700 leading-relaxed">{detailItem.specs}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Assigned Staff</h3>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-200 rounded-xl flex items-center justify-center text-gray-600 font-black text-xs uppercase">
                      {detailItem.user?.username[0]}
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{detailItem.user?.username}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col justify-center">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Current Quantity</h3>
                  <p className={`text-xl font-black ${detailItem.qty <= (detailItem.threshold || 5) ? 'text-red-600' : 'text-primary'}`}>{detailItem.qty} {detailItem.unit}</p>
                </div>
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col justify-center">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Restock Threshold</h3>
                  <p className="text-xl font-black text-primary">{detailItem.threshold || 5} {detailItem.unit}</p>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => setDetailItem(null)}
                  className="w-full py-4 border-2 border-gray-100 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
                >
                  Close Detail
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
