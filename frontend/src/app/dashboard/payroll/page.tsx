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
  Calendar,
  Plus,
  Save,
  ChevronDown,
  X,
  Table as TableIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function IntegratedPayrollAdmin() {
  const [activeTab, setActiveTab] = useState<'records' | 'credentials'>('records');
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
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [payrollDate, setPayrollDate] = useState('');

  // Interactive Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [wizardStep, setWizardStep] = useState<'sheets' | 'mapping'>('sheets');
  const [discoveryData, setDiscoveryData] = useState<any>(null);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState<number>(0);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [fieldMapping, setFieldMapping] = useState<Record<string, number>>({});
  const [clientLabel, setClientLabel] = useState('');
  const [parsingHeaders, setParsingHeaders] = useState(false);

  const systemFields = [
    { key: 'sys_id', label: 'Employee ID', required: true },
    { key: 'full_name', label: 'Full Name', required: true },
    { key: 'basic_pay', label: 'Basic Pay', required: true },
    { key: 'gross_pay', label: 'Gross Pay', required: false },
    { key: 'net_pay', label: 'Net Pay', required: true },
    { key: 'total_deductions', label: 'Total Deductions', required: true },
  ];

  const getColLetter = (index: number) => {
    let letter = "";
    let i = index;
    while (i >= 0) {
      letter = String.fromCharCode((i % 26) + 65) + letter;
      i = Math.floor(i / 26) - 1;
    }
    return letter;
  };

  const fetchRuns = async () => {
    setLoadingRuns(true);
    try {
      const res = await fetch('/api/payroll/runs');
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setRuns(data);
    } catch (err) {
      console.error('Failed to fetch runs:', err);
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
    fetchLatestRun();
    fetchRuns();
    if (activeTab === 'credentials') fetchUsers();
  }, [activeTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!periodStart || !periodEnd) {
      setStatus({ type: 'error', message: 'Please provide the payroll period dates first.' });
      e.target.value = '';
      return;
    }

    setParsingHeaders(true);
    setSelectedFile(file);
    setStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/payroll/formats/parse-headers', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data) {
        setDiscoveryData(data);
        setWizardStep('sheets');
        const bestIdx = (data.sheets || []).reduce((best: number, curr: any, idx: number) => 
          curr.rowCount > (data.sheets[best]?.rowCount || 0) ? idx : best, 0);
        setSelectedSheetIndex(bestIdx);
        setIsImportModalOpen(true);
      } else {
        throw new Error(data?.error || 'Failed to analyze payroll file');
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setParsingHeaders(false);
      e.target.value = '';
    }
  };

  const confirmSheet = () => {
    if (!discoveryData || !discoveryData.sheets[selectedSheetIndex]) return;
    const sheet = discoveryData.sheets[selectedSheetIndex];
    setHeaderRowIndex(sheet.suggestedHeaderIndex);
    
    // Auto-map based on headers
    const newMapping: Record<string, number> = {};
    const rules: Record<string, string[]> = {
      sys_id: ['sys id', 'employee id', 'id', 'emp id', 'employee no'],
      full_name: ['full name', 'employee name', 'emp name', 'name'],
      basic_pay: ['basic pay', 'monthly rate', 'daily rate'],
      gross_pay: ['gross pay', 'total earnings'],
      net_pay: ['net pay', 'take home pay'],
      total_deductions: ['total deductions']
    };

    (sheet.headers || []).forEach((h: any) => {
      const name = String(h.name || '').toLowerCase();
      Object.entries(rules).forEach(([key, keywords]) => {
        if (keywords.some(k => name.includes(k))) newMapping[key] = h.index;
      });
    });

    setFieldMapping(newMapping);
    setWizardStep('mapping');
  };

  const processImport = async () => {
    if (!selectedFile || !discoveryData) return;
    const sheet = discoveryData.sheets[selectedSheetIndex];
    
    setUploading(true);
    setIsImportModalOpen(false);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('sheetName', sheet.name);
    formData.append('headerRowIndex', String(headerRowIndex));
    formData.append('mapping', JSON.stringify(fieldMapping));
    formData.append('label', clientLabel || 'Payroll Run');
    formData.append('periodStart', periodStart);
    formData.append('periodEnd', periodEnd);
    formData.append('payrollDate', payrollDate || new Date().toISOString());

    try {
      const response = await fetch('/api/payroll/upload', { method: 'POST', body: formData });
      const result = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: `Success! Processed ${result.count} records from ${sheet.name}.` });
        fetchLatestRun();
        fetchRuns();
      } else {
        throw new Error(result.error || 'Failed to process payroll');
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

  const handleSync = async () => {
    if (!latestRun?.id) return setStatus({ type: 'error', message: 'No payroll run found to sync.' });
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
        fetchUsers();
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
    const search = searchTerm.toLowerCase();
    const matchesSearch = (
      user.fullName?.toLowerCase().includes(search) ||
      user.sys_id?.toLowerCase().includes(search) ||
      user.username?.toLowerCase().includes(search)
    );
    if (selectedCredentialLabel === 'all') return matchesSearch;
    const runIdsWithLabel = runs.filter(r => (r?.label || 'General') === selectedCredentialLabel).map(r => r.id);
    return matchesSearch && user.run_ids?.some((runId: any) => runIdsWithLabel.includes(runId));
  });

  return (
    <ErrorBoundary>
      <div className="space-y-8 animate-in fade-in duration-500 relative">
        
        {/* Interactive Import Modal */}
        <AnimatePresence>
          {isImportModalOpen && discoveryData && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/40 backdrop-blur-sm overflow-y-auto">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Interactive Import: {selectedFile?.name}</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                      Step {wizardStep === 'sheets' ? '1' : '2'} of 2: {wizardStep === 'sheets' ? 'Select Data Sheet' : 'Verify Column Mapping'}
                    </p>
                  </div>
                  <button onClick={() => setIsImportModalOpen(false)} className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-8 overflow-y-auto max-h-[70vh]">
                  {wizardStep === 'sheets' ? (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {discoveryData.sheets.map((sheet: any, idx: number) => (
                          <button 
                            key={sheet.name}
                            onClick={() => setSelectedSheetIndex(idx)}
                            className={`p-6 rounded-[2rem] border text-left transition-all ${
                              selectedSheetIndex === idx ? 'border-purple-500 bg-purple-50 ring-4 ring-purple-500/10' : 'border-gray-100 bg-gray-50/50'
                            }`}
                          >
                            <p className="text-[10px] font-black uppercase text-gray-400 mb-1">{sheet.rowCount} Records</p>
                            <h5 className="text-sm font-black text-gray-900 truncate">{sheet.name}</h5>
                          </button>
                        ))}
                      </div>

                      <div className="space-y-4">
                        <h5 className="text-[10px] font-black uppercase text-gray-400">Sheet Preview & Header Picker</h5>
                        <div className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50">
                          <div className="overflow-x-auto">
                            <table className="w-full text-[10px] font-medium text-gray-500">
                              <tbody>
                                {discoveryData.sheets[selectedSheetIndex].preview.slice(0, 15).map((row: any[], rIdx: number) => (
                                  <tr 
                                    key={rIdx} 
                                    onClick={() => {
                                      const sd = {...discoveryData};
                                      sd.sheets[selectedSheetIndex].suggestedHeaderIndex = rIdx;
                                      setDiscoveryData(sd);
                                      setHeaderRowIndex(rIdx);
                                    }}
                                    className={`cursor-pointer ${rIdx === discoveryData.sheets[selectedSheetIndex].suggestedHeaderIndex ? 'bg-purple-100 ring-2 ring-purple-500 z-10 relative' : 'hover:bg-gray-100'}`}
                                  >
                                    <td className="px-2 py-1 bg-gray-100 text-center font-bold border-r border-gray-200">{rIdx + 1}</td>
                                    {row.map((cell, cIdx) => (
                                      <td key={cIdx} className="px-3 py-2 whitespace-nowrap border-r border-gray-100 last:border-0">{String(cell || '')}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 italic">Click the row that contains the column headers (Name, ID, etc.).</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="max-w-md">
                        <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-2">Client Reference Label</label>
                        <input 
                          type="text"
                          placeholder="e.g. GAISANO"
                          value={clientLabel}
                          onChange={(e) => setClientLabel(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {systemFields.map((field) => (
                          <div key={field.key} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">{field.label}{field.required && '*'}</label>
                            <select 
                              value={fieldMapping[field.key] ?? ''}
                              onChange={(e) => setFieldMapping({...fieldMapping, [field.key]: parseInt(e.target.value)})}
                              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold appearance-none"
                            >
                              <option value="">Select Column...</option>
                              {discoveryData.sheets[selectedSheetIndex].headers.map((h: any) => (
                                <option key={h.index} value={h.index}>[{h.letter}] {h.name}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-8 border-t border-gray-100 flex justify-between bg-gray-50/30">
                  <button onClick={() => wizardStep === 'mapping' ? setWizardStep('sheets') : setIsImportModalOpen(false)} className="px-6 py-3 font-bold text-gray-500 hover:text-gray-700">
                    {wizardStep === 'mapping' ? 'Back' : 'Cancel'}
                  </button>
                  <button 
                    onClick={wizardStep === 'sheets' ? confirmSheet : processImport}
                    className="bg-primary text-white px-10 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center gap-3"
                  >
                    {wizardStep === 'sheets' ? 'Next: Map Columns' : 'Import Payroll Now'}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Main Interface */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-primary mb-1">
              <Database className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Financial Operations</span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Payroll Hub</h1>
          </div>

          <div className="bg-gray-100 p-1 rounded-2xl flex items-center">
            {['records', 'credentials'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs capitalize transition-all ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {tab === 'records' ? 'Master Records' : 'Portal Access'}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          {status && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-[2rem] border mb-8 flex items-center gap-4 shadow-xl ${status.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}
            >
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${status.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                {status.type === 'success' ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
              </div>
              <p className="text-sm font-black tracking-tight flex-1">{status.message}</p>
              <button onClick={() => setStatus(null)} className="text-[10px] font-black uppercase opacity-50 tracking-widest">Close</button>
            </motion.div>
          )}

          {activeTab === 'records' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Simplified Upload Card */}
                <div className="bg-white rounded-[3rem] border border-gray-200 shadow-sm p-10 flex flex-col items-center justify-center text-center">
                  <div className="h-16 w-16 rounded-2xl bg-blue-50 text-primary flex items-center justify-center mb-6">
                    <Upload className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Import Payroll Records</h3>
                  <p className="text-gray-500 text-xs max-w-sm mb-8">Select the dates and upload your Excel file to begin the interactive import.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md mb-8 text-left">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Period Start</label>
                      <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Period End</label>
                      <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold" />
                    </div>
                  </div>

                  <label className={`relative group cursor-pointer ${(!periodStart || !periodEnd) ? 'opacity-50 grayscale' : ''}`}>
                    <div className="bg-primary hover:bg-black text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 transition-all flex items-center gap-3">
                      {parsingHeaders ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {parsingHeaders ? 'Scanning File...' : 'Choose Excel File'}
                    </div>
                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={parsingHeaders || !periodStart || !periodEnd} />
                  </label>
                </div>

                {/* History Table */}
                <div className="bg-white rounded-[3rem] border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                    <h4 className="text-sm font-black uppercase tracking-widest text-gray-900">Recent Import History</h4>
                    <button onClick={fetchRuns} className="text-primary p-2 hover:bg-blue-50 rounded-lg"><RefreshCw className={`h-4 w-4 ${loadingRuns ? 'animate-spin' : ''}`} /></button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400">Reference / Label</th>
                          <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400">Date Range</th>
                          <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 text-right">Records</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {runs.length === 0 ? (
                          <tr><td colSpan={3} className="px-8 py-10 text-center text-gray-400 text-xs">No payroll runs found.</td></tr>
                        ) : (
                          runs.map((run) => (
                            <tr key={run.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-8 py-5">
                                <p className="text-xs font-black text-gray-900">{run.label || 'Standard Run'}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Imported {new Date(run.created_at).toLocaleDateString()}</p>
                              </td>
                              <td className="px-8 py-5">
                                <p className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md inline-block">
                                  {run.period_start} → {run.period_end}
                                </p>
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

              <div className="space-y-6">
                <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                   <h4 className="text-lg font-black mb-2 relative z-10">Employee Sync</h4>
                   <p className="text-gray-400 text-xs leading-relaxed mb-8 relative z-10">After importing, ensure you sync credentials to allow employees to see their payslips.</p>
                   <button onClick={() => setActiveTab('credentials')} className="w-full bg-white text-gray-900 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3">
                     <Users className="h-4 w-4" /> Manage Access
                   </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'credentials' && (
            <div className="bg-white rounded-[3rem] border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Search employee..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm font-bold" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleSync} disabled={loadingUsers || !latestRun} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                    {loadingUsers ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync Portal
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400">Employee</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400">Username</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400">Password</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loadingUsers && users.length === 0 ? (
                      <tr><td colSpan={3} className="px-8 py-20 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></td></tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr><td colSpan={3} className="px-8 py-20 text-center text-gray-400">No employees found.</td></tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center font-black text-xs uppercase">{user.fullName?.substring(0, 2)}</div>
                              <div><p className="text-sm font-black text-gray-900">{user.fullName}</p><p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">ID: {user.sys_id}</p></div>
                            </div>
                          </td>
                          <td className="px-8 py-6"><code className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">{user.username}</code></td>
                          <td className="px-8 py-6 text-sm font-mono text-gray-600">{user.password}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
