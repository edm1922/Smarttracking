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
  Table as TableIcon,
  LayoutTemplate
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function IntegratedPayrollAdmin() {
  const [activeTab, setActiveTab] = useState<'storage' | 'credentials' | 'sync'>('storage');
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
  const [clientLabel, setClientLabel] = useState('');

  // Storage UI State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Magic Sync State
  const [syncText, setSyncText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Storage Handlers
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !clientLabel || !periodStart || !periodEnd) return;
    
    setUploading(true);
    setStatus(null);
    
    try {
      const formData = new FormData();
      formData.append('client_name', clientLabel);
      formData.append('period_start', periodStart);
      formData.append('period_end', periodEnd);
      
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payroll/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setStatus({ type: 'success', message: `Successfully uploaded ${data.count} documents!` });
      setIsImportModalOpen(false);
      setSelectedFiles([]);
      fetchRuns();
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setUploading(false);
    }
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

  const handleBulkSync = async () => {
    if (!syncText.trim()) {
      setStatus({ type: 'error', message: 'Please paste the employee list first.' });
      return;
    }

    setIsSyncing(true);
    setStatus(null);

    try {
      const res = await fetch('/api/payroll/sync-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: syncText }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', message: `Successfully provisioned ${data.count} accounts!` });
        setSyncText('');
        fetchUsers();
      } else {
        throw new Error(data.error || 'Failed to sync employees');
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSync = async () => {
    setLoadingUsers(true);
    setStatus(null);
    try {
      await fetchUsers();
      await fetchRuns();
      setStatus({ type: 'success', message: 'Data refreshed successfully!' });
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
        
        {/* Document Upload Modal */}
        <AnimatePresence>
          {isImportModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/40 backdrop-blur-sm overflow-y-auto">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Upload Documents</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Smart Storage Batch</p>
                  </div>
                  <button onClick={() => setIsImportModalOpen(false)} className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Client / Company Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. GAISANO" 
                        value={clientLabel} 
                        onChange={(e) => setClientLabel(e.target.value)} 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Period Start</label>
                        <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Period End</label>
                        <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold" />
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary'); }}
                    onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-primary'); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-primary');
                      if (e.dataTransfer.files) {
                        setSelectedFiles(Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.pdf')));
                      }
                    }}
                    className="border-2 border-dashed border-gray-200 rounded-[2rem] p-12 text-center hover:border-primary/40 transition-colors cursor-pointer bg-gray-50/50"
                  >
                    {selectedFiles.length > 0 ? (
                      <div className="space-y-2">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm font-black text-gray-900">{selectedFiles.length} files selected</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Click to change selection</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-gray-300 mx-auto mb-4" />
                        <p className="text-sm font-bold text-gray-500">Drop PDF files here or click to browse</p>
                        <p className="text-[10px] font-bold text-gray-400 mt-2">Files should be named with Employee ID (e.g. CSC-1001.pdf)</p>
                      </>
                    )}
                    <input 
                      type="file" 
                      multiple 
                      className="hidden" 
                      accept=".pdf" 
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                    />
                  </div>
                </div>

                <div className="p-8 border-t border-gray-100 flex justify-end gap-4 bg-gray-50/30">
                  <button onClick={() => setIsImportModalOpen(false)} className="px-6 py-3 font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                  <button 
                    onClick={handleUpload}
                    disabled={uploading || selectedFiles.length === 0 || !clientLabel || !periodStart || !periodEnd}
                    className="bg-primary text-white px-10 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading ? 'Uploading...' : 'Start Upload'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Main Interface Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-primary mb-1">
              <Database className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Financial Documents</span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Smart Storage Hub</h1>
          </div>

          <div className="bg-gray-100 p-1 rounded-2xl flex items-center">
            <button 
              onClick={() => setActiveTab('storage')}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'storage' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Storage Hub
            </button>
            <button 
              onClick={() => setActiveTab('sync')}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'sync' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Account Sync
            </button>
            <button 
              onClick={() => setActiveTab('credentials')}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'credentials' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Portal Access
            </button>
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

          {activeTab === 'storage' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Upload Card */}
                <div className="bg-white rounded-[3rem] border border-gray-200 shadow-sm p-10 flex flex-col items-center justify-center text-center">
                  <div className="h-16 w-16 rounded-2xl bg-blue-50 text-primary flex items-center justify-center mb-6">
                    <LayoutTemplate className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Upload Files to Storage</h3>
                  <p className="text-gray-500 text-xs max-w-sm mb-8">Securely distribute PDF documents to your employees using smart filename matching.</p>

                  <button 
                    onClick={() => setIsImportModalOpen(true)}
                    className="bg-primary hover:bg-black text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 transition-all flex items-center gap-3"
                  >
                    <Plus className="h-4 w-4" />
                    New Storage Batch
                  </button>
                </div>

                {/* History Table */}
                <div className="bg-white rounded-[3rem] border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                    <h4 className="text-sm font-black uppercase tracking-widest text-gray-900">Storage History</h4>
                    <button onClick={fetchRuns} className="text-primary p-2 hover:bg-blue-50 rounded-lg"><RefreshCw className={`h-4 w-4 ${loadingRuns ? 'animate-spin' : ''}`} /></button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400">Company / Batch</th>
                          <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400">Period</th>
                          <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 text-right">Files</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {runs.length === 0 ? (
                          <tr><td colSpan={3} className="px-8 py-10 text-center text-gray-400 text-xs">No storage batches found.</td></tr>
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
                   <h4 className="text-lg font-black mb-2 relative z-10">Smart Sync</h4>
                   <p className="text-gray-400 text-xs leading-relaxed mb-8 relative z-10">Paste your employee list to instantly provision their personal document vaults.</p>
                   <button onClick={() => setActiveTab('sync')} className="w-full bg-white text-gray-900 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3">
                     <Plus className="h-4 w-4" /> Go to Account Sync
                   </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sync' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
               <div className="bg-white rounded-[3rem] border border-gray-200 shadow-sm p-10 space-y-8">
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Magic Account Sync</h3>
                    <p className="text-gray-500 text-sm mt-1">Paste your employee list below to instantly create portal accounts.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Paste List (Format: ID Name)</label>
                      <span className="text-[10px] font-bold text-primary bg-blue-50 px-2 py-1 rounded-md">Example: CSC-101 Juan Dela Cruz</span>
                    </div>
                    <textarea 
                      placeholder="CSC-1001 Juan Dela Cruz&#10;CSC-1002 Maria Santos..."
                      value={syncText}
                      onChange={(e) => setSyncText(e.target.value)}
                      className="w-full h-80 bg-gray-50 border border-gray-200 rounded-[2rem] p-8 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button 
                      onClick={handleBulkSync}
                      disabled={isSyncing || !syncText.trim()}
                      className="bg-primary text-white px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center gap-3 hover:bg-black transition-all disabled:opacity-50"
                    >
                      {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Sync Accounts Now
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
