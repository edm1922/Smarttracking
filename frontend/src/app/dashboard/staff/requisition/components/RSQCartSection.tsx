import React, { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ClipboardCheck,
  FolderOpen,
  Save,
  Send,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { SelectedItem, Employee, employeeKey } from './RSQTypes';

interface RSQCartSectionProps {
  selectedItems: SelectedItem[];
  employees: Employee[];
  updateCartItemQuantity: (productId: string, empName: string, qty: number) => void;
  removeCartItem: (productId: string) => void;
  handleOpenSubmitModal: () => void;
  isSubmitting: boolean;
  onSaveDraft: () => void;
  savedDrafts: string[];
  onLoadDraft: (name: string) => void;
  onDeleteDraft: (name: string) => void;
}

const safeId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-');

export const RSQCartSection: React.FC<RSQCartSectionProps> = ({
  selectedItems,
  employees,
  updateCartItemQuantity,
  removeCartItem,
  handleOpenSubmitModal,
  isSubmitting,
  onSaveDraft,
  savedDrafts,
  onLoadDraft,
  onDeleteDraft,
}) => {
  const [showDraftDropdown, setShowDraftDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDraftDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const totalQuantity = selectedItems.reduce((sum, item) => {
    return sum + Object.values(item.quantities || {}).reduce((a, b) => a + b, 0);
  }, 0);

  const overStockCount = selectedItems.filter((item) => {
    const rowTotal = Object.values(item.quantities || {}).reduce((a, b) => a + b, 0);
    return rowTotal > item.maxQuantity;
  }).length;

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-700">Step 4</p>
            <h2 className="text-lg font-semibold text-slate-950">Review Quantities</h2>
            <p className="mt-1 text-sm text-slate-500">Confirm each employee quantity before printing and uploading the signed form.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
              {selectedItems.length} products
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
              {employees.length} employees
            </span>
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              {totalQuantity} total qty
            </span>
          </div>
        </div>

        {overStockCount > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{overStockCount} product total exceeds available stock. Review the highlighted rows before submission.</span>
          </div>
        )}
      </div>

      {selectedItems.length > 0 ? (
        <div>
          <div className="hidden overflow-x-auto custom-scrollbar md:block">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <caption className="sr-only">Editable quantity matrix by product and employee</caption>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th scope="col" className="sticky left-0 z-10 min-w-72 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase text-slate-600">
                    Product
                  </th>
                  {employees.map(emp => (
                    <th key={employeeKey(emp)} scope="col" className="min-w-40 border-l border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase text-slate-600">
                      <span className="block truncate text-slate-900">{emp.lastName}, {emp.firstName}</span>
                      <span className="block truncate text-[11px] font-medium normal-case text-slate-500">{emp.position}</span>
                    </th>
                  ))}
                  <th scope="col" className="min-w-28 border-l border-slate-200 px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                    Row Total
                  </th>
                  <th scope="col" className="min-w-20 border-l border-slate-200 px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedItems.map((item) => {
                  const rowTotal = Object.values(item.quantities || {}).reduce((a, b) => a + b, 0);
                  const exceedsStock = rowTotal > item.maxQuantity;
                  return (
                    <tr key={item.productId} className={exceedsStock ? 'bg-amber-50' : 'hover:bg-slate-50'}>
                      <th scope="row" className={`sticky left-0 z-10 border-r border-slate-100 px-5 py-4 text-left ${exceedsStock ? 'bg-amber-50' : 'bg-white'}`}>
                        <span className="block max-w-72 break-words text-sm font-semibold text-slate-950">{item.productName}</span>
                        <span className="mt-1 block max-w-72 break-words text-xs font-normal leading-5 text-slate-500">
                          {item.description || 'No description'}
                        </span>
                        <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${exceedsStock ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                          Stock: {item.maxQuantity} {item.unit || 'PCS'}
                        </span>
                      </th>
                      {employees.map(emp => {
                        const key = employeeKey(emp);
                        const inputId = `qty-${safeId(item.productId)}-${safeId(key)}`;
                        return (
                          <td key={key} className="border-l border-slate-100 px-4 py-4 text-center">
                            <label htmlFor={inputId} className="sr-only">Quantity for {item.productName} assigned to {emp.lastName}, {emp.firstName}</label>
                            <input
                              id={inputId}
                              name={inputId}
                              type="number"
                              inputMode="numeric"
                              min="0"
                              value={item.quantities[key] || 0}
                              onChange={(e) => updateCartItemQuantity(item.productId, key, Math.max(0, parseInt(e.target.value) || 0))}
                              className={`min-h-10 w-20 rounded-md border px-2 py-2 text-center text-sm font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                                (item.quantities[key] || 0) > 0
                                  ? 'border-blue-300 bg-blue-50 text-blue-900'
                                  : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                              }`}
                            />
                          </td>
                        );
                      })}
                      <td className="border-l border-slate-100 px-4 py-4 text-right">
                        <span className={`font-semibold tabular-nums ${exceedsStock ? 'text-amber-800' : 'text-slate-900'}`}>{rowTotal}</span>
                      </td>
                      <td className="border-l border-slate-100 px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => removeCartItem(item.productId)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          aria-label={`Remove ${item.productName}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <th scope="row" className="sticky left-0 z-10 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700">Total per Employee</th>
                  {employees.map(emp => {
                    const key = employeeKey(emp);
                    const total = selectedItems.reduce((sum, item) => sum + (item.quantities[key] || 0), 0);
                    return (
                      <td key={key} className="border-l border-slate-200 px-4 py-3 text-center text-sm font-semibold tabular-nums text-blue-700">
                        {total}
                      </td>
                    );
                  })}
                  <td className="border-l border-slate-200 px-4 py-3 text-right text-sm font-semibold tabular-nums text-slate-900">{totalQuantity}</td>
                  <td className="border-l border-slate-200" />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="space-y-4 p-4 md:hidden">
            {selectedItems.map((item) => {
              const rowTotal = Object.values(item.quantities || {}).reduce((a, b) => a + b, 0);
              const exceedsStock = rowTotal > item.maxQuantity;
              return (
                <div key={item.productId} className={`rounded-md border p-4 ${exceedsStock ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-sm font-semibold text-slate-950">{item.productName}</h3>
                      <p className="mt-1 break-words text-xs leading-5 text-slate-500">{item.description || 'No description'}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-600">Stock: {item.maxQuantity} {item.unit || 'PCS'} - Total: {rowTotal}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCartItem(item.productId)}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      aria-label={`Remove ${item.productName}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {employees.map(emp => {
                      const key = employeeKey(emp);
                      const inputId = `mobile-qty-${safeId(item.productId)}-${safeId(key)}`;
                      return (
                        <div key={key} className="flex items-center justify-between gap-3 rounded-md bg-white p-3 shadow-sm">
                          <label htmlFor={inputId} className="min-w-0 text-sm font-medium text-slate-700">
                            <span className="block truncate">{emp.lastName}, {emp.firstName}</span>
                            <span className="block truncate text-xs text-slate-500">{emp.position}</span>
                          </label>
                          <input
                            id={inputId}
                            name={inputId}
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={item.quantities[key] || 0}
                            onChange={(e) => updateCartItemQuantity(item.productId, key, Math.max(0, parseInt(e.target.value) || 0))}
                            className="min-h-10 w-20 rounded-md border border-slate-300 px-2 py-2 text-center text-sm font-semibold tabular-nums text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400">
            <ShoppingBag className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">No Materials Selected</h3>
          <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
            Add employees first, then use the material picker to build the requisition list.
          </p>
        </div>
      )}

      <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-blue-700 shadow-sm">
              <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-950">Ready for Final Review?</p>
              <p className="text-sm text-slate-500">Save a draft anytime, or continue to print, sign, upload, and submit.</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowDraftDropdown(!showDraftDropdown)}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:w-auto"
                aria-expanded={showDraftDropdown}
              >
                <FolderOpen className="h-4 w-4" aria-hidden="true" />
                Drafts
                <ChevronDown className={`h-4 w-4 transition-transform ${showDraftDropdown ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {showDraftDropdown && (
                <div className="absolute bottom-full right-0 z-50 mb-2 w-64 overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">
                  {savedDrafts.length > 0 ? (
                    savedDrafts.map(name => (
                      <div key={name} className="flex items-center gap-2 border-b border-slate-100 p-2 last:border-0">
                        <button
                          type="button"
                          onClick={() => {
                            onLoadDraft(name);
                            setShowDraftDropdown(false);
                          }}
                          className="min-w-0 flex-1 rounded px-2 py-2 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                        >
                          <span className="block truncate">{name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteDraft(name)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          aria-label={`Delete draft ${name}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-5 text-center text-sm text-slate-500">No saved drafts</div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onSaveDraft}
              disabled={selectedItems.length === 0 || isSubmitting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Save Draft
            </button>
            <button
              type="button"
              onClick={handleOpenSubmitModal}
              disabled={selectedItems.length === 0 || employees.length === 0 || isSubmitting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Review & Submit
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
