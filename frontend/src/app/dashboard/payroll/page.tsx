'use client';

import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Printer,
  ChevronRight,
  Database,
  Users,
  ShieldAlert,
  Trash2,
  Search,
  RefreshCw,
  Filter,
  LayoutTemplate,
  Calendar,
  Plus,
  Save,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function IntegratedPayrollAdmin() {
  const [activeTab, setActiveTab] = useState<'records' | 'credentials' | 'formats'>('records');
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Credentials state
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCredentialLabel, setSelectedCredentialLabel] = useState('all');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [latestRun, setLatestRun] = useState<any>(null);

  // Runs state
  const [runs, setRuns] = useState<any[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [uploadLabel, setUploadLabel] = useState('');
  
  // New Flexible Upload State
  const [formats, setFormats] = useState<any[]>([]);
  const [selectedFormatId, setSelectedFormatId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [payrollDate, setPayrollDate] = useState('');
  const [loadingFormats, setLoadingFormats] = useState(false);

  // Format Creation State
  const [parsingHeaders, setParsingHeaders] = useState(false);
  const [availableHeaders, setAvailableHeaders] = useState<any[]>([]);
  const [newFormatName, setNewFormatName] = useState('');
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [fieldMapping, setFieldMapping] = useState<Record<string, number>>({});
  const [showMappingUI, setShowMappingUI] = useState(false);

  const systemFields = [
    { key: 'sys_id', label: 'Employee ID (Sys ID)', required: true },
    { key: 'full_name', label: 'Full Name', required: true },
    { key: 'basic_pay', label: 'Basic Pay', required: true },
    { key: 'gross_pay', label: 'Gross Pay', required: false },
    { key: 'overtime_pay', label: 'Overtime Pay', required: false },
    { key: 'allowance', label: 'Allowance', required: false },
    { key: 'sss', label: 'SSS Deduction', required: false },
    { key: 'phic', label: 'PHIC Deduction', required: false },
    { key: 'hdmf', label: 'HDMF Deduction', required: false },
    { key: 'loans', label: 'Loans/Other', required: false },
    { key: 'total_deductions', label: 'Total Deductions', required: true },
    { key: 'net_pay', label: 'Net Pay', required: true },
  ];

  const fetchFormats = async () => {
    setLoadingFormats(true);
    try {
      const res = await fetch('/api/payroll/formats');
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setFormats(data);
      } else {
        setFormats([]);
      }
    } catch (err) {
      console.error('Failed to fetch formats:', err);
      setFormats([]);
    } finally {
      setLoadingFormats(false);
    }
  };

  const fetchRuns = async () => {
    setLoadingRuns(true);
    try {
      const res = await fetch('/api/payroll/runs');
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setRuns(data);
      } else {
        setRuns([]);
      }
    } catch (err) {
      console.error('Failed to fetch runs:', err);
      setRuns([]);
    } finally {
      setLoadingRuns(false);
    }
  };

  const fetchLatestRun = async () => {
    try {
      const res = await fetch('/api/payroll/latest-run');
      const data = await res.json();
      if (res.ok) setLatestRun(data);
    } catch (err) {
      console.error('Failed to fetch latest run:', err);
    }
  };

  useEffect(() => {
    fetchLatestRun();
    fetchRuns();
    fetchFormats();
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/payroll/users');
      const data = await res.json();
      if (res.ok) setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'credentials') {
      fetchUsers();
    }
  }, [activeTab]);

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to disable/remove this employee account?')) return;
    
    try {
      const res = await fetch('/api/payroll/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedFormatId) {
      setStatus({ type: 'error', message: 'Please select a Client Format before uploading.' });
      e.target.value = '';
      return;
    }

    if (!periodStart || !periodEnd) {
      setStatus({ type: 'error', message: 'Please provide the payroll period dates.' });
      e.target.value = '';
      return;
    }

    setUploading(true);
    setStatus(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('formatId', selectedFormatId);
    formData.append('label', uploadLabel || 'Payroll Run');
    formData.append('periodStart', periodStart);
    formData.append('periodEnd', periodEnd);
    formData.append('payrollDate', payrollDate || new Date().toISOString());

    try {
      const response = await fetch('/api/payroll/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setStatus({ 
          type: 'success', 
          message: `Payroll run processed successfully. ${result.count} employee records synchronized.` 
        });
        setUploadLabel('');
        // Clear file input
        e.target.value = '';
      } else {
        throw new Error(result.error || 'Failed to process payroll file');
      }
    } catch (err: any) {
      setStatus({ 
        type: 'error', 
        message: err.message 
      });
    } finally {
      setUploading(false);
      fetchLatestRun();
      fetchRuns();
    }
  };

  const handleFormatTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingHeaders(true);
    setStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/payroll/formats/parse-headers', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setAvailableHeaders(data.headers);
        setHeaderRowIndex(data.headerRowIndex);
        setFieldMapping(data.mapping || {}); // Apply autonomous mapping from backend
        setShowMappingUI(true);
        const detectedCount = Object.keys(data.mapping || {}).length;
        setStatus({ 
          type: 'success', 
          message: `Autonomous scan complete! Detected ${detectedCount} fields automatically. You can review them below.` 
        });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setParsingHeaders(false);
      e.target.value = '';
    }
  };


  const saveFormat = async () => {
    if (!newFormatName) {
      setStatus({ type: 'error', message: 'Please provide a client/format name.' });
      return;
    }

    // Check required fields
    const missing = systemFields.filter(f => f.required && fieldMapping[f.key] === undefined);
    if (missing.length > 0) {
      setStatus({ type: 'error', message: `Missing required mappings: ${missing.map(m => m.label).join(', ')}` });
      return;
    }

    try {
      const res = await fetch('/api/payroll/formats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: newFormatName,
          mapping: fieldMapping,
          header_row_index: headerRowIndex
        }),
      });
      if (res.ok) {
        setStatus({ type: 'success', message: 'Format saved successfully.' });
        fetchFormats();
        setShowMappingUI(false);
        setNewFormatName('');
        setFieldMapping({});
      } else {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    }
  };

  const deleteFormat = async (id: string) => {
    if (!confirm('Are you sure you want to delete this format?')) return;
    try {
      const res = await fetch('/api/payroll/formats', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        fetchFormats();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleSync = async () => {
    if (!latestRun?.id) {
      setStatus({ type: 'error', message: 'No payroll run found to sync.' });
      return;
    }
    
    setLoadingUsers(true);
    setStatus(null);

    try {
      const response = await fetch('/api/payroll/sync-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: latestRun.id }),
      });

      const result = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: result.summary });
        fetchUsers(); // Refresh the list
      } else {
        throw new Error(result.error || 'Failed to sync accounts');
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoadingUsers(false);
    }
  };

  const filteredUsers = (users || []).filter(user => {
    const search = (searchTerm || '').toLowerCase();
    const matchesSearch = (
      user.fullName?.toLowerCase().includes(search) ||
      user.sys_id?.toLowerCase().includes(search) ||
      user.username?.toLowerCase().includes(search)
    );

    if (selectedCredentialLabel === 'all') return matchesSearch;

    const runIdsWithLabel = (runs || [])
      .filter(r => (r?.label || 'General') === selectedCredentialLabel)
      .map(r => r.id);
    
    const hasEntryInSelectedRun = user.run_ids?.some((runId: any) => 
      runIdsWithLabel.includes(runId)
    );
    
    return matchesSearch && hasEntryInSelectedRun; 
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Database className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Financial Operations</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Payroll Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage payroll records and employee portal access.</p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-gray-100 p-1 rounded-2xl flex items-center self-start md:self-center">
          <button 
            onClick={() => setActiveTab('records')}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'records' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Payroll Records
          </button>
          <button 
            onClick={() => setActiveTab('formats')}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'formats' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Client Formats
          </button>
          <button 
            onClick={() => setActiveTab('credentials')}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'credentials' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Employee Credentials
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'records' ? (
          <motion.div 
            key="records"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Upload Panel */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm p-10 flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="h-20 w-20 rounded-2xl bg-blue-50 text-primary flex items-center justify-center mb-6">
                  <Upload className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Import Payroll Spreadsheet</h3>
                <p className="text-gray-500 text-sm max-w-sm mb-8">
                  Upload your monthly payroll Excel file (.xlsx) to update employee records and generate digital payslips.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xl mb-8 text-left">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-primary uppercase tracking-widest ml-1">Client Format</label>
                    <select 
                      value={selectedFormatId}
                      onChange={(e) => setSelectedFormatId(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none font-bold text-gray-600"
                    >
                      <option value="">Select Format...</option>
                      {(formats || []).map(f => (
                        <option key={f.id} value={f.id}>{f.client_name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-primary uppercase tracking-widest ml-1">Run Label (Reference)</label>
                    <input 
                      type="text"
                      placeholder="e.g. Monthly Run"
                      value={uploadLabel}
                      onChange={(e) => setUploadLabel(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-primary uppercase tracking-widest ml-1">Period Start</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input 
                        type="date"
                        value={periodStart}
                        onChange={(e) => setPeriodStart(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-primary uppercase tracking-widest ml-1">Period End</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input 
                        type="date"
                        value={periodEnd}
                        onChange={(e) => setPeriodEnd(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                      />
                    </div>
                  </div>
                </div>
                
                <label className={`relative group cursor-pointer ${(!selectedFormatId || !periodStart || !periodEnd) ? 'opacity-50 grayscale' : ''}`}>
                  <div className="bg-primary hover:bg-primary-dark text-white px-10 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-3">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    {uploading ? 'Processing Run...' : 'Select Payroll File'}
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".xlsx, .xls, .xlsb, .csv" 
                    onChange={handleFileUpload} 
                    disabled={uploading || !selectedFormatId || !periodStart || !periodEnd} 
                  />
                </label>
              </div>

              {status && (
                <div className={`p-5 rounded-2xl border flex items-start gap-4 ${
                  status.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'
                }`}>
                  {status.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" /> : <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />}
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest mb-1">Execution Status</p>
                    <p className="text-sm font-medium">{status.message}</p>
                  </div>
                </div>
              )}

              {/* Runs Table */}
              <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase tracking-widest text-gray-900">Payroll Run History</h4>
                  <button onClick={fetchRuns} className="text-primary p-2 hover:bg-blue-50 rounded-lg transition-colors">
                    <RefreshCw className={`h-4 w-4 ${loadingRuns ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Date</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Client / Label</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Period</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Records</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {loadingRuns && (runs || []).length === 0 ? (
                        <tr><td colSpan={4} className="px-8 py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></td></tr>
                      ) : (runs || []).length === 0 ? (
                        <tr><td colSpan={4} className="px-8 py-10 text-center text-gray-400 text-sm font-medium">No payroll runs found.</td></tr>
                      ) : (
                        (runs || []).map((run) => (
                          <tr key={run.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-8 py-5">
                              <p className="text-xs font-black text-gray-900">{new Date(run.created_at).toLocaleDateString()}</p>
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-primary uppercase tracking-tight">{run.client_name || 'Legacy'}</span>
                                <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg self-start">{run.label || 'General'}</span>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <p className="text-[10px] font-bold text-gray-500">{new Date(run.period_start).toLocaleDateString()} - {new Date(run.period_end).toLocaleDateString()}</p>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <span className="text-xs font-black text-primary">{run.payroll_entries?.[0]?.count || 0}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sidebar Tools */}
            <div className="space-y-6">
              <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                 <h4 className="text-lg font-black mb-2 relative z-10">Sync Required</h4>
                 <p className="text-gray-400 text-xs leading-relaxed mb-8 relative z-10">
                   After uploading payroll, ensure you sync the employee accounts to grant access to the new portal.
                 </p>
                 <button 
                   onClick={() => setActiveTab('credentials')}
                   className="w-full bg-white text-gray-900 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors"
                 >
                   <Users className="h-4 w-4" />
                   Manage Credentials
                 </button>
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 border border-gray-200 shadow-sm">
                 <h4 className="text-sm font-black uppercase tracking-widest text-gray-900 mb-6">Recent Activity</h4>
                 <div className="space-y-4">
                    {[
                      { date: 'May 01, 2026', action: 'April Monthly Run', status: 'Completed' },
                      { date: 'Apr 02, 2026', action: 'March Monthly Run', status: 'Completed' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{item.date}</p>
                          <p className="text-xs font-black text-gray-700">{item.action}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'formats' ? (
          <motion.div 
            key="formats"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-2 space-y-8">
              {!showMappingUI ? (
                <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm p-10 flex flex-col items-center justify-center min-h-[400px] text-center">
                  <div className="h-20 w-20 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6">
                    <LayoutTemplate className="h-10 w-10" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Configure Client Format</h3>
                  <p className="text-gray-500 text-sm max-w-sm mb-8">
                    Upload an Excel template to define how the system should parse files for a specific client.
                  </p>
                  
                  <label className="relative group cursor-pointer">
                    <div className="bg-purple-600 hover:bg-purple-700 text-white px-10 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-purple-600/20 transition-all active:scale-95 flex items-center gap-3">
                      {parsingHeaders ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {parsingHeaders ? 'Analyzing Template...' : 'Upload New Template'}
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".xlsx, .xls, .xlsb, .csv" 
                      onChange={handleFormatTemplateUpload} 
                      disabled={parsingHeaders} 
                    />
                  </label>
                </div>
              ) : (
                <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-gray-900">Field Mapping Configuration</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Define which Excel columns match our system fields</p>
                    </div>
                    <button onClick={() => setShowMappingUI(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">Cancel</button>
                  </div>
                  
                  <div className="p-8 space-y-6">
                    <div className="max-w-md">
                      <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-2">Client / Format Name</label>
                      <input 
                        type="text"
                        placeholder="e.g. GAISANO"
                        value={newFormatName}
                        onChange={(e) => setNewFormatName(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {systemFields.map((field) => (
                        <div key={field.key} className="space-y-1.5">
                          <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                            {field.label}
                            {field.required && <span className="text-red-500">*</span>}
                          </label>
                          <select 
                            value={fieldMapping[field.key] ?? ''}
                            onChange={(e) => setFieldMapping({...fieldMapping, [field.key]: parseInt(e.target.value)})}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 outline-none"
                          >
                            <option value="">Select Column...</option>
                            {(availableHeaders || []).map((h: any) => (
                              <option key={h.index} value={h.index}>{h.name}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex justify-end">
                      <button 
                        onClick={saveFormat}
                        className="bg-primary text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-primary-dark transition-all shadow-lg shadow-primary/10"
                      >
                        <Save className="h-4 w-4" />
                        Save Configuration
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase tracking-widest text-gray-900">Saved Client Formats</h4>
                  <button onClick={fetchFormats} className="text-primary p-2 hover:bg-blue-50 rounded-lg transition-colors">
                    <RefreshCw className={`h-4 w-4 ${loadingFormats ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Client Name</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Mappings</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Last Updated</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(formats || []).length === 0 ? (
                        <tr><td colSpan={4} className="px-8 py-10 text-center text-gray-400 text-sm">No formats defined.</td></tr>
                      ) : (
                        (formats || []).map((f) => (
                          <tr key={f.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-8 py-5">
                              <p className="text-xs font-black text-gray-900">{f.client_name}</p>
                            </td>
                            <td className="px-8 py-5">
                              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                                {Object.keys(f.mapping || {}).length} Fields
                              </span>
                            </td>
                            <td className="px-8 py-5">
                              <p className="text-[10px] font-bold text-gray-400">{new Date(f.updated_at).toLocaleDateString()}</p>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <button 
                                onClick={() => deleteFormat(f.id)}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-purple-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                 <h4 className="text-lg font-black mb-2 relative z-10">Flexible Parsing</h4>
                 <p className="text-purple-200 text-xs leading-relaxed mb-6 relative z-10">
                   Each client uses a different Excel layout. By defining a mapping here, the system can handle any spreadsheet without code changes.
                 </p>
                 <div className="flex items-center gap-3 text-purple-300">
                   <ShieldAlert className="h-4 w-4 shrink-0" />
                   <p className="text-[10px] font-bold uppercase tracking-tight">Requires matching Excel column headers</p>
                 </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="credentials"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {status && (
              <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                status.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'
              }`}>
                {status.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <p className="text-xs font-bold">{status.message}</p>
              </div>
            )}

            <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden">
              {/* Toolbar */}
              <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="text"
                      placeholder="Search name, ID, or username..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="relative w-48">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select 
                      value={selectedCredentialLabel}
                      onChange={(e) => setSelectedCredentialLabel(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none font-bold text-gray-600"
                    >
                      <option value="all">All Labels</option>
                      {Array.from(new Set(runs.map(r => r.label || 'General'))).map(label => (
                        <option key={label} value={label}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleSync}
                    disabled={loadingUsers || !latestRun}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-600/10"
                  >
                    {loadingUsers ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Sync Accounts
                  </button>
                  <button 
                    onClick={() => window.open('/dashboard/payroll/strips', '_blank')}
                    className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all active:scale-95 shadow-lg shadow-gray-900/10"
                  >
                    <Printer className="h-4 w-4" />
                    Print Strips
                  </button>
                </div>
              </div>

              {/* User List */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Employee</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Portal Username</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Password</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loadingUsers && users.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-gray-500 text-sm font-medium">Fetching credential records...</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center text-gray-500">
                          No credentials found. Click "Sync Accounts" to generate them.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center font-black text-xs uppercase">
                                {user.fullName?.substring(0, 2)}
                              </div>
                              <div>
                                <p className="text-sm font-black text-gray-900">{user.fullName}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">ID: {user.sys_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <code className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">{user.username}</code>
                          </td>
                          <td className="px-8 py-6 text-sm font-mono font-medium text-gray-600">
                            {user.password}
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button 
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                              title="Disable Account"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
