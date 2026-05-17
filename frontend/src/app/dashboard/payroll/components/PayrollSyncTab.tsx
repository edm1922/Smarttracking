import React from 'react';
import { RefreshCw, Save, Trash2, LayoutTemplate, AlertCircle, Loader2 } from 'lucide-react';
import { Company } from './PayrollTypes';

interface PayrollSyncTabProps {
  syncText: string;
  setSyncText: (val: string) => void;
  syncLabel: string;
  setSyncLabel: (val: string) => void;
  isProcessingSync: boolean;
  syncProgress: { current: number; total: number };
  onSync: () => void;
  companies: Company[];
  newCompanyName: string;
  setNewCompanyName: (val: string) => void;
  onSaveCompany: () => void;
  isSavingCompany: boolean;
  onRemoveCompany: () => void;
  clientLabel: string;
  setClientLabel: (val: string) => void;
}

export const PayrollSyncTab: React.FC<PayrollSyncTabProps> = ({
  syncText,
  setSyncText,
  syncLabel,
  setSyncLabel,
  isProcessingSync,
  syncProgress,
  onSync,
  companies,
  newCompanyName,
  setNewCompanyName,
  onSaveCompany,
  isSavingCompany,
  onRemoveCompany,
  clientLabel,
  setClientLabel,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in duration-500">
      {/* Bulk Account Sync */}
      <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden flex flex-col">
        <div className="bg-primary px-10 py-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <RefreshCw className={`h-6 w-6 text-white ${isProcessingSync ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-widest">Rapid Personnel Sync</h3>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Bulk Access Provisioning</p>
            </div>
          </div>
        </div>

        <div className="p-10 space-y-8 flex-1">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <AlertCircle className="h-3 w-3" /> Data Input Schema
            </label>
            <textarea 
              placeholder="PASTE PERSONNEL LIST HERE... (ONE NAME PER LINE)"
              value={syncText}
              onChange={e => setSyncText(e.target.value.toUpperCase())}
              className="w-full bg-gray-50 border-2 border-transparent rounded-[2rem] px-8 py-6 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all min-h-[300px] resize-none shadow-inner"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Entity Label</label>
              <select 
                value={syncLabel}
                onChange={e => setSyncLabel(e.target.value)}
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all appearance-none uppercase shadow-sm"
              >
                <option value="">SELECT COMPANY...</option>
                {companies.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={onSync}
                disabled={isProcessingSync || !syncText.trim()}
                className="w-full h-[60px] bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:bg-primary-dark hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0"
              >
                {isProcessingSync ? `Syncing (${syncProgress.current}/${syncProgress.total})` : 'Initialize Sync'}
              </button>
            </div>
          </div>
          
          {isProcessingSync && (
            <div className="space-y-2 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">Processing Cloud Data...</span>
                <span className="text-[9px] font-black text-primary">{Math.round((syncProgress.current / syncProgress.total) * 100)}%</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Entity Dictionary */}
      <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden flex flex-col">
        <div className="bg-gray-900 px-10 py-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <LayoutTemplate className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-widest">Entity Dictionary</h3>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Global Client Management</p>
            </div>
          </div>
        </div>

        <div className="p-10 space-y-10 flex-1">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Client Identity</label>
            <div className="flex gap-4">
              <input 
                type="text" 
                placeholder="ENTITY NAME..."
                value={newCompanyName}
                onChange={e => setNewCompanyName(e.target.value.toUpperCase())}
                className="flex-1 bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all shadow-sm"
              />
              <button
                onClick={onSaveCompany}
                disabled={isSavingCompany || !newCompanyName.trim()}
                className="h-[60px] w-[60px] bg-gray-900 text-white rounded-2xl flex items-center justify-center hover:bg-black transition-all shadow-xl shadow-gray-900/10 disabled:opacity-30"
              >
                {isSavingCompany ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Entity Management</label>
            <div className="flex gap-4">
              <select 
                value={clientLabel}
                onChange={e => setClientLabel(e.target.value)}
                className="flex-1 bg-gray-50 border-2 border-transparent rounded-2xl px-8 py-4 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all appearance-none uppercase shadow-sm"
              >
                <option value="">SELECT CLIENT TO MANAGE...</option>
                {companies.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={onRemoveCompany}
                disabled={!clientLabel}
                className="h-[60px] w-[60px] bg-white border-2 border-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-100/50 disabled:opacity-30"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <h4 className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4">Registered Entities ({companies.length})</h4>
            <div className="flex flex-wrap gap-2">
              {companies.map(c => (
                <span key={c.id} className="px-3 py-1.5 bg-gray-50 text-gray-500 text-[10px] font-black uppercase rounded-lg border border-gray-100">
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
