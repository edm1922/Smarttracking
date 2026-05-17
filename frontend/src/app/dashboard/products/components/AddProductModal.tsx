'use client';

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
  setIsAddingCustomUnit
}: AddProductModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-xl bg-white p-8 shadow-2xl my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Add New Item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Item Name:</label>
                <input required type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description:</label>
                <input type="text" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unit:</label>
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
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="Back to list"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price:</label>
                  <input type="number" step="0.01" value={form.price || ''} onChange={(e) => setForm({...form, price: parseFloat(e.target.value) || 0})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">SKU / Part Number (Auto-Gen if empty):</label>
                <input type="text" value={form.sku} onChange={(e) => setForm({...form, sku: e.target.value.toUpperCase()})} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-gray-50" placeholder="LEAVE BLANK FOR AUTO" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Threshold (Override):</label>
                <input type="number" value={form.threshold || ''} onChange={(e) => setForm({...form, threshold: parseFloat(e.target.value) || 0})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none" placeholder="0.00 for Default" />
                <p className="mt-1 text-xs text-gray-400 italic font-medium tracking-tight">Needs Restock when stock ≤ 50% of threshold</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Actual Stock:</label>
                <input type="number" value={form.initialStock || ''} onChange={(e) => setForm({...form, initialStock: parseInt(e.target.value) || 0})} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location for Stock:</label>
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
                <label className="block text-xs font-bold text-gray-300 uppercase mb-1">Pending Order (Auto):</label>
                <input 
                  disabled 
                  type="text" 
                  value={Math.max(0, form.threshold - form.initialStock) || 0}
                  className="w-full rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-400 font-bold cursor-not-allowed" 
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
                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest group-hover:text-primary transition-colors">Show in Staff Portal</span>
                    <span className="text-[9px] text-gray-400 font-bold italic">Visibility in restricted staff-facing portal</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 bg-gray-50 rounded-lg">Cancel</button>
            <button disabled={isSaving} type="submit" className="px-10 py-2.5 text-sm font-bold text-white bg-[#50C878] hover:bg-[#45b068] rounded-lg shadow-lg transition-all active:scale-95 disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
