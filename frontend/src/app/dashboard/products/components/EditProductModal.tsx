'use client';

import { X, Tag, Eye, Trash2, ImageIcon, MapPin, Database, Info } from 'lucide-react';
import { Product, Location } from '../types';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  editingProduct: Product;
  setEditingProduct: (product: any) => void;
  editableStock: number;
  setEditableStock: (stock: number) => void;
  activeEditTab: 'general' | 'stocks';
  setActiveEditTab: (tab: 'general' | 'stocks') => void;
  activeStockSubTab: 'inventory' | 'history';
  setActiveStockSubTab: (tab: 'inventory' | 'history') => void;
  bypassStockEdit: boolean;
  setIsVerifyingPassword: (verifying: boolean) => void;
  handleDelete: () => void;
  isSaving: boolean;
  isUploading1: boolean;
  isUploading2: boolean;
  handleImageUpload: (productId: string, file: File, slot: number) => void;
  handleRemoveImage: (productId: string, slot: number) => void;
  setPreviewImageUrl: (url: string) => void;
  setIsPreviewOpen: (open: boolean) => void;
  standardUnits: string[];
  isAddingCustomUnitEdit: boolean;
  setIsAddingCustomUnitEdit: (adding: boolean) => void;
  locations: Location[];
}

export function EditProductModal({
  isOpen,
  onClose,
  onSubmit,
  editingProduct,
  setEditingProduct,
  editableStock,
  setEditableStock,
  activeEditTab,
  setActiveEditTab,
  activeStockSubTab,
  setActiveStockSubTab,
  bypassStockEdit,
  setIsVerifyingPassword,
  handleDelete,
  isSaving,
  isUploading1,
  isUploading2,
  handleImageUpload,
  handleRemoveImage,
  setPreviewImageUrl,
  setIsPreviewOpen,
  standardUnits,
  isAddingCustomUnitEdit,
  setIsAddingCustomUnitEdit,
  locations
}: EditProductModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-[2rem] bg-white shadow-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gray-50 border-b border-gray-100 p-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Tag className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">Manage Product</h2>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{editingProduct.sku}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-full transition-all shadow-sm">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-8 bg-white border-b border-gray-50">
          <button 
            onClick={() => setActiveEditTab('general')}
            className={`px-6 py-4 text-[11px] font-black uppercase tracking-widest transition-all relative ${activeEditTab === 'general' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
          >
            1. General Info
            {activeEditTab === 'general' && <div className="absolute bottom-0 left-6 right-6 h-1 bg-primary rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveEditTab('stocks')}
            className={`px-6 py-4 text-[11px] font-black uppercase tracking-widest transition-all relative ${activeEditTab === 'stocks' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
          >
            2. Stocks & Assets
            {activeEditTab === 'stocks' && <div className="absolute bottom-0 left-6 right-6 h-1 bg-primary rounded-t-full" />}
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
          {activeEditTab === 'general' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in slide-in-from-left-4 duration-300">
              <div className="space-y-6">
                {/* Image Upload Section */}
                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Product Documentation Media</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="relative group aspect-square rounded-2xl overflow-hidden bg-white border border-gray-200">
                        {editingProduct.imageUrl ? (
                          <>
                            <img src={editingProduct.imageUrl} alt="Slot 1" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                              <button type="button" onClick={() => { setPreviewImageUrl(editingProduct.imageUrl!); setIsPreviewOpen(true); }} className="p-2 bg-white rounded-lg text-gray-900 shadow-xl"><Eye className="h-4 w-4" /></button>
                              <button type="button" onClick={() => handleRemoveImage(editingProduct.id, 1)} className="p-2 bg-red-500 rounded-lg text-white shadow-xl"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </>
                        ) : (
                          <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                            {isUploading1 ? <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <><ImageIcon className="h-6 w-6 text-gray-300 mb-1" /><span className="text-[8px] font-black text-gray-400 uppercase">Primary</span></>}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(editingProduct.id, e.target.files[0], 1)} />
                          </label>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="relative group aspect-square rounded-2xl overflow-hidden bg-white border border-gray-200">
                        {editingProduct.imageUrl2 ? (
                          <>
                            <img src={editingProduct.imageUrl2} alt="Slot 2" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                              <button type="button" onClick={() => { setPreviewImageUrl(editingProduct.imageUrl2!); setIsPreviewOpen(true); }} className="p-2 bg-white rounded-lg text-gray-900 shadow-xl"><Eye className="h-4 w-4" /></button>
                              <button type="button" onClick={() => handleRemoveImage(editingProduct.id, 2)} className="p-2 bg-red-500 rounded-lg text-white shadow-xl"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </>
                        ) : (
                          <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                            {isUploading2 ? <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <><ImageIcon className="h-6 w-6 text-gray-300 mb-1" /><span className="text-[8px] font-black text-gray-400 uppercase">Secondary</span></>}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(editingProduct.id, e.target.files[0], 2)} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Item Name</label>
                    <input required type="text" value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Description</label>
                    <input type="text" value={editingProduct.description || ''} onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-blue-50/30 p-6 rounded-[2rem] border border-blue-50">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input type="checkbox" checked={editingProduct.showInInventory} onChange={(e) => setEditingProduct({ ...editingProduct, showInInventory: e.target.checked })} className="peer sr-only" />
                      <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary transition-all duration-300"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-4"></div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-gray-500 uppercase tracking-widest group-hover:text-primary transition-colors">Show in Staff Portal</span>
                      <span className="text-[9px] text-gray-400 font-bold italic leading-tight">Controls visibility in the restricted staff-facing portal</span>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Unit</label>
                    {!isAddingCustomUnitEdit ? (
                      <div className="relative">
                        <select 
                          value={editingProduct.unit} 
                          onChange={(e) => {
                            if (e.target.value === 'ADD_NEW') {
                              setIsAddingCustomUnitEdit(true);
                              setEditingProduct({ ...editingProduct, unit: '' });
                            } else {
                              setEditingProduct({ ...editingProduct, unit: e.target.value });
                            }
                          }} 
                          className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 text-sm font-bold outline-none focus:bg-white focus:border-primary appearance-none"
                        >
                          {standardUnits.map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                          {editingProduct.unit && !standardUnits.includes(editingProduct.unit) && (
                            <option value={editingProduct.unit}>{editingProduct.unit}</option>
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
                          value={editingProduct.unit} 
                          onChange={(e) => setEditingProduct({...editingProduct, unit: e.target.value.toUpperCase()})} 
                          className="w-full rounded-2xl border border-primary bg-white px-5 py-4 text-sm font-bold outline-none" 
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            setIsAddingCustomUnitEdit(false);
                            setEditingProduct({ ...editingProduct, unit: 'PCS' });
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="Back to list"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Price</label>
                    <input type="number" step="0.01" value={editingProduct.price || ''} onChange={(e) => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})} className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Restock Threshold</label>
                  <input type="number" value={isNaN(editingProduct.threshold) ? '' : editingProduct.threshold} onChange={(e) => setEditingProduct({...editingProduct, threshold: parseFloat(e.target.value) || 0})} className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 text-sm font-bold outline-none focus:bg-white focus:border-primary transition-all" />
                  <p className="mt-2 text-[9px] text-gray-400 font-bold italic uppercase px-1">Alerts system when stock falls below this value</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              {/* Stock Sub-Tabs */}
              <div className="flex bg-gray-50 p-1.5 rounded-2xl w-fit">
                <button 
                  type="button"
                  onClick={() => setActiveStockSubTab('inventory')}
                  className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeStockSubTab === 'inventory' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Inventory
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveStockSubTab('history')}
                  className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeStockSubTab === 'history' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Distribution
                </button>
              </div>

              {activeStockSubTab === 'inventory' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className={`p-8 rounded-[2.5rem] border-2 transition-all relative group ${bypassStockEdit ? 'bg-blue-50/30 border-blue-100' : 'bg-gray-50/50 border-gray-100'}`}>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${bypassStockEdit ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-400'}`}>
                            <Database className="h-5 w-5" />
                          </div>
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Actual Stock (Total)</label>
                        </div>
                        {!bypassStockEdit && (
                          <button 
                            type="button" 
                            onClick={() => setIsVerifyingPassword(true)}
                            className="px-3 py-1 bg-white border border-gray-200 text-[9px] font-black text-gray-400 uppercase rounded-lg hover:border-primary hover:text-primary transition-all"
                          >
                            Edit Stock
                          </button>
                        )}
                      </div>
                      
                      <div className="flex items-end gap-3">
                        <input 
                          disabled={!bypassStockEdit}
                          type="number" 
                          value={editableStock || ''}
                          onChange={(e) => setEditableStock(parseInt(e.target.value) || 0)}
                          className={`w-full bg-transparent text-5xl font-black outline-none transition-all ${bypassStockEdit ? 'text-primary' : 'text-gray-300'}`} 
                        />
                        <span className="text-xl font-black text-gray-400 mb-2">{editingProduct.unit}</span>
                      </div>
                      
                      {bypassStockEdit ? (
                        <div className="mt-6 p-4 bg-blue-100/50 rounded-2xl flex items-center gap-3 border border-blue-100 animate-in fade-in zoom-in-95">
                          <Info className="h-4 w-4 text-blue-600" />
                          <p className="text-xs font-bold text-blue-700 leading-tight">Administrative Bypass Enabled. Changes will not trigger adjustment logs.</p>
                        </div>
                      ) : (
                        <p className="mt-6 text-xs text-gray-400 font-bold italic leading-tight">Unlock with super admin password to manually correct inventory levels without logging.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-gray-50/50 p-8 rounded-[2.5rem] border border-gray-100">
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                         <Info className="h-3.5 w-3.5" /> Inventory Health
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-500">Replenishment Status</span>
                          {editableStock <= editingProduct.threshold ? (
                            <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-[9px] font-black uppercase">Low Stock</span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-600 rounded text-[9px] font-black uppercase">Healthy</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-500">Current Deficit</span>
                          <span className="text-sm font-black text-gray-900">{Math.max(0, editingProduct.threshold - editableStock)} {editingProduct.unit}</span>
                        </div>
                        <div className="pt-4 border-t border-gray-100">
                          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${editableStock <= editingProduct.threshold ? 'bg-red-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(100, (editableStock / (editingProduct.threshold || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50/50 rounded-[2rem] border border-gray-100 overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-100/50">
                        <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Storage Location</th>
                        <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">On-Hand Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {editingProduct.stocks.map(s => (
                        <tr key={s.locationId} className="hover:bg-white transition-colors">
                          <td className="px-8 py-4 flex items-center gap-3">
                            <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center border border-gray-100 shadow-sm">
                              <MapPin className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-sm font-bold text-gray-900">{s.location.name}</span>
                          </td>
                          <td className="px-8 py-4 text-right text-sm font-black text-gray-900">
                            {s.quantity} {editingProduct.unit}
                          </td>
                        </tr>
                      ))}
                      {editingProduct.stocks.length === 0 && (
                        <tr><td colSpan={2} className="px-8 py-10 text-center text-xs text-gray-400 italic">No distribution records found. All stock is centralized.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-8 border-t border-gray-100 mt-auto">
            <button 
              type="button" 
              onClick={handleDelete}
              className="px-6 py-4 text-xs font-black text-red-500 uppercase tracking-widest hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100"
            >
              Delete Asset Record
            </button>
            <div className="flex gap-4">
              <button type="button" onClick={onClose} className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600">Cancel</button>
              <button disabled={isSaving} type="submit" className="px-12 py-4 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                {isSaving ? 'Updating Asset...' : 'Update Details'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
