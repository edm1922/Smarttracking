import React from 'react';
import {
  AlertTriangle,
  CheckCircle,
  FileImage,
  ImageIcon,
  MapPin,
  Plus,
  Printer,
  Send,
  ShoppingBag,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
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

  const missingFields = [
    !form.supervisorName?.trim() ? 'Supervisor name' : null,
    !attachmentFile ? 'Signed requisition form' : null,
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm no-print" role="dialog" aria-modal="true" aria-labelledby="rsq-submit-title">
      <div className="max-h-[92dvh] w-full max-w-3xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                <CheckCircle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase text-blue-700">Final Step</p>
                <h3 id="rsq-submit-title" className="text-lg font-semibold text-slate-950">Review & Submit Requisition</h3>
                <p className="mt-1 text-sm text-slate-500">Print the form, upload the signed copy, then submit the official request.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              aria-label="Close final review"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(92dvh-10rem)] overflow-y-auto p-5 custom-scrollbar">
          {missingFields.length > 0 && (
            <div className="mb-5 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Required before submit: {missingFields.join(', ')}.</span>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950">
                <User className="h-4 w-4 text-blue-700" aria-hidden="true" />
                Request Context
              </div>
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-500">Supervisor</dt>
                  <dd className="mt-0.5 break-words font-semibold text-slate-950">{form.supervisorName || '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-500">Department / Area</dt>
                  <dd className="mt-0.5 break-words font-semibold text-slate-950">{form.departmentArea || '-'}</dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate-500">Shift</dt>
                    <dd className="mt-0.5 font-semibold text-slate-950">{form.shift || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate-500">Date</dt>
                    <dd className="mt-0.5 font-semibold text-slate-950">{form.date || '-'}</dd>
                  </div>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950">
                <ShoppingBag className="h-4 w-4 text-blue-700" aria-hidden="true" />
                Submission Summary
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <p className="text-xl font-semibold tabular-nums text-slate-950">{employees.length}</p>
                  <p className="text-xs text-slate-500">Employees</p>
                </div>
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <p className="text-xl font-semibold tabular-nums text-slate-950">{selectedItems.length}</p>
                  <p className="text-xs text-slate-500">Products</p>
                </div>
                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <p className="text-xl font-semibold tabular-nums text-slate-950">{totalItems}</p>
                  <p className="text-xs text-slate-500">Total Qty</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h4 className="text-sm font-semibold text-slate-950">Employee Breakdown</h4>
            </div>
            <div className="max-h-48 divide-y divide-slate-100 overflow-y-auto custom-scrollbar">
              {employees.map(emp => {
                const key = employeeKey(emp);
                const empItems = selectedItems.filter(item => (item.quantities[key] || 0) > 0);
                const empTotal = empItems.reduce((s, i) => s + (i.quantities[key] || 0), 0);
                return (
                  <div key={key} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">{emp.lastName}, {emp.firstName}</p>
                      <p className="truncate text-xs text-slate-500">{emp.position}{emp.department ? ` - ${emp.department}` : ''}</p>
                    </div>
                    <div className="shrink-0 text-right text-sm">
                      <p className="font-semibold tabular-nums text-slate-950">{empTotal} qty</p>
                      <p className="text-xs text-slate-500">{empItems.length} products</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Printer className="h-5 w-5" aria-hidden="true" />
            </div>
            <h4 className="mt-3 text-base font-semibold text-slate-950">Print & Sign</h4>
            <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-600">
              Print the populated requisition slip, have the supervisor sign it, then upload the signed copy below.
            </p>
            <button
              type="button"
              onClick={() => window.print()}
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print Requisition
            </button>
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <label htmlFor="signed-requisition-upload" className="mb-2 block text-sm font-semibold text-slate-800">
                Signed Requisition Form <span className="text-red-600">*</span>
              </label>
              <input
                id="signed-requisition-upload"
                name="signedRequisition"
                type="file"
                accept="image/*,.pdf"
                className="sr-only"
                onChange={handleFileChange}
              />
              <label
                htmlFor="signed-requisition-upload"
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${attachmentFile ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-blue-300 hover:bg-blue-50'}`}
              >
                {attachmentPreview ? (
                  <img src={attachmentPreview} width={112} height={112} className="h-28 w-28 rounded-md border border-white object-cover shadow-sm" alt="Signed requisition preview" />
                ) : (
                  <Upload className="h-8 w-8" aria-hidden="true" />
                )}
                <span className="mt-3 block max-w-full break-words text-sm font-semibold">
                  {attachmentFile ? attachmentFile.name : 'Upload signed document'}
                </span>
                <span className="mt-1 text-xs text-slate-500">Image or PDF accepted.</span>
              </label>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="supporting-image-upload" className="block text-sm font-semibold text-slate-800">Supporting Images</label>
                <span className="text-xs text-slate-500">Optional, max 2</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {additionalPreviews.map((preview, idx) => (
                  <div key={preview} className="relative rounded-lg border border-slate-200 bg-white p-2">
                    <img src={preview} width={160} height={160} className="aspect-square w-full rounded-md object-cover" alt={`Supporting upload ${idx + 1}`} />
                    <button
                      type="button"
                      onClick={() => removeAdditionalFile(idx)}
                      className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                ))}
                {additionalFiles.length < 2 && (
                  <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center text-slate-500 transition-colors hover:border-blue-300 hover:bg-blue-50">
                    <input
                      id="supporting-image-upload"
                      name="supportingImage"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleAdditionalFileChange}
                    />
                    <Plus className="h-6 w-6" aria-hidden="true" />
                    <span className="mt-2 text-sm font-semibold">Add Photo</span>
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || !attachmentFile || !form.supervisorName}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true" />
                Processing Submission...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" aria-hidden="true" />
                Submit Official Requisition
              </>
            )}
          </button>
          {!attachmentFile && (
            <p className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-red-700">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Upload the signed document to continue.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
