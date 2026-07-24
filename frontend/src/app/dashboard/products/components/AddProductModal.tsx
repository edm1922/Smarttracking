'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Location } from '../types';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  form: any;
  setForm: (form: any) => void;
  locations: Location[];
  isSaving: boolean;
  standardUnits: string[];
  isAddingCustomUnit: boolean;
  setIsAddingCustomUnit: (adding: boolean) => void;
  isAddingCustomPurchaseUnit: boolean;
  setIsAddingCustomPurchaseUnit: (adding: boolean) => void;
}

export function AddProductModal({
  isOpen,
  onClose,
  onSubmit,
  form,
  setForm,
  locations,
  isSaving,
  standardUnits,
  isAddingCustomUnit,
  setIsAddingCustomUnit,
  isAddingCustomPurchaseUnit,
  setIsAddingCustomPurchaseUnit
}: AddProductModalProps) {
  const effectiveMarkup = form.markupPercent ?? parseFloat(typeof window !== 'undefined' ? localStorage.getItem('global_markup_percent') || '0' : '0');
  const computedSellingPrice = form.price > 0 ? parseFloat((form.price * (1 + effectiveMarkup / 100)).toFixed(2)) : 0;
  const [sellingPriceInput, setSellingPriceInput] = useState(computedSellingPrice.toString());

  useEffect(() => {
    setSellingPriceInput(computedSellingPrice > 0 ? computedSellingPrice.toString() : '');
  }, [form.markupPercent, form.price]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Add New Product"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-xl bg-white p-8 shadow-lg my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Add New Item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close add product modal"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Item Name</label>
                <input required type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none" maxLength={200} minLength={1} aria-label="Item name" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none" maxLength={500} aria-label="Item description" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Supplier</label>
                <input type="text" value={form.supplier || ''} onChange={(e) => setForm({...form, supplier: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none" maxLength={200} placeholder="Optional supplier name" aria-label="Supplier name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Markup %</label>
                  <input type="number" step="0.01" min="0" max="9999" value={form.markupPercent ?? ''} onChange={(e) => setForm({...form, markupPercent: e.target.value === '' ? null : parseFloat(e.target.value) || 0})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none" placeholder={`Default: ${typeof window !== 'undefined' ? localStorage.getItem('global_markup_percent') || '0' : '0'}%`} aria-label="Markup percentage" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-green-600 uppercase mb-1">Selling Price</label>
                  {form.price > 0 ? (
                    <input type="number" step="0.01" min="0" value={sellingPriceInput} onChange={(e) => { setSellingPriceInput(e.target.value); const val = parseFloat(e.target.value); if (!isNaN(val) && val >= 0) { const markup = ((val / form.price) - 1) * 100; setForm({...form, markupPercent: Math.max(0, markup)}); } else if (e.target.value === '') { setForm({...form, markupPercent: null}); } }} className="w-full rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 focus:border-green-500 outline-none" aria-label="Selling price" />
                  ) : (
                    <input disabled value="" placeholder="Set cost price first" className="w-full rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-400 cursor-not-allowed" />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Unit (Stock)</label>
                  {!isAddingCustomUnit ? (
                    <div className="relative">
                      <select 
                        value={form.unit} 
                        onChange={(e) => {
                          if (e.target.value === 'ADD_NEW') {
                            setIsAddingCustomUnit(true);
                            setForm({ ...form, unit: '' });
                          } else {
                            setForm({ ...form, unit: e.target.value });
                          }
                        }} 
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none"
                      >
                        {standardUnits.map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                        {form.unit && !standardUnits.includes(form.unit) && (
                          <option value={form.unit}>{form.unit}</option>
                        )}
                        <option value="ADD_NEW">+ Add New Unit...</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input 
                        autoFocus
                        type="text" 
                        placeholder="Enter unit..." 
                        value={form.unit} 
                        onChange={(e) => setForm({...form, unit: e.target.value.toUpperCase()})} 
                        className="w-full rounded-md border border-primary px-3 py-2 text-sm outline-none" 
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          setIsAddingCustomUnit(false);
                          setForm({ ...form, unit: 'PCS' });
                        }}
                        className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                        title="Back to list"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Purchase Unit</label>
                  {!isAddingCustomPurchaseUnit ? (
                    <div className="relative">
                      <select 
                        value={form.purchaseUnit || ''} 
                        onChange={(e) => {
                          if (e.target.value === 'ADD_NEW') {
                            setIsAddingCustomPurchaseUnit(true);
                            setForm({ ...form, purchaseUnit: '' });
                          } else {
                            setForm({ ...form, purchaseUnit: e.target.value });
                          }
                        }} 
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none"
                      >
                        <option value="">None</option>
                        {standardUnits.map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                        {form.purchaseUnit && !standardUnits.includes(form.purchaseUnit) && (
                          <option value={form.purchaseUnit}>{form.purchaseUnit}</option>
                        )}
                        <option value="ADD_NEW">+ Add New Unit...</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input 
                        autoFocus
                        type="text" 
                        placeholder="Enter purchase unit..." 
                        value={form.purchaseUnit || ''} 
                        onChange={(e) => setForm({...form, purchaseUnit: e.target.value.toUpperCase()})} 
                        className="w-full rounded-md border border-primary px-3 py-2 text-sm outline-none" 
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          setIsAddingCustomPurchaseUnit(false);
                          setForm({ ...form, purchaseUnit: '' });
                        }}
                        className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                        title="Back to list"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Price</label>
                  <input type="number" step="0.01" max="99999999.99" value={form.price || ''} onChange={(e) => setForm({...form, price: parseFloat(e.target.value) || 0})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none" aria-label="Item price" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">SKU / Part Number (Auto-Gen if empty)</label>
                <input type="text" value={form.sku} onChange={(e) => setForm({...form, sku: e.target.value.toUpperCase()})} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-gray-50" placeholder="Leave blank for auto-generate" maxLength={50} aria-label="SKU or part number" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Threshold (Override)</label>
                <input type="number" value={form.threshold || ''} onChange={(e) => setForm({...form, threshold: parseFloat(e.target.value) || 0})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none" placeholder="0.00 for Default" max="999999" aria-label="Restock threshold" />
                <p className="mt-1 text-xs text-gray-500 italic tracking-tight">Needs Restock when stock ≤ 50% of threshold</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Actual Stock</label>
                <input type="number" value={form.initialStock || ''} onChange={(e) => setForm({...form, initialStock: parseInt(e.target.value) || 0})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none" max="999999" aria-label="Initial stock quantity" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Location for Stock</label>
                <select 
                  value={form.initialLocationId} 
                  onChange={(e) => setForm({...form, initialLocationId: e.target.value})} 
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none"
                >
                  <option value="">Select Location</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Pending Order (Auto)</label>
                <input 
                  disabled 
                  type="text" 
                  value={Math.max(0, form.threshold - form.initialStock) || 0}
                  className="w-full rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500 font-bold cursor-not-allowed" 
                />
              </div>
              <div className="pt-4 border-t border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={form.showInInventory}
                      onChange={(e) => setForm({ ...form, showInInventory: e.target.checked })}
                      className="peer sr-only"
                    />
                    <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary transition-all duration-300"></div>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-4"></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider group-hover:text-primary transition-colors">Show in Staff Portal</span>
                    <span className="text-[10px] text-gray-500 italic">Visibility in restricted staff-facing portal</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 bg-gray-50 rounded-lg">Cancel</button>
            <button disabled={isSaving} type="submit" className="px-10 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-md transition-all disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
