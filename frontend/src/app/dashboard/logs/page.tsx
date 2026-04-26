'use client';

import { useEffect, useState } from 'react';
import { Search, ClipboardList, Clock, User, QrCode, ArrowRight, History } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import api from '@/lib/api';

interface LogEntry {
  id: string;
  action: string;
  changes: any;
  createdAt: string;
  user: {
    username: string;
    role: string;
  };
  item?: {
    slug: string;
    name: string;
  };
}

export default function QRLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [page, setPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const pageSize = 20;
  const debouncedSearch = useDebounce(searchTerm, 300);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * pageSize;
      const response = await api.get('/logs', { params: { skip, take: pageSize, search: debouncedSearch } });
      setLogs(response.data.data);
      setTotalLogs(response.data.total);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const filteredLogs = logs;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR System Logs</h1>
          <p className="text-sm text-gray-500">Audit trail for all QR form submissions and status changes</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-primary/5 px-4 py-2 rounded-lg border border-primary/10">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Total Activities: {totalLogs}</span>
          </div>
        </div>
      </div>

      <div className="relative group">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <Search className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Search by action, user, or QR slug..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full rounded-xl border border-gray-200 bg-white py-4 pl-12 pr-4 text-sm text-gray-900 shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Activity</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Reference</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                      <p className="text-sm text-gray-500 font-medium">Fetching system logs...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-sm text-gray-500">
                    <History className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                    No activity logs found matching your search.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg mr-4 ${
                          log.action.includes('SUBMIT') ? 'bg-green-50 text-green-600' : 
                          log.action.includes('LOCK') ? 'bg-red-50 text-red-600' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          <ClipboardList className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">
                            {log.action.replace(/_/g, ' ')}
                          </div>
                          {log.changes && (
                            <div className="text-[10px] text-gray-400 mt-1 max-w-xs truncate italic">
                              {JSON.stringify(log.changes).substring(0, 50)}...
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {log.item ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-mono font-bold text-primary bg-primary/5 px-2 py-0.5 rounded w-fit uppercase">
                            {log.item.slug}
                          </span>
                          <span className="text-[10px] text-gray-500 mt-1">{log.item.name || 'Untitled Form'}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">System Event</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center">
                        <div className="h-7 w-7 bg-gray-100 rounded-full flex items-center justify-center mr-2">
                          <User className="h-4 w-4 text-gray-400" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900">{log.user.username}</div>
                          <div className="text-[10px] text-gray-400 uppercase tracking-tighter">{log.user.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex flex-col items-end">
                        <div className="text-xs font-bold text-gray-900 flex items-center">
                          <Clock className="h-3 w-3 mr-1 text-gray-400" />
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-white">
          <div className="text-xs font-bold text-gray-500">
            Showing {totalLogs === 0 ? 0 : ((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalLogs)} of {totalLogs} entries
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-black uppercase disabled:opacity-50 hover:bg-gray-50 transition-colors shadow-sm"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * pageSize >= totalLogs}
              className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-black uppercase disabled:opacity-50 hover:bg-gray-50 transition-colors shadow-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
