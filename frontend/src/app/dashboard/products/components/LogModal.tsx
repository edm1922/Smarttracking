'use client';

import { X, Search, MapPin } from 'lucide-react';

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  logs: any[];
  isSearching: boolean;
  onLogDoubleClick: (log: any) => void;
}

export function LogModal({
  isOpen,
  onClose,
  searchTerm,
  setSearchTerm,
  logs,
  isSearching,
  onLogDoubleClick
}: LogModalProps) {
  if (!isOpen) return null;

  const filteredLogs = logs; // Filtering is handled in parent via API or local state

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Stock Transaction History"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div className="w-full max-w-4xl max-h-[80vh] rounded-xl bg-white p-8 shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Stock Transaction History</h2>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search logs..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-md border border-gray-300 pl-9 pr-3 py-1.5 text-xs outline-none focus:border-primary"
                aria-label="Search transaction logs"
              />
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-900" aria-label="Close log history"><X className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto pr-2">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Area</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User / Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isSearching ? (
                <tr>
                  <td colSpan={6} className="px-4 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                      <p className="text-sm text-gray-500 font-bold italic">Searching history...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr 
                    key={log.id} 
                    className="text-sm hover:bg-gray-50 cursor-pointer select-none transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
                    onDoubleClick={() => onLogDoubleClick(log)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onLogDoubleClick(log); } }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Edit log entry for ${log.product?.name || 'Unknown'}`}
                    title="Double click to edit/delete log"
                  >
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      <div>{log.product.name}</div>
                      {log.product.description && (
                        <div className="text-xs text-gray-500 italic font-medium">{log.product.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center text-xs text-gray-600">
                        <MapPin className="h-3 w-3 mr-1" /> {log.location.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${log.type === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold">{log.quantity}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-600 text-xs font-bold">{log.user?.username}</div>
                      <div className="text-xs text-gray-500 italic line-clamp-1">{log.remarks || 'No remarks'}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-20 text-center text-gray-500 italic">
                    No transactions found matching "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
