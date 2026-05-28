import React from 'react';
import { 
  Plus, Search, Filter, Calendar, History, Trash2, 
  Upload, Loader2, X, AlertCircle, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { PayrollRun, PayrollRequest } from './PayrollTypes';

interface PayrollStorageTabProps {
  runs: PayrollRun[];
  loadingRuns: boolean;
  processingBatchIds: string[];
  historySearch: string;
  setHistorySearch: (val: string) => void;
  historyStart: string;
  setHistoryStart: (val: string) => void;
  historyEnd: string;
  setHistoryEnd: (val: string) => void;
  onStop: (id: string) => void;
  onResume: (run: PayrollRun) => void;
  onDelete: (id: string) => void;
  onOpenImport: () => void;
  isStaff: boolean;
  isAdmin: boolean;
  pendingRequests: PayrollRequest[];
  onRespondRequest: (id: string, approved: boolean) => void;
}

export const PayrollStorageTab: React.FC<PayrollStorageTabProps> = ({
  runs,
  loadingRuns,
  processingBatchIds,
  historySearch,
  setHistorySearch,
  historyStart,
  setHistoryStart,
  historyEnd,
  setHistoryEnd,
  onStop,
  onResume,
  onDelete,
  onOpenImport,
  isStaff,
  isAdmin,
  pendingRequests,
  onRespondRequest,
}) => {
  const filteredRuns = runs.filter(run => {
    let matches = true;
    if (historySearch) {
      const label = (run.label || run.client_name || 'Standard Run').toLowerCase();
      matches = matches && label.includes(historySearch.toLowerCase());
    }
    if (historyStart) matches = matches && new Date(run.period_start) >= new Date(historyStart);
    if (historyEnd) matches = matches && new Date(run.period_end) <= new Date(historyEnd);
    return matches;
  });

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Admin Approval Queue */}
      {isAdmin && pendingRequests.length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-100 rounded-[2.5rem] p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-orange-900 uppercase tracking-widest">Administrative Approval Queue</h3>
              <p className="text-[10px] font-bold text-orange-700 uppercase tracking-tighter">Staff members are requesting batch modifications</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequests.map(req => (
              <div key={req.id} className="bg-white border border-orange-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{req.user?.username} • {req.type}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter italic">
                    {req.type === 'UPLOAD' ? `For ${req.clientName}` : `Revoke Batch ${req.batchId}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onRespondRequest(req.id, false)} className="px-4 py-2 text-[10px] font-black text-red-500 hover:bg-red-50 rounded-xl transition-all">Reject</button>
                  <button onClick={() => onRespondRequest(req.id, true)} className="px-4 py-2 text-[10px] font-black bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-100">Approve</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Storage Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Statistics Cards */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 flex items-center gap-6">
            <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <History className="h-8 w-8" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Archived Batches</p>
              <p className="text-3xl font-black text-gray-900">{runs.length}</p>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 flex items-center gap-6">
            <div className="h-16 w-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Disbursements</p>
              <p className="text-3xl font-black text-gray-900">{runs.reduce((acc, r) => acc + (r._count?.documents || 0), 0)}</p>
            </div>
          </div>
          <button 
            onClick={onOpenImport}
            className="bg-primary p-8 rounded-[2rem] shadow-2xl shadow-primary/30 flex items-center gap-6 hover:-translate-y-1 transition-all group"
          >
            <div className="h-16 w-16 bg-white/20 text-white rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:text-primary transition-all">
              <Plus className="h-8 w-8" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">New Ingestion</p>
              <p className="text-xl font-black text-white">Import Payroll</p>
            </div>
          </button>
        </div>

        {/* Filters Section */}
        <div className="lg:col-span-12 flex flex-col md:flex-row items-end gap-6 bg-gray-50/50 p-8 rounded-[2.5rem] border border-gray-100">
          <div className="flex-1 space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Search Archives</label>
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="BY CLIENT OR LABEL..." 
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value.toUpperCase())}
                className="w-full bg-white border-2 border-transparent rounded-2xl pl-14 pr-6 py-4 text-xs font-black text-gray-900 outline-none focus:border-primary transition-all shadow-sm"
              />
            </div>
          </div>
          <div className="w-full md:w-auto space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">From</label>
            <input 
              type="date" 
              value={historyStart}
              onChange={e => setHistoryStart(e.target.value)}
              className="w-full bg-white border-2 border-transparent rounded-2xl px-6 py-4 text-xs font-black text-gray-900 outline-none focus:border-primary transition-all shadow-sm"
            />
          </div>
          <div className="w-full md:w-auto space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">To</label>
            <input 
              type="date" 
              value={historyEnd}
              onChange={e => setHistoryEnd(e.target.value)}
              className="w-full bg-white border-2 border-transparent rounded-2xl px-6 py-4 text-xs font-black text-gray-900 outline-none focus:border-primary transition-all shadow-sm"
            />
          </div>
        </div>

        {/* History Table */}
        <div className="lg:col-span-12 bg-white rounded-[2.5rem] border border-gray-200 shadow-xl shadow-gray-200/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-10 py-6 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Batch Identity</th>
                  <th className="px-10 py-6 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Payroll Period</th>
                  <th className="px-10 py-6 text-right text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Docs</th>
                  <th className="px-10 py-6 text-right text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loadingRuns ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={4} className="px-10 py-8"><div className="h-4 bg-gray-100 rounded-lg w-full"></div></td>
                    </tr>
                  ))
                ) : filteredRuns.length > 0 ? (
                  filteredRuns.map(run => (
                    <tr key={run.id} className="hover:bg-gray-50/50 transition-all group">
                      <td className="px-10 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-900 uppercase tracking-tight">{run.label || run.client_name || 'Standard Run'}</span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mt-1">Ingested {new Date(run.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black text-gray-900">
                            {new Date(run.period_start).toLocaleDateString()} → {new Date(run.period_end).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex flex-col items-end gap-1">
                          {(() => {
                            const totalPagesMatch = run.remark?.match(/\[TOTAL_PAGES:(\d+)\]/);
                            const totalPages = totalPagesMatch ? parseInt(totalPagesMatch[1], 10) : 0;
                            const done = run._count?.documents || 0;
                            return processingBatchIds.includes(run.id) ? (
                              <div className="flex items-center gap-2 group/stop">
                                <Loader2 className="h-3 w-3 animate-spin text-primary group-hover/stop:hidden" />
                                <span className="text-[10px] font-black text-primary group-hover/stop:hidden">
                                  {totalPages ? `${done} / ${totalPages}` : `${done} done`} <span className="animate-pulse uppercase">Syncing...</span>
                                </span>
                                <button 
                                  onClick={() => onStop(run.id)}
                                  className="hidden group-hover/stop:flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1 rounded-xl border border-red-100 hover:bg-red-600 hover:text-white transition-all text-[9px] font-black uppercase"
                                >
                                  Stop
                                </button>
                              </div>
                            ) : (
                              <span className="text-sm font-black text-gray-900">{done}</span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            onClick={() => onResume(run)}
                            className="p-3 bg-gray-50 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-2xl transition-all"
                            title="Resume Import"
                          >
                            <Upload className="h-4 w-4" />
                          </button>
                          {!isStaff && (
                            <button 
                              onClick={() => onDelete(run.id)}
                              className="p-3 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                              title="Revoke Batch"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-10 py-24 text-center">
                      <div className="max-w-xs mx-auto space-y-4">
                        <div className="h-20 w-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mx-auto border-2 border-dashed border-gray-100">
                          <History className="h-8 w-8 text-gray-200" />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">No archived payroll runs found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
