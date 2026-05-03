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
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [uploadLabel, setUploadLabel] = useState('');

  const fetchRuns = async () => {
    setLoadingRuns(true);
    try {
      const res = await fetch('/api/payroll/runs');
      const data = await res.json();
      if (res.ok) setRuns(data);
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

  useEffect(() => {
    fetchLatestRun();
    fetchRuns();
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

    if (!uploadLabel.trim()) {
      setStatus({ 
        type: 'error', 
        message: 'Please provide a Label for this payroll run before uploading (e.g. "Gaisano Mall Staff").' 
      });
      // Reset file input
      e.target.value = '';
      return;
    }

    setUploading(true);
    setStatus(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('label', uploadLabel);

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
        setUploadLabel(''); // Clear label on success
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
      fetchLatestRun(); // Update run info
      fetchRuns(); // Refresh history
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

  const filteredUsers = users.filter(user => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = (
      user.fullName?.toLowerCase().includes(search) ||
      user.sys_id?.toLowerCase().includes(search) ||
      user.username?.toLowerCase().includes(search)
    );

    if (selectedCredentialLabel === 'all') return matchesSearch;

    const runIdsWithLabel = runs
      .filter(r => (r.label || 'General') === selectedCredentialLabel)
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

                <div className="w-full max-w-xs mb-6">
                  <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-2 text-left ml-1">Run Label (Required)</label>
                  <input 
                    type="text"
                    placeholder="e.g. Gaisano Employee Run"
                    value={uploadLabel}
                    onChange={(e) => setUploadLabel(e.target.value)}
                    list="existing-labels"
                    className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${!uploadLabel.trim() ? 'border-amber-200' : 'border-gray-200'}`}
                  />
                  <datalist id="existing-labels">
                    {Array.from(new Set(runs.map(r => r.label).filter(Boolean))).map(label => (
                      <option key={label} value={label} />
                    ))}
                  </datalist>
                </div>
                
                <label className={`relative group cursor-pointer ${!uploadLabel.trim() ? 'opacity-50 grayscale' : ''}`}>
                  <div className="bg-primary hover:bg-primary-dark text-white px-10 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-3">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    {uploading ? 'Processing Run...' : 'Select Payroll File'}
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".xlsx, .xls, .xlsb, .csv" 
                    onChange={handleFileUpload} 
                    disabled={uploading || !uploadLabel.trim()} 
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
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Label</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Period</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Records</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {loadingRuns && runs.length === 0 ? (
                        <tr><td colSpan={4} className="px-8 py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></td></tr>
                      ) : runs.length === 0 ? (
                        <tr><td colSpan={4} className="px-8 py-10 text-center text-gray-400 text-sm font-medium">No payroll runs found.</td></tr>
                      ) : (
                        runs.map((run) => (
                          <tr key={run.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-8 py-5">
                              <p className="text-xs font-black text-gray-900">{new Date(run.created_at).toLocaleDateString()}</p>
                            </td>
                            <td className="px-8 py-5">
                              <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">{run.label || 'General'}</span>
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
