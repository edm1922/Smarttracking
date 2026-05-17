import React from 'react';
import { X, Upload, CheckCircle2, AlertCircle, Loader2, Database, MapPin, Calendar, Clock } from 'lucide-react';
import { Company } from './PayrollTypes';

interface PayrollImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientLabel: string;
  setClientLabel: (val: string) => void;
  companies: Company[];
  periodStart: string;
  setPeriodStart: (val: string) => void;
  periodEnd: string;
  setPeriodEnd: (val: string) => void;
  releaseDate: string;
  setReleaseDate: (val: string) => void;
  selectedFiles: File[];
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
  onUpload: () => void;
  resumableBatchId: string | null;
  isStaff: boolean;
}

export const PayrollImportModal: React.FC<PayrollImportModalProps> = ({
  isOpen,
  onClose,
  clientLabel,
  setClientLabel,
  companies,
  periodStart,
  setPeriodStart,
  periodEnd,
  setPeriodEnd,
  releaseDate,
  setReleaseDate,
  selectedFiles,
  onFileSelect,
  uploading,
  onUpload,
  resumableBatchId,
  isStaff,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
        {/* Modal Header */}
        <div className="bg-primary px-10 py-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg shadow-white/10">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-widest">Payroll Ingestion</h3>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">
                {resumableBatchId ? 'RESUME MODE ACTIVE' : 'NEW BATCH IMPORT'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/60 hover:text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-10 space-y-10 flex-1 overflow-y-auto custom-scrollbar">
          {/* Client & Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Company / Entity</label>
              <select 
                value={clientLabel}
                onChange={e => setClientLabel(e.target.value)}
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all appearance-none uppercase shadow-sm"
              >
                <option value="">SELECT RECIPIENT...</option>
                {companies.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Release Date (Staff Only)</label>
              <input 
                type="date" 
                value={releaseDate}
                onChange={e => setReleaseDate(e.target.value)}
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Calendar className="h-3 w-3" /> Period Start
              </label>
              <input 
                type="date" 
                value={periodStart}
                onChange={e => setPeriodStart(e.target.value)}
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all shadow-sm"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Calendar className="h-3 w-3" /> Period End
              </label>
              <input 
                type="date" 
                value={periodEnd}
                onChange={e => setPeriodEnd(e.target.value)}
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all shadow-sm"
              />
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payload Source (Excel/CSV)</label>
            </div>
            <label className="block cursor-pointer">
              <input type="file" className="hidden" onChange={onFileSelect} accept=".xlsx,.xls,.csv" />
              <div className={`w-full py-16 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center gap-6 transition-all ${selectedFiles.length > 0 ? 'bg-green-50/50 border-green-200 text-green-600' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-primary hover:bg-white hover:shadow-2xl hover:shadow-primary/5'}`}>
                {selectedFiles.length > 0 ? (
                  <div className="h-24 w-24 bg-white rounded-[2rem] flex items-center justify-center shadow-xl">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                ) : (
                  <div className="h-24 w-24 bg-white rounded-[2rem] flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                    <Upload className="h-10 w-10 opacity-40" />
                  </div>
                )}
                <div className="text-center">
                  <p className="text-sm font-black uppercase tracking-widest mb-1">{selectedFiles.length > 0 ? selectedFiles[0].name : 'Select Data File'}</p>
                  <p className="text-[10px] font-bold opacity-60 uppercase tracking-tighter">Click to browse your local storage</p>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-10 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onUpload}
            disabled={uploading || selectedFiles.length === 0 || !clientLabel || !periodStart || !periodEnd}
            className="w-full py-6 bg-primary text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:bg-primary-dark hover:-translate-y-1 transition-all active:translate-y-0 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing Data...
              </div>
            ) : (
              isStaff ? 'Request Ingestion Approval' : 'Officially Initialize Import'
            )}
          </button>
          <p className="text-[9px] font-black text-gray-400 text-center uppercase tracking-[0.2em] mt-6 flex items-center justify-center gap-2">
            <Clock className="h-3 w-3" /> Secure background processing enabled
          </p>
        </div>
      </div>
    </div>
  );
};
