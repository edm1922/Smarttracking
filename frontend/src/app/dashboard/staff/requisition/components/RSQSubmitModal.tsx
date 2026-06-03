import React from 'react';
import { X, CheckCircle, ImageIcon, Trash2, Send, AlertTriangle, Plus, Printer, User, MapPin, ShoppingBag } from 'lucide-react';
import { SelectedItem, Employee, employeeKey } from './RSQTypes';

interface RSQSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: any;
  employees: Employee[];
  selectedItems: SelectedItem[];
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
  employees,
  selectedItems,
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

  const totalItems = selectedItems.reduce((sum, item) => {
    return sum + Object.values(item.quantities || {}).reduce((a, b) => a + b, 0);
  }, 0);

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
          {/* Context Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                <User className="h-3 w-3" /> Direct Supervisor
              </label>
              <p className="text-sm font-extrabold text-gray-900 uppercase ml-1">{form.supervisorName || '—'}</p>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                <MapPin className="h-3 w-3" /> Dept / Area
              </label>
              <p className="text-sm font-extrabold text-gray-900 uppercase ml-1">{form.departmentArea || '—'}</p>
            </div>
          </div>

          {/* Requisition Summary Preview */}
          <div className="bg-gray-50/80 border border-gray-100 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-primary/10 rounded-xl flex items-center justify-center">
                <ShoppingBag className="h-4 w-4 text-primary" />
              </div>
              <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-wider">Requisition Summary</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
                <p className="text-2xl font-black text-gray-900">{employees.length}</p>
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Employees</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
                <p className="text-2xl font-black text-gray-900">{selectedItems.length}</p>
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Products</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
                <p className="text-2xl font-black text-gray-900">{totalItems}</p>
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total Qty</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
                <p className="text-2xl font-black text-gray-900">{form.shift || '—'}</p>
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Shift</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 max-h-36 overflow-y-auto custom-scrollbar">
              {employees.map(emp => {
                const key = employeeKey(emp);
                const empItems = selectedItems.filter(item => (item.quantities[key] || 0) > 0);
                if (empItems.length === 0) return null;
                return (
                  <div key={key} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-7 w-7 bg-primary/5 rounded-lg flex items-center justify-center shrink-0">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-gray-900 uppercase truncate">{emp.lastName}, {emp.firstName}</p>
                        <p className="text-[8px] font-bold text-gray-400 uppercase truncate">{emp.position}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[9px] font-bold text-gray-500">{empItems.length} items</span>
                      <span className="text-[10px] font-black text-primary">{empItems.reduce((s, i) => s + (i.quantities[key] || 0), 0)} pcs</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Print CTA */}
          <div className="bg-gradient-to-r from-primary/5 to-blue-500/5 border-2 border-primary/20 rounded-3xl p-8 text-center no-print space-y-4">
            <div className="h-14 w-14 bg-primary text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
              <Printer className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-900 uppercase tracking-wide">Print &amp; Sign</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1 max-w-md mx-auto">
                Print the populated requisition slip, have your supervisor sign it, then upload the signed copy below
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-gray-900 to-black text-white rounded-2xl text-[11px] font-extrabold uppercase tracking-widest shadow-xl shadow-gray-900/30 transition-all duration-300 ease-out hover:shadow-2xl hover:shadow-gray-900/40 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-px active:scale-100 focus:outline-none focus:ring-4 focus:ring-gray-900/30 animate-pulse"
            >
              <Printer className="h-5 w-5" /> Print Requisition
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
