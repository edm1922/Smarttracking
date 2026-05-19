import React from 'react';
import { X, CheckCircle, ImageIcon, Trash2, Send, AlertTriangle, Plus, Printer } from 'lucide-react';

interface RSQSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: any;
  setForm: (form: any) => void;
  attachmentFile: File | null;
  attachmentPreview: string | null;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  additionalFiles: File[];
  additionalPreviews: string[];
  handleAdditionalFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeAdditionalFile: (index: number) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export const RSQSubmitModal: React.FC<RSQSubmitModalProps> = ({
  isOpen,
  onClose,
  form,
  setForm,
  attachmentFile,
  attachmentPreview,
  handleFileChange,
  additionalFiles,
  additionalPreviews,
  handleAdditionalFileChange,
  removeAdditionalFile,
  isSubmitting,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-primary to-blue-500 px-10 py-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">Final Verification</h3>
              <p className="text-[10px] font-medium text-white/60 uppercase tracking-widest mt-1">Official Material Requisition Submission</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/60 hover:text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-10 space-y-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Direct Supervisor</label>
              <input
                type="text"
                placeholder="SUPERVISOR NAME..."
                value={form.supervisorName}
                onChange={e => setForm({ ...form, supervisorName: e.target.value.toUpperCase() })}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl px-5 py-3.5 text-sm font-semibold text-gray-900 outline-none hover:border-gray-300 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Dept / Area</label>
              <input
                type="text"
                placeholder="REQUISITION AREA..."
                list="dept-options"
                value={form.departmentArea}
                onChange={e => setForm({ ...form, departmentArea: e.target.value.toUpperCase() })}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl px-5 py-3.5 text-sm font-semibold text-gray-900 outline-none hover:border-gray-300 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-gray-400 uppercase"
              />
              <datalist id="dept-options">
                <option value="MAIN OFFICE" />
                <option value="LOGISTICS" />
                <option value="OPERATIONS" />
                <option value="HR" />
                <option value="IT" />
              </datalist>
            </div>
          </div>

          {/* Print options */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 no-print">
            <div>
              <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">Need Signatures First?</p>
              <p className="text-[10px] text-gray-500 font-medium uppercase mt-0.5">Generate the populated slip to print and sign physically</p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-6 py-3 bg-gradient-to-r from-primary to-blue-500 text-white rounded-2xl text-[10px] font-extrabold uppercase tracking-widest shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center gap-2 hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-px active:scale-100"
            >
              <Printer className="h-4 w-4" /> Print Requisition
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1 flex items-center">
                Signed Requisition Form
                <span className="ml-3 px-2 py-0.5 bg-primary/10 text-primary font-bold text-[8px] rounded-lg tracking-widest">MANDATORY</span>
              </label>
            </div>
            <label className="block cursor-pointer">
              <input type="file" className="hidden" onChange={handleFileChange} />
              <div className={`w-full py-12 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-5 transition-all duration-300 ease-out ${attachmentFile ? 'bg-green-50/50 border-green-200 text-green-700' : 'bg-gray-50/50 border-gray-200 text-gray-500 hover:border-primary hover:bg-white hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 hover:scale-[1.01]'}`}>
                {attachmentPreview ? (
                  <div className="relative group/img">
                    <img src={attachmentPreview} className="h-28 w-28 object-cover rounded-2xl border-2 border-white shadow-xl transition-transform group-hover:scale-105" alt="Preview" />
                    <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ImageIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="h-20 w-20 bg-white rounded-[2rem] flex items-center justify-center shadow-lg">
                    <ImageIcon className="h-8 w-8 opacity-40" />
                  </div>
                )}
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-wide mb-1">{attachmentFile ? attachmentFile.name : 'Upload Official Form'}</p>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Click to browse signed document</p>
                </div>
              </div>
            </label>
          </div>

          <div className="space-y-6">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1 flex items-center">
              Supporting Images (Optional)
              <span className="ml-3 text-[8px] font-bold text-gray-400 tracking-widest">MAX 2 PHOTOS</span>
            </label>
            <div className="grid grid-cols-3 gap-4">
              {additionalPreviews.map((preview, idx) => (
                <div key={idx} className="relative group aspect-square rounded-[1.5rem] overflow-hidden border-2 border-gray-100 shadow-sm animate-in zoom-in-95">
                  <img src={preview} className="h-full w-full object-cover" alt={`Additional ${idx}`} />
                  <button 
                    onClick={() => removeAdditionalFile(idx)}
                    className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-6 w-6" />
                  </button>
                </div>
              ))}
              {additionalFiles.length < 2 && (
                <label className="aspect-square bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary hover:bg-white hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] text-gray-400 hover:text-primary">
                  <input type="file" className="hidden" onChange={handleAdditionalFileChange} />
                  <Plus className="h-8 w-8" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Add Photo</span>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-10 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onSubmit}
            disabled={isSubmitting || !attachmentFile || !form.supervisorName}
            className="w-full py-5 bg-gradient-to-r from-primary to-blue-500 text-white rounded-2xl text-xs font-extrabold uppercase tracking-widest shadow-xl shadow-primary/30 transition-all duration-300 ease-out hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-px active:scale-100 outline-none focus:ring-4 focus:ring-primary/40 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0 disabled:shadow-none"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-3">
                <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Processing Submission...
              </div>
            ) : (
              'Officially Submit Requisition'
            )}
          </button>
          {!attachmentFile && (
            <p className="text-[9px] font-bold text-red-400 text-center uppercase tracking-widest mt-4 flex items-center justify-center gap-2">
              <AlertTriangle className="h-3 w-3" /> Signed document is required to proceed
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
