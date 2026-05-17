import React from 'react';
import { 
  Search, Calendar, Filter, Truck, ArrowRight, Check, X, 
  Trash2, ClipboardList, Info, Loader2, User, Box, Clock
} from 'lucide-react';

interface UnitTrackingRequisitionProps {
  displayRequests: any[];
  requisitionSubTab: 'pending' | 'history';
  setRequisitionSubTab: (tab: 'pending' | 'history') => void;
  selectedRequestIds: string[];
  toggleRequestSelection: (id: string) => void;
  handleApprove: (id: string) => void;
  handleReject: (id: string) => void;
  handleBulkApprove: () => void;
  handleBulkReject: () => void;
  handleDeleteLog: (id: string) => void;
  processingId: string | null;
  isProcessingApproval: boolean;
  isProcessingRejection: boolean;
  logSearch: string;
  setLogSearch: (val: string) => void;
  dateRange: { start: string, end: string };
  setDateRange: (range: { start: string, end: string }) => void;
}

export const UnitTrackingRequisition: React.FC<UnitTrackingRequisitionProps> = ({
  displayRequests,
  requisitionSubTab,
  setRequisitionSubTab,
  selectedRequestIds,
  toggleRequestSelection,
  handleApprove,
  handleReject,
  handleBulkApprove,
  handleBulkReject,
  handleDeleteLog,
  processingId,
  isProcessingApproval,
  isProcessingRejection,
  logSearch,
  setLogSearch,
  dateRange,
  setDateRange,
}) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Filters & Actions Bar */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-xl shadow-gray-200/50 flex flex-col md:flex-row items-end gap-6 no-print">
        <div className="flex bg-gray-100 p-1 rounded-2xl shadow-inner">
          <button
            onClick={() => setRequisitionSubTab('pending')}
            className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              requisitionSubTab === 'pending' 
              ? 'bg-white text-primary shadow-lg shadow-gray-200' 
              : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Pending Queue
          </button>
          <button
            onClick={() => setRequisitionSubTab('history')}
            className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              requisitionSubTab === 'history' 
              ? 'bg-white text-primary shadow-lg shadow-gray-200' 
              : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Request History
          </button>
        </div>

        <div className="flex-1 space-y-3">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
            <Search className="h-3 w-3" /> Audit Search
          </label>
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="SEARCH BY ASSET OR PERSONNEL..." 
              value={logSearch}
              onChange={e => setLogSearch(e.target.value.toUpperCase())}
              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl pl-12 pr-6 py-4 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Calendar className="h-3 w-3" /> Range Start
            </label>
            <input 
              type="date" 
              value={dateRange.start}
              onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all shadow-sm"
            />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Calendar className="h-3 w-3" /> Range End
            </label>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (Float) */}
      {selectedRequestIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[90] animate-in slide-in-from-bottom-10">
          <div className="bg-gray-900 px-10 py-5 rounded-full shadow-2xl flex items-center gap-8 border border-gray-800">
            <div className="flex items-center gap-4 border-r border-gray-800 pr-8">
              <div className="h-10 w-10 bg-primary text-white rounded-xl flex items-center justify-center">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none mb-1">Batch Operations</p>
                <p className="text-sm font-black text-primary leading-none">{selectedRequestIds.length} Selections</p>
              </div>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={handleBulkReject}
                className="px-8 py-3 bg-red-500/10 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
              >
                Deny Requests
              </button>
              <button 
                onClick={handleBulkApprove}
                className="px-8 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all"
              >
                Approve & Sync
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requests Table */}
      <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-10 py-6 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] w-12">
                  <input 
                    type="checkbox" 
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary transition-all"
                    checked={selectedRequestIds.length > 0 && selectedRequestIds.length === displayRequests.length}
                    onChange={() => {}} // Handle bulk select all if needed
                  />
                </th>
                <th className="px-10 py-6 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Personnel & Dept</th>
                <th className="px-10 py-6 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Asset Configuration</th>
                <th className="px-10 py-6 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Qty</th>
                <th className="px-10 py-6 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-10 py-6 text-right text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Workflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayRequests.map(req => (
                <tr key={req.id} className="hover:bg-gray-50/50 transition-all group">
                  <td className="px-10 py-6">
                    <input 
                      type="checkbox" 
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary transition-all"
                      checked={selectedRequestIds.includes(req.id)}
                      onChange={() => toggleRequestSelection(req.id)}
                    />
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-900 uppercase tracking-tight">{req.user.username}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mt-1 italic">{req.user.role || 'Staff Member'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-gray-900 uppercase tracking-tight line-clamp-1">{req.item.name}</span>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        <span className="text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10 uppercase tracking-tighter">{req.item.slug}</span>
                        {req.item.fieldValues?.slice(0, 2).map((fv: any, idx: number) => {
                          const val = fv.value;
                          const displayVal = val && typeof val === 'object' ? (val.main ?? val.qty) : val;
                          if (!displayVal) return null;
                          return (
                            <span key={fv.id ?? `fv-${req.id}-${idx}`} className="text-[8px] font-black text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">{fv.name}: {displayVal}</span>
                          );
                        })}
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-gray-900">{req.qty}</span>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{req.item.product?.unit || req.item.unit || 'PCS'}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${
                        req.status === 'SUBMITTED' ? 'bg-orange-500' : 
                        req.status === 'APPROVED' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        req.status === 'SUBMITTED' ? 'text-orange-500' : 
                        req.status === 'APPROVED' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right no-print">
                    <div className="flex items-center justify-end gap-3">
                      {req.status === 'SUBMITTED' ? (
                        <>
                          <button 
                            disabled={processingId === req.id}
                            onClick={() => handleReject(req.id)}
                            className="p-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all"
                            title="Reject"
                          >
                            {processingId === req.id && isProcessingRejection ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                          </button>
                          <button 
                            disabled={processingId === req.id}
                            onClick={() => handleApprove(req.id)}
                            className="p-3 bg-green-50 text-green-500 hover:bg-green-500 hover:text-white rounded-2xl transition-all shadow-lg shadow-green-100"
                            title="Approve"
                          >
                            {processingId === req.id && isProcessingApproval ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2 mr-4">
                            <Clock className="h-3 w-3" /> {new Date(req.createdAt).toLocaleDateString()}
                          </div>
                          <button 
                            onClick={() => handleDeleteLog(req.id)}
                            className="p-3 bg-gray-50 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                            title="Delete Log"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {displayRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-10 py-32 text-center">
                    <div className="max-w-xs mx-auto space-y-6 opacity-30">
                      <div className="h-24 w-24 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200 flex items-center justify-center mx-auto">
                        <Truck className="h-10 w-10 text-gray-300" />
                      </div>
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] italic">Queue is currently clear</p>
                    </div>
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
