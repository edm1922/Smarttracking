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
import { QRCodeSVG } from 'qrcode.react';
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
  const [releaseDate, setReleaseDate] = useState('');
  const [clientLabel, setClientLabel] = useState('');

  // History Filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyStart, setHistoryStart] = useState('');
  const [historyEnd, setHistoryEnd] = useState('');

  // Storage UI State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Magic Sync State
  const [syncText, setSyncText] = useState('');
  const [syncLabel, setSyncLabel] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

  // Company management state
  const [companies, setCompanies] = useState<any[]>([]);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('all');

  // Storage Handlers
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [remark, setRemark] = useState('');
  const [resumableBatchId, setResumableBatchId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !clientLabel || !periodStart || !periodEnd) return;
    if (!window.confirm("Are you sure you want to start this upload?")) return;

    setUploading(true);
    setStatus(null);

    try {
      const file = selectedFiles[0];
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

      // 1. Get signed upload URL from backend
      const urlRes = await fetch(`${apiUrl}/payroll/get-upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name })
      });
      const { signedUrl, filePath } = await urlRes.json();
      if (!urlRes.ok) throw new Error('Failed to get secure upload slot');

      // 2. Upload directly to Supabase via signed URL
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });
      if (!uploadRes.ok) throw new Error('Secure file upload failed');

      // 3. Tell backend to process the uploaded file
      const res = await fetch(`${apiUrl}/payroll/process-uploaded`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath,
          client_name: clientLabel,
          period_start: periodStart,
          period_end: periodEnd,
          release_date: releaseDate,
          remark: remark,
          resumeBatchId: resumableBatchId
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Processing failed');

      setStatus({ type: 'success', message: `Successfully processed ${data.details?.length || 0} documents!` });
      setIsImportModalOpen(false);
      setSelectedFiles([]);
      setRemark(''); // Clear remark after success
      setReleaseDate(''); // Clear release date
      setResumableBatchId(null); // Clear resumable state
      fetchRuns();
    } catch (err: any) {
      console.error('Upload error:', err);

      // Check if we can resume by looking at the latest run
      try {
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
        const latestRes = await fetch(`${apiUrl}/payroll/latest-run`);
        const latest = await latestRes.json();

        // Match criteria: label/clientName and periods must match
        const formLabel = clientLabel || '';
        const batchLabel = latest?.label || latest?.client_name || '';

        if (latest &&
          batchLabel === formLabel &&
          latest.period_start && new Date(latest.period_start).toISOString().split('T')[0] === periodStart &&
          latest.period_end && new Date(latest.period_end).toISOString().split('T')[0] === periodEnd) {

          setResumableBatchId(latest.id);
          setStatus({
            type: 'error',
            message: "System limit reached. Kindly upload again to continue where you left off."
          });
          setUploading(false);
          return;
        }
      } catch (checkErr) {
        console.error('Failed to check for resumable batch:', checkErr);
      }

      setStatus({ type: 'error', message: err.message });
    } finally {
      setUploading(false);
    }
  };

  const fetchRuns = async () => {
    setLoadingRuns(true);
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/payroll/runs`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      if (res.ok && Array.isArray(data)) setRuns(data);
    } catch (err) {
      console.error('Failed to fetch runs:', err);
    } finally {
      setLoadingRuns(false);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!window.confirm("Are you sure you want to revoke and delete this entire batch? This action cannot be undone and will remove all associated documents from the database and storage.")) {
      return;
    }

    setStatus(null);
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/payroll/batch/${batchId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete batch');

      setStatus({ type: 'success', message: 'Batch successfully revoked and deleted.' });
      fetchRuns();
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    }
  };

  const handleDeleteEmployee = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this employee portal access?")) {
      return;
    }

    setStatus(null);
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/payroll/users/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete employee');

      setStatus({ type: 'success', message: 'Employee successfully deleted.' });
      fetchUsers();
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    }
  };

  const handleBulkDeleteEmployees = async () => {
    if (filteredUsers.length === 0) return;
    
    const count = filteredUsers.length;
    const labelText = selectedCredentialLabel === 'all' ? 'all employees' : `all employees under ${selectedCredentialLabel}`;
    
    if (!window.confirm(`Are you sure you want to delete ${count} employees (${labelText})? This action cannot be undone.`)) {
      return;
    }

    setStatus(null);
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const ids = filteredUsers.map(u => u.id);
      
      const res = await fetch(`${apiUrl}/payroll/users-bulk`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete employees');

      setStatus({ type: 'success', message: `Successfully deleted ${count} employees.` });
      fetchUsers();
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    }
  };

  const fetchLatestRun = async () => {
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/payroll/latest-run`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (res.ok && data) setLatestRun(data);
    } catch (err) {
      console.error('Failed to fetch latest run:', err);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/payroll/users`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      if (res.ok) setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/payroll/companies`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    }
  };

  const handleSaveCompany = async () => {
    if (!newCompanyName.trim()) return;
    setIsSavingCompany(true);
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/payroll/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCompanyName }),
      });
      if (res.ok) {
        setNewCompanyName('');
        await fetchCompanies();
        setStatus({ type: 'success', message: 'Company label saved successfully!' });
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setIsSavingCompany(false);
    }
  };

  useEffect(() => {
    fetchLatestRun();
    fetchRuns();
    fetchCompanies();
    if (activeTab === 'credentials') fetchUsers();
  }, [activeTab]);

  // Poll for upload progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (uploading) {
      interval = setInterval(() => {
        fetchRuns();
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [uploading]);

  const handleBulkSync = async () => {
    if (!syncText.trim()) {
      setStatus({ type: 'error', message: 'Please paste the employee list first.' });
      return;
    }
    if (!window.confirm("Are you sure you want to start syncing these accounts?")) return;

    setIsSyncing(true);
    setStatus(null);
    setSyncProgress({ current: 0, total: 0 });

    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const lines = syncText.split('\n').filter(l => l.trim().length > 0);
      const totalLines = lines.length;
      let processedCount = 0;

      setSyncProgress({ current: 0, total: totalLines });

      const chunkSize = 50;
      for (let i = 0; i < totalLines; i += chunkSize) {
        const chunk = lines.slice(i, i + chunkSize).join('\n');
        const res = await fetch(`${apiUrl}/payroll/sync-bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: chunk, label: syncLabel }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to sync employees chunk');
        }

        processedCount += data.count || 0;
        setSyncProgress({ current: Math.min(i + chunkSize, totalLines), total: totalLines });
      }

      setStatus({ type: 'success', message: `Successfully provisioned ${processedCount} accounts!` });
      setSyncText('');
      setSyncLabel('');
      fetchUsers();
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncProgress({ current: 0, total: 0 }), 3000);
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
    return matchesSearch && user.company_label === selectedCredentialLabel;
  });

  const filteredHistoryRuns = runs.filter(run => {
    let matches = true;
    if (historySearch) {
      const label = (run.label || 'Standard Run').toLowerCase();
      matches = matches && label.includes(historySearch.toLowerCase());
    }
    if (historyStart) {
      matches = matches && new Date(run.period_start) >= new Date(historyStart);
    }
    if (historyEnd) {
      matches = matches && new Date(run.period_end) <= new Date(historyEnd);
    }
    if (selectedCompanyFilter !== 'all') {
      matches = matches && (run.label === selectedCompanyFilter || run.client_name === selectedCompanyFilter);
    }
    return matches;
  });

  const uniqueLabels = Array.from(new Set([
    ...(users || []).map(u => u.company_label),
    ...(runs || []).map(r => r.label)
  ].filter(Boolean)));

  return (
    <ErrorBoundary>
      <div className="space-y-8 animate-in fade-in duration-500 relative">
        <datalist id="existing-labels">
          {uniqueLabels.map((label: any) => (
            <option key={label} value={label} />
          ))}
        </datalist>

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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">New Client / Company</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Type new name..."
                            value={newCompanyName}
                            onChange={(e) => setNewCompanyName(e.target.value)}
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <button
                            onClick={handleSaveCompany}
                            disabled={isSavingCompany || !newCompanyName.trim()}
                            className="bg-gray-900 text-white p-3 rounded-xl disabled:opacity-50 hover:bg-black transition-colors"
                          >
                            {isSavingCompany ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Select Existing Client</label>
                        <div className="relative">
                          <select
                            value={clientLabel}
                            onChange={(e) => setClientLabel(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="">-- Choose Client --</option>
                            {companies.map(c => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Period Start</label>
                        <input
                          type="date"
                          lang="en-US"
                          disabled={!clientLabel}
                          value={periodStart}
                          onChange={(e) => setPeriodStart(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Period End</label>
                        <input
                          type="date"
                          lang="en-US"
                          disabled={!clientLabel}
                          value={periodEnd}
                          onChange={(e) => setPeriodEnd(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-50"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Release Date</label>
                      <input
                        type="date"
                        lang="en-US"
                        disabled={!clientLabel}
                        value={releaseDate}
                        onChange={(e) => setReleaseDate(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Remark / Note (Optional)</label>
                      <input
                        type="text"
                        disabled={!clientLabel}
                        placeholder="e.g. Regular Payroll, Adjusted OT, etc."
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div
                    onClick={() => clientLabel && fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      if (!clientLabel) return;
                      e.preventDefault();
                      e.currentTarget.classList.add('border-primary');
                    }}
                    onDragLeave={(e) => {
                      if (!clientLabel) return;
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-primary');
                    }}
                    onDrop={(e) => {
                      if (!clientLabel) return;
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-primary');
                      if (e.dataTransfer.files) {
                        setSelectedFiles(Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.pdf')));
                      }
                    }}
                    className={`border-2 border-dashed border-gray-200 rounded-[2rem] p-12 text-center transition-all bg-gray-50/50 ${!clientLabel ? 'opacity-30 cursor-not-allowed' : 'hover:border-primary/40 cursor-pointer'}`}
                  >
                    {!clientLabel ? (
                      <div className="space-y-2">
                        <ShieldAlert className="h-10 w-10 text-gray-300 mx-auto mb-4" />
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Select Client First</p>
                      </div>
                    ) : selectedFiles.length > 0 ? (
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
                  {uploading && runs.length > 0 && (
                    <div className="flex-1 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">Processing pages...</p>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">{runs[0]?._count?.documents || 0} pages uploaded</p>
                      </div>
                    </div>
                  )}
                  <button onClick={() => setIsImportModalOpen(false)} disabled={uploading} className="px-6 py-3 font-bold text-gray-500 hover:text-gray-700 disabled:opacity-50">Cancel</button>
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
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
              disabled={runs.length === 0}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'sync' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'} ${runs.length === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
              title={runs.length === 0 ? "Upload a PDF first to enable account sync" : ""}
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
                  <div className="p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h4 className="text-sm font-black uppercase tracking-widest text-gray-900">Storage History</h4>

                    <div className="flex items-center gap-3">
                      <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 group-focus-within:text-primary transition-colors" />
                        <input
                          type="text"
                          placeholder="Search Label..."
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all w-36"
                        />
                      </div>

                      <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5">
                        <Calendar className="h-3.5 w-3.5 text-gray-400 ml-1" />
                        <input
                          type="date"
                          value={historyStart}
                          onChange={(e) => setHistoryStart(e.target.value)}
                          className="bg-transparent border-none text-[10px] font-bold text-gray-600 focus:outline-none w-[90px]"
                        />
                        <span className="text-gray-300">-</span>
                        <input
                          type="date"
                          value={historyEnd}
                          onChange={(e) => setHistoryEnd(e.target.value)}
                          className="bg-transparent border-none text-[10px] font-bold text-gray-600 focus:outline-none w-[90px]"
                        />
                      </div>

                      <div className="relative">
                        <select
                          value={selectedCompanyFilter}
                          onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                          className="appearance-none bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-10 py-2 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="all">All Clients</option>
                          {companies.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                      </div>

                      <button onClick={fetchRuns} className="text-primary p-2 hover:bg-blue-50 rounded-lg"><RefreshCw className={`h-4 w-4 ${loadingRuns ? 'animate-spin' : ''}`} /></button>
                    </div>
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
                        {filteredHistoryRuns.length === 0 ? (
                          <tr><td colSpan={3} className="px-8 py-10 text-center text-gray-400 text-xs">No storage batches found.</td></tr>
                        ) : (
                          filteredHistoryRuns.map((run) => (
                            <tr key={run.id} onDoubleClick={() => handleDeleteBatch(run.id)} className="hover:bg-gray-50/50 transition-colors cursor-pointer group relative" title="Double click to revoke and delete batch">
                              <td className="px-8 py-5">
                                <p className="text-xs font-black text-gray-900">{run.label || 'Standard Run'}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Imported {new Date(run.created_at).toLocaleDateString()}</p>
                              </td>
                              <td className="px-8 py-5">
                                <p className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md inline-block">
                                  {new Date(run.period_start).toLocaleDateString()} → {new Date(run.period_end).toLocaleDateString()}
                                </p>
                              </td>
                              <td className="px-8 py-5 text-right">
                                <span className="text-xs font-black text-primary">{run._count?.documents || 0}</span>
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
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Account Sync</h3>
                  <p className="text-gray-500 text-sm mt-1">Paste your employee list below to instantly create portal accounts.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Company Label (Matches Storage Label)</label>
                    <div className="relative">
                      <select
                        value={syncLabel}
                        onChange={(e) => setSyncLabel(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-primary/20 text-gray-700"
                      >
                        <option value="">-- Choose Client --</option>
                        {companies.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
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

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {isSyncing && syncProgress.total > 0 && (
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-xs font-black text-primary uppercase tracking-widest">
                          Syncing: {syncProgress.current} / {syncProgress.total} lines
                        </span>
                      </div>
                    )}
                  </div>
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
            <div className="bg-white rounded-[3rem] border border-gray-200 shadow-sm overflow-hidden print:overflow-visible print:border-none print:shadow-none print:rounded-none">
              <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Search employee..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm font-bold" />
                  </div>
                  <div className="relative">
                    <select
                      value={selectedCredentialLabel}
                      onChange={(e) => setSelectedCredentialLabel(e.target.value)}
                      className="appearance-none bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-10 py-3 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="all">All Labels</option>
                      {uniqueLabels.map((label: any) => (
                        <option key={label} value={label}>{label}</option>
                      ))}
                    </select>
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end mr-4 hidden md:flex">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Employees</span>
                    <span className="text-xl font-black text-primary leading-none">{filteredUsers.length}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => window.print()}
                      className="bg-gray-50 text-gray-900 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border border-gray-200 hover:bg-gray-100 transition-all flex items-center gap-2"
                    >
                      <Printer className="h-4 w-4" /> Print
                    </button>
                    {filteredUsers.length > 0 && (
                      <button 
                        onClick={handleBulkDeleteEmployees}
                        className="bg-red-50 text-red-600 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border border-red-100 hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" /> Bulk Delete
                      </button>
                    )}
                    <button 
                      onClick={() => setActiveTab('sync')}
                      className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-black transition-all flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" /> Sync Portal
                    </button>
                  </div>
                </div>
              </div>

              <div className="hidden print:block p-8 border-b border-gray-200">
                <h2 className="text-2xl font-black text-gray-900">Portal Credentials</h2>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-sm text-gray-500 font-bold">Filtered by: {selectedCredentialLabel === 'all' ? 'All Employees' : selectedCredentialLabel}</p>
                  <p className="text-sm text-gray-900 font-black">Total: {filteredUsers.length} employees</p>
                </div>
              </div>

              <div className="overflow-x-auto print:overflow-visible">
                {loadingUsers && users.length === 0 ? (
                  <div className="p-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-20 text-center text-gray-400">No employees found.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8 print:grid-cols-2 print:gap-4 print:p-0 print:mt-4">
                    {filteredUsers.map((user) => (
                      <div key={user.id} className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center print:break-inside-avoid print:shadow-none print:border-gray-300 relative overflow-hidden group">
                        <button 
                          onClick={() => handleDeleteEmployee(user.id)}
                          className="absolute top-4 left-4 p-2 bg-red-50 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white z-10 print:hidden"
                          title="Delete Employee Access"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-full -mr-12 -mt-12 blur-xl pointer-events-none"></div>

                        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm mb-4">
                          <QRCodeSVG value="https://smarttracking-frontend.vercel.app/portal" size={80} level="H" className="text-gray-900" />
                        </div>

                        <h3 className="font-black text-gray-900 text-sm mb-0.5 leading-tight">{user.fullName}</h3>
                        <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-4 bg-blue-50 px-2 py-0.5 rounded-full">{user.company_label || 'Company'} / {user.sys_id}</p>

                        <div className="w-full bg-gray-50 rounded-2xl p-4 text-left border border-gray-100/50 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Username</span>
                            <code className="text-xs font-bold text-gray-900 bg-white px-2 py-1 rounded-md border border-gray-200">{user.username}</code>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Password</span>
                            <code className="text-xs font-mono font-bold text-gray-600 bg-white px-2 py-1 rounded-md border border-gray-200">{user.password}</code>
                          </div>
                        </div>

                        <p className="text-[8px] font-bold text-gray-400 mt-4 tracking-widest uppercase">https://smarttracking-frontend.vercel.app/portal</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
