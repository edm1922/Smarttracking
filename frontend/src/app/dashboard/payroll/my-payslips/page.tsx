'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/payroll/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  FileText, 
  Calendar, 
  ShieldCheck,
  Search,
  User as UserIcon,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
  Loader2,
  RefreshCw,
  Plus
} from 'lucide-react';

export default function IntegratedEmployeePayslips() {
  const [user, setUser] = useState<any>(null);
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('all');
  const [selectedLabel, setSelectedLabel] = useState<string>('all');
  const [isAdminView, setIsAdminView] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selection State
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  
  // Revision Modal State
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionFile, setRevisionFile] = useState<File | null>(null);
  const [revisionRemark, setRevisionRemark] = useState('');
  const [revising, setRevising] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const revisionFileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const storedRole = localStorage.getItem('role');
      const isAdmin = storedRole === 'payroll_admin' || storedRole === 'admin';
      setIsAdminView(isAdmin);

      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;
      setUser(authUser);

      if (isAdmin || authUser) {
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
        
        // 1. Fetch Runs (StorageBatches)
        const runsRes = await fetch(`${apiUrl}/payroll/runs`);
        if (runsRes.ok) {
          const runsData = await runsRes.json();
          setRuns(runsData);
        }

        // 2. Fetch Entries (Documents)
        if (isAdmin) {
          const slipsRes = await fetch(`${apiUrl}/payroll/all-payslips`);
          if (slipsRes.ok) setSlips(await slipsRes.json());
        } else {
          // Try to get sys_id from localStorage if metadata fails (for portal users)
          const portalUser = JSON.parse(localStorage.getItem('portalUser') || '{}');
          const sysId = authUser?.user_metadata?.sys_id || portalUser.sys_id;
          
          if (sysId) {
            const slipsRes = await fetch(`${apiUrl}/payroll/my-payslips/${sysId}`);
            if (slipsRes.ok) setSlips(await slipsRes.json());
          }
        }
      }
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
  };

  const filteredSlips = slips.filter(slip => {
    if (selectedRunId !== 'all' && slip.batch?.id !== selectedRunId) return false;
    if (selectedLabel !== 'all' && (slip.batch?.label || 'General') !== selectedLabel) return false;
    const search = searchTerm.toLowerCase();
    const name = (slip.fullName || '').toLowerCase();
    const sysId = (slip.sys_id || '').toLowerCase();
    return name.includes(search) || sysId.includes(search);
  });

  const uniqueLabels = Array.from(new Set(runs.map(r => r.label || 'General')));

  const toggleDocSelection = (id: string) => {
    setSelectedDocs(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleRevisionSubmit = async () => {
    if (!revisionFile || selectedDocs.length === 0 || selectedRunId === 'all') {
      setStatus({ type: 'error', message: 'Please select a specific Period and at least one employee first.' });
      return;
    }

    setRevising(true);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append('batchId', selectedRunId);
      formData.append('remark', revisionRemark);
      formData.append('file', revisionFile);
      
      // Get sys_ids for selected docs
      const selectedSysIds = slips
        .filter(s => selectedDocs.includes(s.id))
        .map(s => s.sys_id);
      
      formData.append('selectedSysIds', JSON.stringify(selectedSysIds));

      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/payroll/revise`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Revision failed');

      setStatus({ type: 'success', message: 'Revision processed successfully!' });
      setIsRevisionModalOpen(false);
      setRevisionFile(null);
      setRevisionRemark('');
      setSelectedDocs([]);
      fetchData();
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setRevising(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Revision Modal */}
      <AnimatePresence>
        {isRevisionModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Revise Documents</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Replacing {selectedDocs.length} selected records</p>
                </div>
                <button onClick={() => setIsRevisionModalOpen(false)} className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Revision Remark</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Corrected Overtime computation" 
                      value={revisionRemark} 
                      onChange={(e) => setRevisionRemark(e.target.value)} 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" 
                    />
                  </div>
                  
                  <div 
                    onClick={() => revisionFileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer bg-gray-50/50"
                  >
                    {revisionFile ? (
                      <div className="flex items-center justify-center gap-3 text-emerald-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-sm font-black">{revisionFile.name}</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 text-gray-300 mx-auto" />
                        <p className="text-xs font-bold text-gray-500">Select PDF to extract revised pages from</p>
                      </div>
                    )}
                    <input type="file" hidden accept=".pdf" ref={revisionFileInputRef} onChange={(e) => setRevisionFile(e.target.files?.[0] || null)} />
                  </div>
                </div>

                <button 
                  onClick={handleRevisionSubmit}
                  disabled={revising || !revisionFile}
                  className="w-full bg-gray-900 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {revising ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {revising ? 'Processing Revision...' : 'Apply Revision'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{isAdminView ? 'Payroll Management' : 'Employee Benefits'}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {isAdminView ? 'Manage Payslips' : 'My Documents'}
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
            <select 
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
              className="pl-12 pr-10 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-black focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all appearance-none min-w-[200px]"
            >
              <option value="all">All Periods</option>
              {runs.map(run => (
                <option key={run.id} value={run.id}>
                  {run.label || 'Batch'} ({formatDate(run.period_start)})
                </option>
              ))}
            </select>
          </div>

          {isAdminView && (
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="text"
                placeholder="Search Name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-6 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all w-full md:w-64"
              />
            </div>
          )}
        </div>
      </div>

      {status && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-2xl border flex items-center gap-3 ${status.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {status.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <p className="text-xs font-bold">{status.message}</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-primary rounded-[2.5rem] p-8 text-white shadow-xl shadow-primary/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-xl"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-100 mb-4 opacity-70">Filtered Documents</p>
            <h3 className="text-4xl font-black mb-1 leading-none tracking-tight">{filteredSlips.length}</h3>
            
            {isAdminView && selectedDocs.length > 0 && (
              <motion.button 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => setIsRevisionModalOpen(true)}
                className="mt-6 w-full bg-white text-primary py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <Plus className="h-3 w-3" />
                Revise {selectedDocs.length} Selected
              </motion.button>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {filteredSlips.length > 0 ? filteredSlips.map((slip) => (
                <div key={slip.id} className={`p-6 hover:bg-gray-50 transition-colors ${selectedDocs.includes(slip.id) ? 'bg-blue-50/50' : ''}`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      {isAdminView && (
                        <input 
                          type="checkbox" 
                          checked={selectedDocs.includes(slip.id)}
                          onChange={() => toggleDocSelection(slip.id)}
                          className="h-5 w-5 rounded-md border-gray-300 text-primary focus:ring-primary"
                        />
                      )}
                      <div className="flex items-center gap-6">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${selectedDocs.includes(slip.id) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                          {isAdminView ? <UserIcon className="h-6 w-6" /> : <Calendar className="h-6 w-6" />}
                        </div>
                        <div>
                          <div className="flex flex-col">
                            <h4 className="text-sm font-black text-gray-900">
                              {isAdminView 
                                ? (slip.user?.fullName || slip.sys_id) 
                                : `${formatDate(slip.batch?.period_start)} — ${formatDate(slip.batch?.period_end)}`}
                            </h4>
                            <div className="flex items-center gap-2">
                              {isAdminView && <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">{slip.sys_id}</span>}
                              {isAdminView && <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase">{formatDate(slip.batch?.period_start)}</span>}
                            </div>
                          </div>
                          {slip.remark && (
                            <div className="flex items-center gap-1.5 mt-1.5 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg w-fit">
                              <AlertCircle className="h-3 w-3" />
                              <span className="text-[10px] font-black uppercase tracking-tight">{slip.remark}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-4 mt-1">
                             <span className="text-xs font-bold text-primary">{slip.file_name}</span>
                             <span className="text-[10px] text-gray-400 font-medium border-l border-gray-200 pl-4 uppercase tracking-widest">
                               {isAdminView ? 'PDF Document' : `Released: ${slip.batch?.release_date ? formatDate(slip.batch.release_date) : formatDate(slip.created_at)}`}
                             </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <a 
                      href={slip.storage_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg shadow-black/5 bg-gray-900 text-white hover:bg-black"
                    >
                      <FileText className="h-4 w-4" />
                      View Document
                    </a>
                  </div>
                </div>
              )) : (
                <div className="py-20 text-center">
                  <FileText className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                    {searchTerm ? `No records found for "${searchTerm}"` : 'No documents available yet.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
