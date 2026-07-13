import React from 'react';
import { ClipboardList, FileText, Printer } from 'lucide-react';

interface RSQHeaderProps {
  onPrintBlank: () => void;
  employeeCount: number;
  productCount: number;
  totalQuantity: number;
}

const steps = ['Request Info', 'Employees', 'Materials', 'Review'];

export const RSQHeader: React.FC<RSQHeaderProps> = ({
  onPrintBlank,
  employeeCount,
  productCount,
  totalQuantity,
}) => {
  return (
    <header className="no-print mb-6 rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-slate-500">Staff Request</p>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Requisition Workspace
              </h1>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Build one signed material request by setting the request details, tagging employees, assigning materials, and reviewing quantities before upload.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid grid-cols-3 rounded-lg border border-slate-200 bg-slate-50 text-center">
            <div className="px-4 py-2">
              <p className="text-base font-semibold tabular-nums text-slate-950">{employeeCount}</p>
              <p className="text-[11px] font-medium text-slate-500">Employees</p>
            </div>
            <div className="border-x border-slate-200 px-4 py-2">
              <p className="text-base font-semibold tabular-nums text-slate-950">{productCount}</p>
              <p className="text-[11px] font-medium text-slate-500">Products</p>
            </div>
            <div className="px-4 py-2">
              <p className="text-base font-semibold tabular-nums text-slate-950">{totalQuantity}</p>
              <p className="text-[11px] font-medium text-slate-500">Qty</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onPrintBlank}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            Blank Form
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-4" aria-label="Requisition progress">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
              {index + 1}
            </span>
            <span className="text-xs font-semibold text-slate-700">{step}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <FileText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          Keep the printed form and uploaded signed copy aligned. The system will submit one request row per employee and material quantity.
        </p>
      </div>
    </header>
  );
};
