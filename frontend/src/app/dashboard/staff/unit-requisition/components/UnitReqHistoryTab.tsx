import { Clock, ClipboardList, CheckCircle, X, Trash2, ArrowUpRight, Search, History, Package } from 'lucide-react';

interface UnitReqHistoryTabProps {
  historySubTab: 'pending' | 'all';
  setHistorySubTab: (tab: 'pending' | 'all') => void;
  myRequests: any[];
  handleDeleteRequest: (id: string) => void;
  page: number;
  setPage: (page: number) => void;
  totalRequests: number;
  pageSize: number;
  isRefreshing: boolean;
}

export const UnitReqHistoryTab: React.FC<UnitReqHistoryTabProps> = ({
  historySubTab,
  setHistorySubTab,
  myRequests,
  handleDeleteRequest,
  page,
  setPage,
  totalRequests,
  pageSize,
  isRefreshing,
}) => {
  const filteredRequests = historySubTab === 'pending' 
    ? myRequests.filter(r => r.status === 'PENDING') 
    : myRequests;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 w-fit">
          <button 
            onClick={() => setHistorySubTab('pending')}
            className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${historySubTab === 'pending' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Clock className="h-3.5 w-3.5" />
            Pending Approval ({myRequests.filter(r => r.status === 'PENDING').length})
          </button>
          <button 
            onClick={() => setHistorySubTab('all')}
            className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${historySubTab === 'all' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            All History
          </button>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Showing {filteredRequests.length} of {totalRequests} records
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRequests.map((req) => (
          <div key={req.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden flex flex-col group hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all">
            <div className="p-6 space-y-6 flex-1">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm ${
                    req.status === 'APPROVED' ? 'bg-green-50 text-green-600' :
                    req.status === 'REJECTED' ? 'bg-red-50 text-red-600' :
                    req.status === 'RELEASED' ? 'bg-blue-50 text-blue-600' :
                    'bg-orange-50 text-orange-600'
                  }`}>
                    {req.status === 'APPROVED' ? <CheckCircle className="h-7 w-7" /> :
                     req.status === 'REJECTED' ? <X className="h-7 w-7" /> :
                     req.status === 'RELEASED' ? <Package className="h-7 w-7" /> :
                     <Clock className="h-7 w-7" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest leading-none mb-1">{req.item?.name || 'Manual Item'}</h4>
                    <p className="text-[10px] font-mono font-bold text-gray-400 tracking-tighter">{req.item?.slug || 'N/A'}</p>
                  </div>
                </div>
                <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                  req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                  req.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                  req.status === 'RELEASED' ? 'bg-blue-100 text-blue-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {req.status}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Quantity</p>
                  <p className="text-sm font-black text-gray-900">{req.qty} {req.unit}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Date</p>
                  <p className="text-sm font-black text-gray-900">
                    {new Date(req.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>

              {req.remarks && (
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Remarks</p>
                  <p className="text-xs text-gray-600 font-medium italic line-clamp-2">"{req.remarks}"</p>
                </div>
              )}

              {req.adminRemarks && (
                <div className="p-4 bg-gray-50 rounded-2xl space-y-1">
                  <p className="text-[9px] font-black text-primary uppercase tracking-widest">Admin Note</p>
                  <p className="text-xs text-gray-900 font-bold leading-relaxed">{req.adminRemarks}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50/50 flex items-center justify-between border-t border-gray-50">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                ID: {req.id.slice(-6).toUpperCase()}
              </span>
              {req.status === 'PENDING' && (
                <button 
                  onClick={() => handleDeleteRequest(req.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-red-500 border border-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Cancel
                </button>
              )}
              {(req.status === 'APPROVED' || req.status === 'RELEASED') && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Verified</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredRequests.length === 0 && (
          <div className="col-span-full py-40 text-center space-y-6">
            <div className="h-24 w-24 bg-gray-50 rounded-[3rem] flex items-center justify-center mx-auto border-2 border-dashed border-gray-200">
              <History className="h-10 w-10 text-gray-200" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-black text-gray-400 uppercase tracking-widest">No history found</p>
              <p className="text-xs font-bold text-gray-300 uppercase tracking-tighter italic">Your request history will appear here once submitted</p>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalRequests > pageSize && (
        <div className="flex justify-center pt-8">
          <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/50">
            {Array.from({ length: Math.ceil(totalRequests / pageSize) }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`h-10 w-10 rounded-xl text-xs font-black transition-all ${
                  page === i + 1 ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
