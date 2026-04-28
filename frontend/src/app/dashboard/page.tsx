'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { 
  Box, Users, User, TrendingUp, Activity, Filter, Calendar, MapPin, 
  ChevronRight, ArrowUpRight, ArrowDownRight, Package, ClipboardList, ShoppingCart,
  RefreshCw, Loader2
} from 'lucide-react';
import api from '@/lib/api';
import { Printer, Eye, X as CloseIcon } from 'lucide-react';
import { PageHeaderSkeleton, CardSkeleton } from '@/components/ui/LoadingSkeletons';
import { CircularLoading, useLoadingSteps } from '@/components/ui/LoadingProgress';

const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6'];

function ReportModal({ isOpen, onClose, section }: { isOpen: boolean, onClose: () => void, section: 'product' | 'employee' | 'activity' }) {
  const [reportType, setReportType] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const productReports = [
    { id: 'stock-summary', name: 'Stock Summary' },
    { id: 'need-restock', name: 'Need Restock' },
    { id: 'inventory-distribution', name: 'Inventory Distribution (by Location)' },
    { id: 'custom-item-report', name: 'Custom Item Report' },
  ];

  const employeeReports = [
    { id: 'supply-demand', name: 'Pending Supply Demand' },
    { id: 'pending-requests', name: 'Pending Requests (Past Due/Today)' },
    { id: 'consumption-analysis', name: 'Consumption Analysis (Employee Behavior)' },
    { id: 'filter-item', name: 'Filter by Specific Item' },
  ];

  const activityReports = [
    { id: 'top-consumed-stock', name: 'Top Consumed Stock' },
    { id: 'top-requesters', name: 'Top Requesters' }
  ];

  const reports = section === 'product' ? productReports : section === 'employee' ? employeeReports : activityReports;

  const handleGenerate = async () => {
    if (!reportType) return alert('Please select a report type');
    setLoading(true);
    try {
      const res = await api.get(`/reports/report-data?type=${reportType}`);
      setPreviewData(res.data);
      setIsPreviewOpen(true);
    } catch (err) {
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const formatDataForPreview = (data: any[], type: string) => {
    switch (type) {
      case 'stock-summary':
        return data.map(p => ({
          SKU: p.sku,
          Name: p.name,
          Unit: p.unit,
          Threshold: p.threshold,
          'Total Stock': p.stocks.reduce((sum: number, s: any) => sum + s.quantity, 0)
        }));
      case 'need-restock':
        return data.map(p => ({
          SKU: p.sku,
          Name: p.name,
          'Current Stock': p.stocks.reduce((sum: number, s: any) => sum + s.quantity, 0),
          Threshold: p.threshold
        }));
      case 'inventory-distribution':
        const rows: any[] = [];
        data.forEach(l => {
          l.stocks.forEach((s: any) => {
            rows.push({ Location: l.name, SKU: s.product.sku, Product: s.product.name, Quantity: s.quantity });
          });
        });
        return rows;
      case 'supply-demand':
        return data.map(p => ({
          SKU: p.sku,
          Product: p.name,
          'On Hand': p.onHand,
          'Pending Req': p.pending,
          'Fulfilled Total': p.fulfilled
        }));
      case 'pending-requests':
        return data.map(r => ({
          'Date Req': new Date(r.date).toLocaleDateString(),
          'Request No': r.requestNo,
          Employee: r.employeeName,
          Dept: r.departmentArea,
          Product: r.product.name,
          Qty: r.quantity,
          Location: r.location.name
        }));
      case 'consumption-analysis':
        return data.map(a => ({
          Employee: a.employee,
          Department: a.dept,
          'Total Items Issued': a.totalItems,
          'Breakdown': Object.entries(a.items).map(([k, v]) => `${k}: ${v}`).join(', ')
        }));
      case 'top-consumed-stock':
        return data.map((t, idx) => ({
          Rank: `#${idx + 1}`,
          'Stock Name': t.name,
          Description: t.description,
          'Total Consumed': `${t.count} PCS`
        }));
      case 'top-requesters':
        return data.map((u, idx) => ({
          Rank: `#${idx + 1}`,
          'Requester Name': u.name,
          'Total Requested': `${u.count} ITEMS REQUESTED`
        }));
      default:
        return data;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {!isPreviewOpen ? (
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Report Generator</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                {section === 'product' ? 'Stock & Inventory Intelligence' : section === 'employee' ? 'Organizational Insights' : 'System Activity & Stock Logs'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <CloseIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          
          <div className="p-8 space-y-8">
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Report Type</label>
              <div className="grid grid-cols-1 gap-3">
                {reports.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setReportType(r.id)}
                    className={`flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all ${
                      reportType === r.id 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-gray-100 hover:border-gray-200 text-gray-600'
                    }`}
                  >
                    <span className="text-sm font-bold">{r.name}</span>
                    {reportType === r.id && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2 bg-primary text-white px-10 py-3.5 rounded-2xl font-black text-sm shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : (
                <>
                  <Eye className="h-4 w-4" />
                  View Report
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] animate-in slide-in-from-bottom-10 duration-500">
          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Report Preview</h2>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">{reportType.replace(/-/g, ' ')}</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-800 transition-all"
              >
                <Printer className="h-4 w-4" /> Print PDF
              </button>
              <button onClick={() => setIsPreviewOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <CloseIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-8 no-scrollbar">
            <div className="print-area">
              <div className="mb-10 text-center border-b-2 border-gray-900 pb-8">
                <h1 className="text-3xl font-black uppercase tracking-tighter text-gray-900">Inventory Intelligence Report</h1>
                <p className="text-sm font-bold text-gray-500 mt-2">Generated on {new Date().toLocaleString()}</p>
              </div>

              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    {Object.keys(formatDataForPreview(previewData, reportType)[0] || {}).map(key => (
                      <th key={key} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest border border-gray-800">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {formatDataForPreview(previewData, reportType).map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {Object.values(row).map((val: any, vIdx) => (
                        <td key={vIdx} className="px-4 py-3 text-xs font-bold border border-gray-100 text-gray-900">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-20 flex justify-between px-10">
                <div className="text-center">
                  <div className="w-48 border-b border-gray-900 mb-2"></div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Prepared By</p>
                </div>
                <div className="text-center">
                  <div className="w-48 border-b border-gray-900 mb-2"></div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Verified By</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { 
            position: relative; 
            width: 100%; 
            padding: 0;
            margin: 0;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'product' | 'employee' | 'activity'>('product');

  const { steps, setStepDone, setStepLabel } = useLoadingSteps([
    'Syncing network locations',
    'Compiling organizational analytics'
  ]);

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role === 'inventory' || role !== 'admin') {
      router.push('/dashboard/staff/requisition');
    }
  }, [router]);

  const fetchData = async () => {
    setIsRefreshing(true);
    const startTime = Date.now();
    try {
      const locRes = await api.get('/locations');
      setLocations(locRes.data);
      setStepDone('Syncing network locations');

      let url = selectedLocation === 'all' 
        ? '/reports/analytics?' 
        : `/reports/analytics?locationId=${selectedLocation}&`;
      
      if (startDate) url += `startDate=${startDate}&`;
      if (endDate) url += `endDate=${endDate}&`;
      
      const res = await api.get(url);
      setData(res.data);
      setStepDone('Compiling organizational analytics');
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      const elapsed = Date.now() - startTime;
      if (elapsed < 1800) {
        await new Promise(resolve => setTimeout(resolve, 1800 - elapsed));
      }
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedLocation, startDate, endDate]);

  if (loading || !data) {
    return (
      <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-300">
        <CircularLoading steps={steps} minDisplayTime={1500} title="Intelligence Sync" />
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <CardSkeleton className="h-[120px]" />
          <CardSkeleton className="h-[120px]" />
          <CardSkeleton className="h-[120px]" />
          <CardSkeleton className="h-[120px]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CardSkeleton className="h-[400px]" />
          <div className="lg:col-span-2"><CardSkeleton className="h-[400px]" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      {/* Top Header Summary */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-10">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center">
            System Intelligence
            {isRefreshing && <RefreshCw className="ml-4 h-6 w-6 text-primary animate-spin" />}
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Real-time reports and organizational requisition trends</p>
        </div>
        <div className="flex items-center bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="px-8 py-2 border-r border-gray-100">
            <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Requests</span>
            <span className="text-3xl font-black text-primary">{data.summary.totalRequests}</span>
          </div>
          <div className="px-8 py-2 border-r border-gray-100">
            <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">New Today</span>
            <span className="text-3xl font-black text-blue-500">{data.summary.todayRequests || 0}</span>
          </div>
          <div className="px-8 py-2 border-r border-gray-100">
            <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Active Items</span>
            <span className="text-3xl font-black text-gray-900">{data.summary.totalItems}</span>
          </div>
          <div className="px-8 py-2">
            <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fulfillment</span>
            <span className="text-3xl font-black text-green-500">{((data.summary.fulfilledRequests / (data.summary.totalRequests || 1)) * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: PRODUCT REPORTS */}
      <section className="space-y-6 relative">
        {isRefreshing && (
          <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[1px] flex items-center justify-center rounded-3xl animate-in fade-in duration-300">
            <div className="bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3 border border-gray-100">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
              <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Syncing Records...</span>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] flex items-center">
            <Box className="mr-2 h-4 w-4 text-primary" /> SECTION 01: STOCK & INVENTORY INTELLIGENCE
          </h2>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => { setActiveSection('product'); setIsReportModalOpen(true); }}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-sm hover:bg-gray-800 transition-all"
            >
              <Eye className="h-3.5 w-3.5" />
              View Reports
            </button>
            <div className="flex items-center space-x-2 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-sm hover:border-primary/50 transition-colors">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-[10px] font-black bg-transparent border-none outline-none cursor-pointer uppercase text-gray-600 focus:text-primary transition-colors"
                />
                <span className="text-[10px] font-black text-gray-300">—</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-[10px] font-black bg-transparent border-none outline-none cursor-pointer uppercase text-gray-600 focus:text-primary transition-colors"
                />
              </div>
              {(startDate || endDate) && (
                <button 
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="ml-1 p-1 hover:bg-gray-100 rounded-md transition-colors"
                  title="Clear Filter"
                >
                  <CloseIcon className="h-3 w-3 text-gray-400" />
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-sm hover:border-primary/50 transition-colors">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <select 
                value={selectedLocation} 
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="text-[10px] font-black bg-transparent border-none outline-none pr-8 cursor-pointer uppercase text-gray-600"
              >
                <option value="all">Global View (All Areas)</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stock Category Distribution */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center hover:shadow-md transition-shadow">
            <div className="w-full flex items-center justify-between mb-8">
              <h3 className="text-sm font-bold text-gray-800">Stock Status Distribution</h3>
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.stockDistribution}
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {data.stockDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Sufficient' ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#111827', 
                      border: 'none', 
                      borderRadius: '12px', 
                      padding: '12px',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                    }}
                    itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'black', marginBottom: '4px', textTransform: 'uppercase' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex space-x-6 mt-6">
              {data.stockDistribution.map((entry: any) => (
                <div key={entry.name} className="flex items-center space-x-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${entry.name === 'Sufficient' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-[10px] font-black text-gray-500 uppercase">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Issuance Log */}
          <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-bold text-gray-800">Monthly Fulfillment Volume</h3>
              <span className="text-[10px] font-black text-primary uppercase">Last 6 Months</span>
            </div>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyTrends}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                  <YAxis fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ 
                      backgroundColor: '#111827', 
                      border: 'none', 
                      borderRadius: '12px', 
                      padding: '12px',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                    }}
                    itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'black', marginBottom: '4px', textTransform: 'uppercase' }}
                  />
                  <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={45} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Org Insights Controls */}
        <div className="flex items-center justify-between pt-8 pb-2">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] flex items-center">
            <Users className="mr-2 h-4 w-4 text-purple-600" /> ORGANIZATIONAL & EMPLOYEE INSIGHTS
          </h2>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => { setActiveSection('employee'); setIsReportModalOpen(true); }}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-sm hover:bg-purple-700 transition-all"
            >
              <Eye className="h-3.5 w-3.5" />
              View Reports
            </button>
            <button className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm hover:border-primary/30 transition-all text-[10px] font-black text-gray-600 uppercase">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              <span>Current Month</span>
            </button>
            <button className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm hover:border-primary/30 transition-all text-[10px] font-black text-gray-600 uppercase">
              <Filter className="h-3.5 w-3.5 text-gray-400" />
              <span>All Depts</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Most Requested Items */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-bold text-gray-800">High-Demand Stocks</h3>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-6">
              {data.topProducts.length === 0 ? (
                <p className="text-center py-10 text-xs text-gray-400 italic">No issuance data available.</p>
              ) : (
                data.topProducts.map((p: any, idx: number) => (
                  <div key={p.name} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${idx === 0 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-bold text-gray-700 group-hover:text-primary transition-colors">{p.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-gray-900">{p.count} PCS</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-1000" 
                        style={{ width: `${(p.count / (data.topProducts[0].count || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Department Distribution */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center hover:shadow-md transition-shadow">
            <div className="w-full flex items-center justify-between mb-8">
              <h3 className="text-sm font-bold text-gray-800">Requests by Department</h3>
              <Activity className="h-4 w-4 text-purple-600" />
            </div>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.topDepartments}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={95}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.topDepartments.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#111827', 
                      border: 'none', 
                      borderRadius: '12px', 
                      padding: '12px',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                    }}
                    itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'black', marginBottom: '4px', textTransform: 'uppercase' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: SYSTEM ACTIVITY & STOCK LOGS */}
      <section className="space-y-6 pt-12 border-t border-gray-100 relative">
        {isRefreshing && (
          <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[1px] flex items-center justify-center rounded-3xl animate-in fade-in duration-300">
            <div className="bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3 border border-gray-100">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
              <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Syncing Records...</span>
            </div>
          </div>
        )}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] flex items-center">
            <Activity className="mr-2 h-4 w-4 text-purple-600" /> SECTION 02: SYSTEM ACTIVITY & STOCK LOGS
          </h2>
          <button 
            onClick={() => { setActiveSection('activity'); setIsReportModalOpen(true); }}
            className="text-[10px] font-black bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors flex items-center"
          >
            <Printer className="w-3 h-3 mr-1.5" />
            VIEW REPORT
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Most Consumed Admin Stock */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-bold text-gray-800">Top Consumed Stock</h3>
              <Package className="h-4 w-4 text-blue-600" />
            </div>
            <div className="space-y-6">
              {data.topConsumedStock?.length === 0 ? (
                <p className="text-center py-10 text-xs text-gray-400 italic">No admin stock out data.</p>
              ) : (
                data.topConsumedStock?.map((p: any, idx: number) => (
                  <div key={idx} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${idx === 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                          #{idx + 1}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-700 group-hover:text-blue-600 transition-colors">{p.name}</span>
                          {p.description && (
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">{p.description}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-gray-900">{p.count} PCS</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full transition-all duration-1000" 
                        style={{ width: `${(p.count / (data.topConsumedStock[0].count || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Issuing Users */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-bold text-gray-800">Top Requesters</h3>
              <User className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="space-y-6">
              {data.topStockUsers?.length === 0 ? (
                <p className="text-center py-10 text-xs text-gray-400 italic">No user activity data.</p>
              ) : (
                data.topStockUsers?.map((u: any, idx: number) => (
                  <div key={u.name} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${idx === 0 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-bold text-gray-700 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{u.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-gray-900">{u.count} ITEMS REQUESTED</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 rounded-full transition-all duration-1000" 
                        style={{ width: `${(u.count / (data.topStockUsers[0].count || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Unified Activity Log */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
            <h3 className="text-sm font-bold text-gray-800 flex items-center">
              <Activity className="mr-2 h-4 w-4 text-primary" /> System-Wide Activity Log
            </h3>
            <div className="flex items-center space-x-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Updates</span>
            </div>
          </div>
          <div className="divide-y divide-gray-50 max-h-[450px] overflow-y-auto">
            {data.activityLog.length === 0 ? (
              <div className="px-8 py-20 text-center text-sm text-gray-400 italic">No recent activity detected.</div>
            ) : (
              data.activityLog.map((log: any) => (
                <div key={log.id} className="px-8 py-5 flex items-center justify-between hover:bg-gray-50/80 transition-colors group">
                  <div className="flex items-center space-x-5">
                    <div className={`p-2.5 rounded-2xl shadow-sm ${
                      log.type === 'STOCK' ? 'bg-blue-50 text-blue-600' :
                      log.type === 'REQUEST' ? 'bg-indigo-50 text-indigo-600' :
                      'bg-orange-50 text-orange-600'
                    }`}>
                      {log.type === 'STOCK' ? <Package className="h-4.5 w-4.5" /> :
                       log.type === 'REQUEST' ? <ClipboardList className="h-4.5 w-4.5" /> :
                       <ShoppingCart className="h-4.5 w-4.5" />}
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-900 group-hover:text-primary transition-colors">{log.title}</p>
                      <p className="text-[10px] text-gray-500 font-medium mt-0.5">{log.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-gray-900 uppercase tracking-tighter">{new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    <p className="text-[9px] font-bold text-gray-400 mt-0.5">{new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <ReportModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        section={activeSection} 
      />
    </div>
  );
}
