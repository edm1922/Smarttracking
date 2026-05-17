import React from 'react';
import { 
  Package, Search, Plus, Filter, Calendar, 
  Activity, ArrowUpRight, ChevronRight, Info, History
} from 'lucide-react';

interface UnitReqInventoryTabProps {
  staffInventory: any[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  getAggregatedAudit: () => any[];
  getUnifiedLogs: () => any[];
  setDetailItem: (item: any) => void;
  handleManualStockAdd: () => void;
  isAuditLoading: boolean;
}

export const UnitReqInventoryTab: React.FC<UnitReqInventoryTabProps> = ({
  staffInventory,
  searchTerm,
  setSearchTerm,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  getAggregatedAudit,
  getUnifiedLogs,
  setDetailItem,
  handleManualStockAdd,
  isAuditLoading,
}) => {
  const auditSummary = getAggregatedAudit();
  const unifiedLogs = getUnifiedLogs();

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Inventory Dashboard Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Active Stock */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden flex flex-col">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Active Inventory</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Currently held items and units</p>
                </div>
              </div>
              <button 
                onClick={handleManualStockAdd}
                className="px-5 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-gray-900/20 hover:bg-black hover:-translate-y-1 transition-all"
              >
                + Manual Add Stock
              </button>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Item Description</th>
                    <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Specifications</th>
                    <th className="px-8 py-5 text-center text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Held Qty</th>
                    <th className="px-8 py-5 text-right text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {staffInventory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-primary/40 group-hover:bg-primary transition-colors"></div>
                          <span className="text-xs font-black text-gray-900 uppercase tracking-tight">{item.productName}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200/50">{item.specs || 'General Stock'}</span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={`text-sm font-black ${item.qty <= (item.threshold || 0) ? 'text-red-500' : 'text-primary'}`}>
                          {item.qty} {item.unit}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => setDetailItem(item)}
                          className="px-4 py-2 bg-white border border-gray-100 text-gray-400 hover:text-primary hover:border-primary/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                  {staffInventory.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center space-y-4">
                        <div className="h-16 w-16 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto text-gray-200">
                          <Package className="h-8 w-8" />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No items in your active inventory</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Quick Stats & Period Audit */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl shadow-gray-200/50 p-8 space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center">
                <Activity className="mr-3 h-5 w-5 text-primary" />
                Audit Trail
              </h3>
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Period Start</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-transparent rounded-2xl pl-12 pr-6 py-4 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Period End</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-transparent rounded-2xl pl-12 pr-6 py-4 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-50 space-y-6">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Movement in Period</p>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {auditSummary.map((item, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-2xl space-y-3 hover:bg-gray-100/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-tight line-clamp-1">{item.productName}</h4>
                      <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/10">
                        +{item.qty} {item.unit}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter line-clamp-1 pr-4">{item.specs}</span>
                      <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest whitespace-nowrap">Held: {item.currentStock}</span>
                    </div>
                  </div>
                ))}
                {auditSummary.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest italic">No movement recorded</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Activity Logs */}
      <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center gap-4">
          <div className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Universal Activity Log</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Full transaction history for your account</p>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Transaction Date</th>
                <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Type</th>
                <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Product / Details</th>
                <th className="px-8 py-5 text-center text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Change</th>
                <th className="px-8 py-5 text-right text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {unifiedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-gray-900 leading-none">
                        {new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase mt-1">
                        {new Date(log.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`text-[9px] font-black uppercase tracking-[0.1em] px-2.5 py-1 rounded-lg border ${
                      log.type === 'REQUEST' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'
                    }`}>
                      {log.type}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      {log.imageUrl && (
                        <div className="h-10 w-10 rounded-xl bg-gray-100 overflow-hidden border border-gray-200">
                          <img src={log.imageUrl} className="w-full h-full object-cover" alt="QR" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-black text-gray-900 uppercase tracking-tight leading-none mb-1.5">{log.name}</p>
                        <p className="text-[10px] font-mono font-bold text-gray-400 tracking-tighter uppercase">{log.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="text-xs font-black text-gray-900">
                      {log.qty > 0 ? `+${log.qty}` : log.qty} {log.unit}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${
                      ['APPROVED', 'RELEASED', 'ITEM_RELEASE'].includes(log.status) ? 'bg-green-100 text-green-700' :
                      log.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                      log.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {log.status === 'ITEM_RELEASE' ? 'RELEASED' : log.status}
                    </span>
                  </td>
                </tr>
              ))}
              {unifiedLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center space-y-4">
                    <div className="h-16 w-16 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto text-gray-200">
                      <History className="h-8 w-8" />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No transaction logs available</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
