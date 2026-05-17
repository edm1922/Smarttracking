'use client';

import { X, MapPin, Info } from 'lucide-react';
import { Location } from '../types';

interface StockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  form: {
    productId: string;
    productName: string;
    locationId: string;
    type: 'IN' | 'OUT';
    quantity: number;
    remarks: string;
  };
  setForm: (form: any) => void;
  locations: Location[];
  isProcessing: boolean;
}

export function StockModal({
  isOpen,
  onClose,
  onSubmit,
  form,
  setForm,
  locations,
  isProcessing
}: StockModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-bold ${form.type === 'IN' ? 'text-green-700' : 'text-red-700'}`}>
            Stock {form.type === 'IN' ? 'In' : 'Out'} - {form.productName}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 tracking-widest">Select Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
              <select 
                required 
                value={form.locationId} 
                onChange={(e) => setForm({...form, locationId: e.target.value})} 
                className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-3 text-sm outline-none focus:ring-2"
              >
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                {locations.length === 0 && <option value="">No locations available</option>}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 tracking-widest">Quantity</label>
            <input 
              required 
              type="number" 
              min="1" 
              value={form.quantity || ''} 
              onChange={(e) => setForm({...form, quantity: parseInt(e.target.value) || 0})} 
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 tracking-widest">Remarks</label>
            <input 
              type="text" 
              value={form.remarks} 
              onChange={(e) => setForm({...form, remarks: e.target.value})} 
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2" 
              placeholder="Reference number, purpose, etc."
            />
          </div>
          <div className="bg-blue-50 p-4 rounded-lg flex items-start">
            <Info className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              {form.type === 'IN' 
                ? "Stock will be added to the selected location's balance." 
                : "Stock will be deducted. System will block transaction if balance is insufficient."}
            </p>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-900">Cancel</button>
            <button 
              disabled={isProcessing}
              type="submit" 
              className={`px-8 py-2 text-sm font-bold text-white rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-50 ${form.type === 'IN' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {isProcessing ? 'Processing...' : `Process Stock ${form.type === 'IN' ? 'In' : 'Out'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
