'use client';

import { X, ArrowUpRight, Search, MapPin, User, Calendar, Database, Trash2, Loader2, Info } from 'lucide-react';
import { Product, Location } from '../types';

interface ReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  form: {
    sourceLocationId: string;
    requestedBy: string;
    whereTo: string;
    remarks: string;
    items: { productId: string, name: string, description: string, unit: string, available: number, quantity: number }[];
  };
  setForm: (form: any) => void;
  locations: Location[];
  isProcessing: boolean;
  releaseSearchInput: string;
  setReleaseSearchInput: (input: string) => void;
  releaseSearchResults: Product[];
  releaseSearchLoading: boolean;
  addReleaseItem: (product: Product) => void;
  removeReleaseItem: (productId: string) => void;
  updateReleaseQty: (productId: string, qty: number) => void;
  clientDate: string;
}

export function ReleaseModal({
  isOpen,
  onClose,
  onSubmit,
  form,
  setForm,
  locations,
  isProcessing,
  releaseSearchInput,
  setReleaseSearchInput,
  releaseSearchResults,
  releaseSearchLoading,
  addReleaseItem,
  removeReleaseItem,
  updateReleaseQty,
  clientDate
}: ReleaseModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Record New Item Release"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div className="w-full max-w-7xl rounded-[2.5rem] bg-white p-0 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Premium Header */}
        <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-gray-800 px-10 py-8 flex items-center justify-between text-white">
          <div className="flex items-center space-x-5">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/5">
              <ArrowUpRight className="h-7 w-7 text-[#50C878]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight uppercase italic">New Release</h2>
              <p className="text-xs text-gray-500 font-bold tracking-[0.2em] uppercase mt-1 opacity-70">Item Release Form</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 hover:bg-white/10 rounded-full transition-all"
            aria-label="Close release modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-6 bg-gray-50/30">
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 max-w-[1400px] mx-auto">
            {/* Transaction Information Section - Left Sidebar style */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex items-center space-x-4 pb-4 border-b border-gray-100">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Info className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Transaction Info</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="group">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1 group-focus-within:text-primary transition-colors">Release From Area</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <select 
                        required 
                        value={form.sourceLocationId} 
                        onChange={(e) => setForm({...form, sourceLocationId: e.target.value})} 
                        className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                        aria-label="Select source location"
                      >
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="group">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">Issued To / Requested By</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <input 
                        required 
                        type="text" 
                        placeholder="Employee Name / Dept"
                        value={form.requestedBy} 
                        onChange={(e) => setForm({...form, requestedBy: e.target.value})} 
                        className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all"
                        maxLength={200}
                        aria-label="Name of person or department receiving items"
                      />
                    </div>
                  </div>

                  <div className="group">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">Destination / Purpose</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <input 
                        required 
                        type="text" 
                        placeholder="e.g. Server Room, Project X"
                        value={form.whereTo} 
                        onChange={(e) => setForm({...form, whereTo: e.target.value})} 
                        className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all"
                        maxLength={200}
                        aria-label="Destination or purpose of release"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 text-white space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-[#50C878]" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Logged Date</span>
                  </div>
                  <span className="text-xs font-semibold">{clientDate}</span>
                </div>
                <div className="pt-4 border-t border-gray-800">
                  <div className="flex items-center space-x-6 text-gray-300">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                      <span className="text-xs font-semibold uppercase tracking-wider">Active Session</span>
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-wider">
                      Items: {form.items.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Item Selection and List Section - Main Area */}
            <div className="space-y-6 flex flex-col h-[600px]">
              {/* Item Search Bar */}
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center">
                  {releaseSearchLoading ? (
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  ) : (
                    <Search className="h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                  )}
                </div>
                <input 
                  type="text" 
                  placeholder="Search by name or SKU to add items..."
                  value={releaseSearchInput}
                  onChange={(e) => setReleaseSearchInput(e.target.value)}
                  className="w-full pl-16 pr-10 py-6 bg-white border-2 border-gray-100 rounded-[2rem] text-lg font-bold outline-none focus:border-primary shadow-xl shadow-gray-200/50 transition-all"
                  aria-label="Search for items to add to release"
                />
                
                {/* Search Results Dropdown */}
                {releaseSearchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-3 bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 z-10 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Found {releaseSearchResults.length} Matching Items</span>
                      <button onClick={() => setReleaseSearchInput('')} className="text-xs font-semibold text-primary hover:underline">Clear Search</button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      {releaseSearchResults.map(product => {
                        const isAdded = form.items.find(i => i.productId === product.id);
                        const available = product.stocks.find(s => s.locationId === form.sourceLocationId)?.quantity || 0;
                        
                        return (
                          <div 
                            key={product.id} 
                            onClick={() => !isAdded && available > 0 && addReleaseItem(product)}
                            className={`flex items-center justify-between p-5 hover:bg-primary/5 transition-all cursor-pointer border-b border-gray-50 last:border-0 ${isAdded ? 'opacity-50 grayscale pointer-events-none' : ''}`}
                          >
                            <div className="flex items-center space-x-4">
                              <div className="h-12 w-12 bg-gray-100 rounded-xl flex items-center justify-center">
                                <Database className="h-6 w-6 text-gray-500" />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900">{product.name}</h4>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{product.description || 'No description available'}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-6">
                              <div className="text-right">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-0.5">Available In-Store</span>
                                <span className={`text-sm font-semibold ${available <= 0 ? 'text-red-500' : 'text-gray-900'}`}>{available} {product.unit}</span>
                              </div>
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${isAdded ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-300'}`}>
                                <ArrowUpRight className="h-4 w-4" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Items List */}
              <div className="flex-1 bg-white rounded-[2rem] border-2 border-gray-100 shadow-inner overflow-hidden flex flex-col">
                <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Release Manifest ({form.items.length} Items)</h3>
                  <button type="button" onClick={() => setForm({...form, items: []})} className="text-xs font-semibold text-red-400 hover:text-red-600 uppercase tracking-wider">Reset List</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {form.items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4 opacity-50">
                      <div className="p-8 rounded-full bg-gray-50 border-4 border-dashed border-gray-100">
                        <Database className="h-12 w-12" />
                      </div>
                      <p className="text-sm font-bold uppercase tracking-wider">Manifest is currently empty</p>
                    </div>
                  ) : (
                    form.items.map(item => (
                      <div key={item.productId} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl group hover:border-primary transition-all animate-in slide-in-from-right-4">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm group-hover:shadow-md transition-all">
                            <Database className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 leading-none mb-1">{item.name}</h4>
                            <div className="flex items-center space-x-3">
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-tighter">{item.available} Available</span>
                              <span className="text-gray-300">•</span>
                              <span className="text-xs font-semibold text-primary uppercase tracking-tighter">{item.unit}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-8">
                          <div className="flex items-center bg-white border border-gray-100 rounded-xl p-1 shadow-sm">
                            <button 
                              type="button"
                              onClick={() => updateReleaseQty(item.productId, Math.max(1, item.quantity - 1))}
                              className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-primary hover:bg-gray-50 rounded-lg transition-all"
                            >-</button>
                            <input 
                              type="number" 
                              value={item.quantity}
                              onChange={(e) => updateReleaseQty(item.productId, parseInt(e.target.value) || 1)}
                              className="w-16 text-center font-semibold text-gray-900 outline-none"
                              aria-label={`Quantity for ${item.name}`}
                            />
                            <button 
                              type="button"
                              onClick={() => updateReleaseQty(item.productId, Math.min(item.available, item.quantity + 1))}
                              className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-primary hover:bg-gray-50 rounded-lg transition-all"
                            >+</button>
                          </div>
                          <button 
                            type="button"
                            onClick={() => removeReleaseItem(item.productId)}
                            className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-[1400px] mx-auto pt-6 flex justify-between items-center border-t border-gray-100">
            <div className="flex items-center space-x-3 text-xs text-gray-500 font-bold italic">
               <Info className="h-4 w-4" />
               <span>Releasing from {locations.find(l => l.id === form.sourceLocationId)?.name || 'Selected Area'}</span>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-10 py-5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-900 transition-all"
                aria-label="Discard manifest"
              >
                Cancel
              </button>
              <button 
                disabled={isProcessing || form.items.length === 0}
                type="submit" 
                className="px-16 py-5 bg-[#50C878] text-white rounded-[1.5rem] text-xs font-semibold uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(80,200,120,0.3)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : 'Complete Release'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
