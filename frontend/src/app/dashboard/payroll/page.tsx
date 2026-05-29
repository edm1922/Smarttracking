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
  // Tracks which batches currently have a request-chain in flight from this tab,
  // so we don't spawn duplicate chains.
  const activeChains = useRef<Set<string>>(new Set());
  // Mirror of `runs` state for closures. The interval-bound fetchProcessingStatus
  // would otherwise see stale `runs` across activeTab changes, which can make
  // the safety-net misjudge progress (re-attach completed batches, or fail to
  // notice ones falling behind).
  const runsRef = useRef<PayrollRun[]>([]);
  // Tracks consecutive resume failures per batch so we can give up on batches
  // that are permanently stuck (e.g. missing FILEPATH token) instead of retrying
  // forever.
  const resumeFailures = useRef<Record<string, number>>({});

  // API Fetches
  const fetchRuns = async () => {
    setLoadingRuns(true);
    try {
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/payroll/runs`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setRuns(data);
        runsRef.current = data;
      }
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

  // Drives the request-chain for a single batch: keeps re-invoking process-uploaded
  // until the backend reports it's done. Each call is awaited (Vercel kills
  // un-awaited promises). The backend returns when its time budget hits.
  //
  // Resilience: each step retries up to 3 times on transient network errors
  // ("TypeError: Failed to fetch") with exponential backoff before giving up.
  // If we ultimately give up, the safety-net inside fetchProcessingStatus will
  // re-attach a chain after ~10s.
  const continueProcessingChain = async (batchId: string) => {
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
    // Guard against duplicate chains for the same batch
    if (activeChains.current.has(batchId)) return;
    activeChains.current.add(batchId);

    const fetchStep = async (): Promise<Response | null> => {
      const maxAttempts = 3;
      let lastErr: any = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          // Timeout matches the backend budget: 30s on Vercel,
          // 10min locally (no timeout, full PDF in one pass).
          return await fetchWithTimeout(
            `${apiUrl}/payroll/process-uploaded`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ resumeBatchId: batchId }),
            },
            600000,
          );
        } catch (err: any) {
          lastErr = err;
          // Backoff: 1s, 3s, then give up. Lets the lambda cool down and any
          // transient CORS/network/cold-start hiccup clear.
          if (attempt < maxAttempts) {
            const delay = attempt === 1 ? 1000 : 3000;
            console.warn(
              `process-uploaded fetch attempt ${attempt}/${maxAttempts} failed for batch ${batchId}: ${err?.message}. Retrying in ${delay}ms…`,
            );
            await new Promise((r) => setTimeout(r, delay));
          }
        }
      }
      console.error(
        `process-uploaded gave up after ${maxAttempts} attempts for batch ${batchId}:`,
        lastErr,
      );
      return null;
    };

    try {
      let safety = 200;
      // Track consecutive HTTP errors within this chain so we don't spin
      let httpErrorsInRow = 0;
      while (safety-- > 0) {
        const res = await fetchStep();
        if (!res) return;
        if (!res.ok) {
          httpErrorsInRow++;
          const body = await res.text().catch(() => '');
          console.warn(
            `Resume call returned ${res.status} for batch ${batchId} (attempt ${httpErrorsInRow}): ${body.substring(0, 200)}`,
          );
          // Retry up to 3 times within this chain call before punting to
          // the safety-net (which will re-attach after 10s).
          if (httpErrorsInRow < 3) {
            await new Promise((r) => setTimeout(r, 2000 * httpErrorsInRow));
            continue;
          }
          return;
        }
        let data: any = null;
        try { data = await res.json(); } catch { /* ignore */ }
        fetchRuns();
        fetchProcessingStatus();
        // If the backend reports it cannot resume this batch (e.g. missing
        // source file), treat it as a terminal failure — immediately halt it.
        if (data?.cannotResume) {
          console.warn(`Batch ${batchId} cannot be resumed (source file missing). Transmitting halt signal...`);
          const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
          fetch(`${apiUrl}/payroll/stop-processing/${batchId}`, { method: 'POST' }).catch(() => {});
          resumeFailures.current[batchId] = 11; // Ensure safety net ignores it
          return;
        }
        // Successful response — reset the consecutive-failure counter
        resumeFailures.current[batchId] = 0;
        httpErrorsInRow = 0;
        if (!data || data.timedOut !== true) return;
        if (
          typeof data.processed === 'number' &&
          typeof data.totalPages === 'number' &&
          data.processed >= data.totalPages
        ) return;
        await new Promise((r) => setTimeout(r, 250));
      }
    } catch (err) {
      console.error(`Processing chain for ${batchId} failed:`, err);
    } finally {
      activeChains.current.delete(batchId);
      fetchRuns();
      fetchProcessingStatus();
    }
  };

  // Re-attaches chains for any batches that look stuck (in PROCESSING but no
  // chain currently running for them). Pulled into a helper so it can run even
  // when /processing-status itself fails (using cached state instead).
  // Reads from runsRef (not `runs`) because this is called from the
  // interval-bound fetchProcessingStatus whose closure may otherwise hold a
  // stale `runs` snapshot.
  const reattachStuckChains = (ids: string[]) => {
    const currentRuns = runsRef.current;
    if (ids.length === 0 || currentRuns.length === 0) return;
    const now = Date.now();
    for (const batchId of ids) {
      if (activeChains.current.has(batchId)) continue;
      const batch = currentRuns.find((r) => r.id === batchId);
      if (!batch) continue;
      // Skip batches that are already in a terminal state
      if (batch.remark?.includes('[BATCH_STATUS:FAILED]') || batch.remark?.includes('[BATCH_STATUS:COMPLETED]')) continue;
      // Skip batches younger than 60s — the initial upload flow
      // (executeUpload) is still running its first process-uploaded call
      // and will start its own chain when it returns (~30-45s).
      // Without this guard the safety-net eagerly spawns chains that get
      // rejected by the backend's activeBatches lock, creating a tight
      // retry loop that wastes time and confuses the user.
      const age = now - new Date(batch.created_at).getTime();
      if (age < 60000) continue;
      const totalPagesMatch = batch.remark?.match(/\[TOTAL_PAGES:(\d+)\]/);
      const total = totalPagesMatch ? parseInt(totalPagesMatch[1], 10) : 0;
      const done = batch._count?.documents || 0;
      if (total > 0 && done < total) {
        const failures = (resumeFailures.current[batchId] || 0) + 1;
        // After 10 consecutive resume failures, give up on this batch and mark
        // it as FAILED so it stops appearing in /processing-status.
        if (failures > 10) {
          if (failures === 11) {
            console.warn(`Batch ${batchId} has failed resume ${failures - 1} times. Marking as FAILED.`);
            const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
            fetch(`${apiUrl}/payroll/stop-processing/${batchId}`, { method: 'POST' }).catch(() => {});
          }
          continue;
        }
        resumeFailures.current[batchId] = failures;

        const lastTry = lastResumeAttempt.current[batchId] || 0;
        // Throttle retries to 30s so a rapidly-pinging safety-net doesn't
        // DDOS the backend. Each attempt that gets "alreadyRunning: true"
        // exits instantly, freeing the frontend guard for the next cycle.
        if (now - lastTry > 30000) {
          lastResumeAttempt.current[batchId] = now;
          continueProcessingChain(batchId);
        }
      }
    }
  };

  const fetchProcessingStatus = async () => {
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
    try {
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

        // Safety net: re-attach any chain that's not currently running
        reattachStuckChains(ids);
      }
    } catch (err) {
      // /processing-status itself failed (commonly "TypeError: Failed to fetch"
      // when the lambda is busy with a long process-uploaded chunk). Don't bail
      // out of safety-net behavior — use the cached state to keep chains alive.
      console.error('Failed to fetch processing status:', err);
      reattachStuckChains(prevProcessingIds.current);
    }
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
    // Close the import modal immediately so the user gets instant feedback
    // that their click registered. The upload + first processing call run in
    // the background and surface progress via toasts and the runs table.
    setIsImportModalOpen(false);
    const filesSnapshot = selectedFiles;
    setSelectedFiles([]);
    try {
      const file = filesSnapshot[0];
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
      // Upload to cloud storage complete. Hide the uploading banner now — the
      // processing banner (controlled by processingBatchIds polling) takes over.
      setUploading(false);

      // Step 3: Kick off the first processing call. The backend processes as much
      // as it can within its time budget and returns. If timedOut is true,
      // we keep chaining requests until the whole PDF is done.
      // Timeout matches the backend budget: 10min locally, 30s on Vercel.
      const processRes = await fetchWithTimeout(`${apiUrl}/payroll/process-uploaded`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, client_name: clientLabel, period_start: periodStart, period_end: periodEnd, release_date: releaseDate })
      }, 600000);
      if (!processRes.ok) throw new Error(`Failed to start processing: ${processRes.status} ${processRes.statusText}`);
      let processData: any = null;
      try { processData = await processRes.json(); } catch { /* ignore */ }

      fetchRuns();
      // Kick the processing-status poll immediately so the spinner and
      // processing banner show up right away, not 5 seconds later.
      fetchProcessingStatus();

      // If the first call timed out partway through, chain follow-up calls in the
      // background. Don't await — let the user keep using the UI.
      if (processData && processData.batchId && processData.timedOut) {
        toast.success(`Processing started: ${processData.processed}/${processData.totalPages} pages done. Continuing in background...`);
        continueProcessingChain(processData.batchId);
      } else if (processData && processData.batchId) {
        toast.success(`Processing complete: ${processData.processed}/${processData.totalPages} pages.`);
      } else {
        toast.success('PDF uploaded! Processing in background — check runs table for status.');
      }
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
        const syncRes = await fetch(`${apiUrl}/payroll/sync-bulk`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: chunk, label: syncLabel }) });
        if (!syncRes.ok) {
          const errBody = await syncRes.text().catch(() => '');
          throw new Error(`Sync failed at line ${i + 1}: ${syncRes.status} ${errBody.substring(0, 200)}`);
        }
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
          uploading={uploading}
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
