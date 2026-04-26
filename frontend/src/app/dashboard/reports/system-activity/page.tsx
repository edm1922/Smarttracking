'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Printer, Activity, Package, User, History } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

export default function SystemActivityReportPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get('/reports/analytics');
        setData(response.data);
      } catch (error) {
        console.error('Failed to fetch analytics', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 no-print-bg">
      {/* Non-printable Header Actions */}
      <div className="no-print mx-auto max-w-4xl px-8 py-8 flex items-center justify-between">
        <Link 
          href="/dashboard"
          className="inline-flex items-center rounded-xl bg-white border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-all"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
        
        <button
          onClick={handlePrint}
          className="inline-flex items-center rounded-xl bg-primary px-6 py-2 text-sm font-bold text-white shadow-md hover:bg-primary/90 transition-all"
        >
          <Printer className="mr-2 h-4 w-4" /> Print Report
        </button>
      </div>

      {/* Printable Report Container (A4 styling) */}
      <div className="print-container mx-auto max-w-4xl bg-white p-12 shadow-sm rounded-xl border border-gray-200">
        
        {/* Report Header */}
        <div className="border-b-2 border-gray-900 pb-6 mb-8 text-center">
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-widest">Smart Tracking System</h1>
          <h2 className="text-lg font-bold text-gray-600 uppercase mt-2">System Activity & Stock Report</h2>
          <p className="text-xs font-bold text-gray-400 mt-2">Generated on: {new Date().toLocaleString()}</p>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-12">
          {/* Top Consumed Stock */}
          <div>
            <div className="flex items-center mb-4 border-b border-gray-200 pb-2">
              <Package className="h-5 w-5 mr-2 text-gray-700" />
              <h3 className="text-sm font-black text-gray-900 uppercase">Top Consumed Stock</h3>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 text-[10px] font-black text-gray-500 uppercase">Rank</th>
                  <th className="py-2 text-[10px] font-black text-gray-500 uppercase">Item</th>
                  <th className="py-2 text-[10px] font-black text-gray-500 uppercase text-right">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {data?.topConsumedStock?.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 text-xs font-bold text-gray-500">#{idx + 1}</td>
                    <td className="py-3">
                      <div className="text-xs font-bold text-gray-900">{item.name}</div>
                      {item.description && <div className="text-[10px] text-gray-500">{item.description}</div>}
                    </td>
                    <td className="py-3 text-xs font-black text-gray-900 text-right">{item.count}</td>
                  </tr>
                ))}
                {(!data?.topConsumedStock || data.topConsumedStock.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-xs text-gray-400 italic">No stock consumption data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Top Requesters */}
          <div>
            <div className="flex items-center mb-4 border-b border-gray-200 pb-2">
              <User className="h-5 w-5 mr-2 text-gray-700" />
              <h3 className="text-sm font-black text-gray-900 uppercase">Top Requesters</h3>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 text-[10px] font-black text-gray-500 uppercase">Rank</th>
                  <th className="py-2 text-[10px] font-black text-gray-500 uppercase">User</th>
                  <th className="py-2 text-[10px] font-black text-gray-500 uppercase text-right">Items Requested</th>
                </tr>
              </thead>
              <tbody>
                {data?.topStockUsers?.map((user: any, idx: number) => (
                  <tr key={idx} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 text-xs font-bold text-gray-500">#{idx + 1}</td>
                    <td className="py-3 text-xs font-bold text-gray-900">{user.name}</td>
                    <td className="py-3 text-xs font-black text-gray-900 text-right">{user.count}</td>
                  </tr>
                ))}
                {(!data?.topStockUsers || data.topStockUsers.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-xs text-gray-400 italic">No user request data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Activity Logs */}
        <div className="page-break-before">
          <div className="flex items-center mb-4 border-b border-gray-200 pb-2">
            <History className="h-5 w-5 mr-2 text-gray-700" />
            <h3 className="text-sm font-black text-gray-900 uppercase">Recent System Activity Logs</h3>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="py-3 px-2 text-[10px] font-black text-gray-500 uppercase">Date / Time</th>
                <th className="py-3 px-2 text-[10px] font-black text-gray-500 uppercase">Type</th>
                <th className="py-3 px-2 text-[10px] font-black text-gray-500 uppercase">Title</th>
                <th className="py-3 px-2 text-[10px] font-black text-gray-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody>
              {data?.activityLog?.map((log: any, idx: number) => (
                <tr key={log.id || idx} className="border-b border-gray-100">
                  <td className="py-3 px-2">
                    <div className="text-[10px] font-bold text-gray-900">{new Date(log.date).toLocaleDateString()}</div>
                    <div className="text-[9px] text-gray-500">{new Date(log.date).toLocaleTimeString()}</div>
                  </td>
                  <td className="py-3 px-2 text-[10px] font-black text-gray-600 uppercase">{log.type}</td>
                  <td className="py-3 px-2 text-[10px] font-bold text-gray-900">{log.title}</td>
                  <td className="py-3 px-2 text-[10px] text-gray-600 italic">{log.description}</td>
                </tr>
              ))}
              {(!data?.activityLog || data.activityLog.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-xs text-gray-400 italic">No recent activity logs available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Print Signature Footer */}
        <div className="mt-20 pt-8 border-t border-gray-200 grid grid-cols-2 gap-8 text-center print-footer">
          <div>
            <div className="w-48 border-b border-gray-400 mx-auto mb-2"></div>
            <p className="text-[10px] font-black text-gray-500 uppercase">Prepared By / Date</p>
          </div>
          <div>
            <div className="w-48 border-b border-gray-400 mx-auto mb-2"></div>
            <p className="text-[10px] font-black text-gray-500 uppercase">Noted By / Date</p>
          </div>
        </div>

      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .no-print-bg { background: white !important; }
          .print-container { 
            border: none !important; 
            box-shadow: none !important; 
            max-width: 100% !important; 
            padding: 0 !important;
          }
          .page-break-before { page-break-before: always; }
          @page { size: A4; margin: 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .pl-64 { padding-left: 0 !important; }
          main { padding: 0 !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  );
}
