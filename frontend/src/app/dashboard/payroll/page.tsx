'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { PageHeaderSkeleton } from '@/components/ui/LoadingSkeletons';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { toast } from 'sonner';

import { PayrollHeader } from './components/PayrollHeader';
import { PayrollStorageTab } from './components/PayrollStorageTab';
import { PayrollCredentialsTab } from './components/PayrollCredentialsTab';
import { PayrollSyncTab } from './components/PayrollSyncTab';
import { PayrollImportModal } from './components/PayrollImportModal';
import { PayrollRun, PayrollUser, Company, PayrollRequest } from './components/PayrollTypes';

export default function IntegratedPayrollAdmin() {
  return (
    <Suspense fallback={<div className="p-10"><PageHeaderSkeleton /></div>}>
      <PayrollContent />
    </Suspense>
  );
}

function PayrollContent() {
  const [activeTab, setActiveTab] = useState<'storage' | 'credentials' | 'sync'>('storage');
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Data state
  const [users, setUsers] = useState<PayrollUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCredentialLabel, setSelectedCredentialLabel] = useState('all');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [processingBatchIds, setProcessingBatchIds] = useState<string[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PayrollRequest[]>([]);
  
  // Form State
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [clientLabel, setClientLabel] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [remark, setRemark] = useState('');
  const [resumableBatchId, setResumableBatchId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Sync State
  const [syncText, setSyncText] = useState('');
  const [syncLabel, setSyncLabel] = useState('');
  const [isProcessingSync, setIsProcessingSync] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

  // Company management state
  const [newCompanyName, setNewCompanyName] = useState('');
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // Auth State
  const [userRole, setUserRole] = useState<string>('admin');
  const [userId, setUserId] = useState<string>('');

  // Modal Config
  const [modalConfig, setModalConfig] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const isStaff = userRole.toLowerCase() === 'payroll_staff';
  const isAdmin = userRole.toLowerCase() === 'admin' || userRole.toLowerCase() === 'payroll_admin';

  // Refs for throttling
  const prevProcessingIds = useRef<string[]>([]);
  const lastRunsFetch = useRef(0);
  const lastResumeAttempt = useRef<Record<string, number>>({});

  // API Fetches
  const fetchRuns = async () => {
    setLoadingRuns(true);
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/payroll/runs`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setRuns(data);
    } catch (err) { console.error('Failed to fetch runs:', err); }
    finally { setLoadingRuns(false); }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/payroll/users`);
      const data = await res.json();
      if (res.ok) setUsers(data);
    } catch (err) { console.error('Failed to fetch users:', err); }
    finally { setLoadingUsers(false); }
  };

  const fetchCompanies = async () => {
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/payroll/companies`);
      if (res.ok) setCompanies(await res.json());
    } catch (err) { console.error('Failed to fetch companies:', err); }
  };

  const fetchPendingRequests = async () => {
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/payroll/requests/pending`);
      if (res.ok) setPendingRequests(await res.json());
    } catch (err) { console.error('Failed to fetch pending requests:', err); }
  };

  const fetchProcessingStatus = async () => {
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/payroll/processing-status`);
      if (res.ok) {
        const ids = await res.json();
        const prev = prevProcessingIds.current;
        const started = ids.some((id: string) => !prev.includes(id));
        const finished = prev.some((id: string) => !ids.includes(id));
        const now = Date.now();

        // Fetch runs more often during active processing (10s instead of 30s)
        if (started || finished || (ids.length > 0 && now - lastRunsFetch.current > 10000)) {
          lastRunsFetch.current = now;
          fetchRuns();
        }
        prevProcessingIds.current = ids;
        setProcessingBatchIds(ids);

        // Auto-resume partial batches (Vercel Hobby 10s timeout workaround)
        if (ids.length > 0 && runs.length > 0) {
          for (const batchId of ids) {
            const batch = runs.find((r) => r.id === batchId);
            if (!batch) continue;
            const totalPagesMatch = batch.remark?.match(/\[TOTAL_PAGES:(\d+)\]/);
            const total = totalPagesMatch ? parseInt(totalPagesMatch[1], 10) : 0;
            const done = batch._count?.documents || 0;
            if (total > 0 && done < total) {
              const lastTry = lastResumeAttempt.current[batchId] || 0;
              if (now - lastTry > 15000) {
                lastResumeAttempt.current[batchId] = now;
                fetch(`${apiUrl}/payroll/process-uploaded`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ resumeBatchId: batchId }),
                }).catch(() => {});
              }
            }
          }
        }
      }
    } catch (err) { console.error('Failed to fetch processing status:', err); }
  };

  useEffect(() => {
    const role = (localStorage.getItem('role') || 'admin').toLowerCase();
    const id = localStorage.getItem('userId') || '';
    setUserRole(role);
    setUserId(id);

    fetchRuns();
    fetchCompanies();
    if (activeTab === 'credentials') fetchUsers();
    if (role === 'admin' || role === 'payroll_admin') fetchPendingRequests();
    
    fetchProcessingStatus();
    const interval = setInterval(fetchProcessingStatus, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Handlers
  const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 120000) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      return res;
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  };

  const handleUpload = async () => {
    if (isStaff) {
      await handleRequestUploadApproval();
      return;
    }
    setModalConfig({
      isOpen: true,
      title: "Initialize Ingestion",
      message: "Upload the PDF to the secure cloud storage, then process each page in the background. This may take a few minutes for large files.",
      confirmText: "Initialize",
      onConfirm: executeUpload,
    });
  };

  const executeUpload = async () => {
    setUploading(true);
    setModalConfig((prev: any) => ({ ...prev, isOpen: false }));
    try {
      const file = selectedFiles[0];
      if (!file) throw new Error('No file selected');
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      if (!apiUrl) throw new Error('API URL is not configured');

      // Step 1: Get signed upload URL
      const urlRes = await fetchWithTimeout(`${apiUrl}/payroll/get-upload-url`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name })
      });
      if (!urlRes.ok) throw new Error(`Failed to get upload URL: ${urlRes.status} ${urlRes.statusText}`);
      const { signedUrl, filePath } = await urlRes.json();
      if (!signedUrl) throw new Error('Invalid signed URL response from server');

      // Step 2: Upload PDF to Supabase via signed URL
      const uploadRes = await fetchWithTimeout(signedUrl, {
        method: 'PUT', body: file, headers: { 'Content-Type': file.type }
      }, 300000);
      if (!uploadRes.ok) throw new Error(`Upload to cloud storage failed: ${uploadRes.status} ${uploadRes.statusText}`);

      // Step 3: Tell backend to process the uploaded file
      const processRes = await fetchWithTimeout(`${apiUrl}/payroll/process-uploaded`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, client_name: clientLabel, period_start: periodStart, period_end: periodEnd, release_date: releaseDate })
      });
      if (!processRes.ok) throw new Error(`Failed to start background processing: ${processRes.status} ${processRes.statusText}`);

      setIsImportModalOpen(false);
      setSelectedFiles([]);
      fetchRuns();
      toast.success('PDF uploaded! Processing in background — check runs table for status.');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        toast.error('Upload timed out. The file may be too large — try a smaller PDF.');
      } else {
        toast.error(err.message || 'Upload failed. Please try again.');
      }
    }
    finally { setUploading(false); }
  };

  const handleRequestUploadApproval = async () => {
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/payroll/requests`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, type: 'UPLOAD', clientName: clientLabel, periodStart, periodEnd, releaseDate, remark })
      });
      if (res.ok) {
        setIsImportModalOpen(false);
        toast.success('Upload request sent for administrative approval.');
      }
    } catch (err: any) { toast.error(err.message); }
  };

  const handleRespondToRequest = async (requestId: string, approved: boolean) => {
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/payroll/requests/${requestId}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: approved ? 'APPROVED' : 'REJECTED' })
      });
      if (res.ok) {
        toast.success(`Staff request ${approved ? 'approved' : 'rejected'}.`);
        fetchPendingRequests();
        fetchRuns();
      }
    } catch (err: any) { toast.error(err.message); }
  };

  const handleStopProcessing = async (batchId: string) => {
    setModalConfig({
      isOpen: true, title: "Halt Operation", message: "Terminate background processing for this batch? Partial data already synchronized will persist.",
      confirmText: "Halt Operation", isDestructive: true,
      onConfirm: async () => {
        setModalConfig((prev: any) => ({ ...prev, isOpen: false }));
        try {
          const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
          await fetch(`${apiUrl}/payroll/stop-processing/${batchId}`, { method: 'POST' });
          fetchProcessingStatus();
          toast.info('Halt signal transmitted.');
        } catch (err) { toast.error('Transmission failure.'); }
      }
    });
  };

  const handleSync = async () => {
    setIsProcessingSync(true);
    setModalConfig((prev: any) => ({ ...prev, isOpen: false }));
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const lines = syncText.split('\n').filter(l => l.trim().length > 0);
      const totalLines = lines.length;
      setSyncProgress({ current: 0, total: totalLines });
      const chunkSize = 50;
      for (let i = 0; i < totalLines; i += chunkSize) {
        const chunk = lines.slice(i, i + chunkSize).join('\n');
        await fetch(`${apiUrl}/payroll/sync-bulk`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: chunk, label: syncLabel }) });
        setSyncProgress({ current: Math.min(i + chunkSize, totalLines), total: totalLines });
      }
      setSyncText('');
      setSyncLabel('');
      fetchUsers();
      toast.success('Rapid sync completed successfully!');
    } catch (err: any) { toast.error(err.message); }
    finally { setIsProcessingSync(false); }
  };

  const handleSaveCompany = async () => {
    setIsSavingCompany(true);
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      await fetch(`${apiUrl}/payroll/companies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCompanyName }) });
      setNewCompanyName('');
      fetchCompanies();
      toast.success('Client entity registered.');
    } catch (err: any) { toast.error(err.message); }
    finally { setIsSavingCompany(false); }
  };

  if (loadingRuns && runs.length === 0) return <div className="p-10"><PageHeaderSkeleton /></div>;

  return (
    <div className="max-w-[1600px] mx-auto space-y-12 print:space-y-0 animate-in fade-in duration-700 pb-20 print:pb-0 print:max-w-none">
      <PayrollHeader activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} />

      {activeTab === 'storage' && (
        <PayrollStorageTab 
          runs={runs} loadingRuns={loadingRuns} processingBatchIds={processingBatchIds}
          historySearch={searchTerm} setHistorySearch={setSearchTerm}
          historyStart={periodStart} setHistoryStart={setPeriodStart}
          historyEnd={periodEnd} setHistoryEnd={setPeriodEnd}
          onStop={handleStopProcessing}
          onResume={(run) => {
            setClientLabel(run.label || run.client_name || '');
            setPeriodStart(run.period_start ? new Date(run.period_start).toISOString().split('T')[0] : '');
            setPeriodEnd(run.period_end ? new Date(run.period_end).toISOString().split('T')[0] : '');
            setResumableBatchId(run.id);
            setIsImportModalOpen(true);
          }}
          onDelete={async (id) => {
            setModalConfig({
              isOpen: true, title: "Purge Batch", message: "Permanently delete this batch and all associated disbursements?",
              confirmText: "Purge Now", isDestructive: true, requireConfirmationText: "PURGE",
              onConfirm: async () => {
                const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
                await fetch(`${apiUrl}/payroll/batch/${id}`, { method: 'DELETE' });
                fetchRuns();
                setModalConfig((prev: any) => ({ ...prev, isOpen: false }));
                toast.success('Batch purged successfully.');
              }
            });
          }}
          onOpenImport={() => setIsImportModalOpen(true)}
          isStaff={isStaff} isAdmin={isAdmin}
          pendingRequests={pendingRequests}
          onRespondRequest={handleRespondToRequest}
        />
      )}

      {activeTab === 'credentials' && (
        <PayrollCredentialsTab 
          users={users} loadingUsers={loadingUsers}
          searchTerm={searchTerm} setSearchTerm={setSearchTerm}
          selectedCredentialLabel={selectedCredentialLabel} setSelectedCredentialLabel={setSelectedCredentialLabel}
          companies={companies}
          onDeleteEmployee={async (id) => {
            setModalConfig({
              isOpen: true, title: "Revoke Access", message: "Deactivate portal credentials for this individual?",
              confirmText: "Revoke", isDestructive: true,
              onConfirm: async () => {
                const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
                await fetch(`${apiUrl}/payroll/users/${id}`, { method: 'DELETE' });
                fetchUsers();
                setModalConfig((prev: any) => ({ ...prev, isOpen: false }));
                toast.success('Access revoked.');
              }
            });
          }}
          onBulkDelete={() => {
            setModalConfig({
              isOpen: true, title: "Mass Deactivation", message: `Revoke credentials for all personnel under ${selectedCredentialLabel}?`,
              confirmText: "Confirm Mass Revocation", isDestructive: true, requireConfirmationText: "PURGE ALL",
              onConfirm: async () => {
                const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
                const ids = users.filter(u => selectedCredentialLabel === 'all' || u.company_label === selectedCredentialLabel).map(u => u.id);
                await fetch(`${apiUrl}/payroll/users-bulk`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
                fetchUsers();
                setModalConfig((prev: any) => ({ ...prev, isOpen: false }));
                toast.success('Personnel records purged.');
              }
            });
          }}
          isStaff={isStaff} isAdmin={isAdmin}
        />
      )}

      {activeTab === 'sync' && isAdmin && (
        <PayrollSyncTab 
          syncText={syncText} setSyncText={setSyncText}
          syncLabel={syncLabel} setSyncLabel={setSyncLabel}
          isProcessingSync={isProcessingSync} syncProgress={syncProgress}
          onSync={() => {
            setModalConfig({
              isOpen: true, title: "Initialize Rapid Sync", message: "Provision portal credentials for the provided personnel list?",
              confirmText: "Initialize", onConfirm: handleSync
            });
          }}
          companies={companies}
          newCompanyName={newCompanyName} setNewCompanyName={setNewCompanyName}
          onSaveCompany={handleSaveCompany} isSavingCompany={isSavingCompany}
          onRemoveCompany={async () => {
            const company = companies.find(c => c.name === clientLabel);
            if (!company) return;
            setModalConfig({
              isOpen: true, title: "Deregister Entity", message: `Remove ${company.name} from the global dictionary?`,
              confirmText: "Deregister", isDestructive: true,
              onConfirm: async () => {
                const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
                await fetch(`${apiUrl}/payroll/companies/${company.id}`, { method: 'DELETE' });
                setClientLabel('');
                fetchCompanies();
                setModalConfig((prev: any) => ({ ...prev, isOpen: false }));
                toast.info('Entity deregistered.');
              }
            });
          }}
          clientLabel={clientLabel} setClientLabel={setClientLabel}
        />
      )}

      <PayrollImportModal 
        isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)}
        clientLabel={clientLabel} setClientLabel={setClientLabel} companies={companies}
        periodStart={periodStart} setPeriodStart={setPeriodStart}
        periodEnd={periodEnd} setPeriodEnd={setPeriodEnd}
        releaseDate={releaseDate} setReleaseDate={setReleaseDate}
        selectedFiles={selectedFiles} onFileSelect={(e) => e.target.files && setSelectedFiles(Array.from(e.target.files))}
        uploading={uploading} onUpload={handleUpload}
        resumableBatchId={resumableBatchId} isStaff={isStaff}
      />

      <ConfirmModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}
        isDestructive={modalConfig.isDestructive}
        requireConfirmationText={modalConfig.requireConfirmationText}
      />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `}</style>
    </div>
  );
}
