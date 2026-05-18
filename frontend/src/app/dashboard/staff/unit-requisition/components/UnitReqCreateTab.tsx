import { 
  Plus, Search, Box, Trash2, QrCode, ClipboardList, Send, 
  History, ImageIcon, Clock, User, ChevronRight 
} from 'lucide-react';
import { toast } from 'sonner';

interface UnitReqCreateTabProps {
  form: any;
  setForm: (form: any) => void;
  cart: any[];
  myRequests: any[];
  handleDeleteRequest: (id: string) => void;
  removeFromCart: (id: string) => void;
  updateCartItem: (id: string, updates: any) => void;
  handleFileUpload: (id: string, file: File, type: 'qr' | 'reference') => void;
  addToCart: () => void;
  setShowSubmitModal: (show: boolean) => void;
  inventory: any[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  expandedProduct: string | null;
  setExpandedProduct: (id: string | null) => void;
  productFilters: any;
  toggleFilter: (pName: string, sKey: string, sValue: string) => void;
  getFilteredQty: (p: any) => number;
  setCart: (cart: any[]) => void;
}

export const UnitReqCreateTab: React.FC<UnitReqCreateTabProps> = ({
  form,
  setForm,
  cart,
  myRequests,
  handleDeleteRequest,
  removeFromCart,
  updateCartItem,
  handleFileUpload,
  addToCart,
  setShowSubmitModal,
  inventory,
  searchTerm,
  setSearchTerm,
  expandedProduct,
  setExpandedProduct,
  productFilters,
  toggleFilter,
  getFilteredQty,
  setCart,
}) => {
  const pendingFromScans = myRequests.filter(r => r.status === 'PENDING' && !cart.some(c => c.id === r.id));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* LEFT COLUMN: Requisition Form */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden flex flex-col">
          <div className="bg-primary px-8 py-6">
            <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center">
              <ClipboardList className="mr-3 h-5 w-5" />
              Requisition Builder
            </h2>
          </div>

          <div className="p-8 space-y-8 flex-1 overflow-y-auto max-h-[75vh] custom-scrollbar">
            {/* Pending Scans Section */}
            {pendingFromScans.length > 0 && (
              <div className="bg-orange-50/50 rounded-[2rem] border border-orange-100 p-6 space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-orange-100 rounded-2xl flex items-center justify-center">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Awaiting Approval</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">QR Scans pending submission</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {pendingFromScans.map((item) => (
                    <div key={item.id} className="bg-white p-4 rounded-2xl border border-orange-100/50 flex items-center justify-between hover:border-orange-500/30 transition-all group shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center border border-gray-100">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} className="w-full h-full object-cover" alt="QR" />
                          ) : (
                            <QrCode className="h-5 w-5 text-gray-300" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-mono font-black text-gray-900 leading-none mb-1.5">{item.item?.slug || item.itemId}</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                            <span className="text-orange-600 mr-2">{item.qty} {item.unit}</span>
                            {item.item?.name && <span className="opacity-60">• {item.item.name}</span>}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteRequest(item.id)}
                        className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual List Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <Box className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Current Selection</h3>
                </div>
                <button 
                  onClick={addToCart}
                  className="px-4 py-2 bg-primary/5 hover:bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  + Add Manual Row
                </button>
              </div>

              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="bg-gray-50/50 rounded-3xl border border-gray-100 p-6 space-y-6 hover:border-primary/20 transition-all group">
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Scan or Enter Slug</label>
                          <div className="flex items-center gap-3">
                            <div className="relative group/input flex-1">
                              <input
                                type="text"
                                placeholder="TYPE SLUG..."
                                value={item.manualSlug}
                                onChange={e => updateCartItem(item.id, { manualSlug: e.target.value.toUpperCase() })}
                                className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm font-mono font-black text-primary outline-none focus:border-primary transition-all uppercase placeholder:text-gray-200"
                              />
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                {item.status === 'success' && (
                                  <div className="h-6 w-6 bg-green-500 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                                    <ChevronRight className="h-4 w-4 text-white rotate-90" />
                                  </div>
                                )}
                              </div>
                            </div>
                            <label className="cursor-pointer group/upload">
                              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(item.id, e.target.files[0], 'qr')} />
                              <div className="h-[52px] w-[52px] bg-white border-2 border-gray-100 rounded-2xl flex items-center justify-center group-hover/upload:border-primary group-hover/upload:bg-primary/5 transition-all shadow-sm">
                                <QrCode className="h-5 w-5 text-gray-400 group-hover/upload:text-primary" />
                              </div>
                            </label>
                          </div>
                          {item.productName && (
                            <div className="flex items-center gap-2 mt-2 px-1 animate-in slide-in-from-left-2 duration-300">
                              <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                              <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">{item.productName}</span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantity</label>
                            <input
                              type="number"
                              value={item.qty}
                              onChange={e => updateCartItem(item.id, { qty: parseInt(e.target.value) || 1 })}
                              className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm font-black text-gray-900 outline-none focus:border-primary transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Unit</label>
                            <input
                              type="text"
                              value={item.unit}
                              onChange={e => updateCartItem(item.id, { unit: e.target.value })}
                              className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm font-black text-gray-400 uppercase outline-none focus:border-primary transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="p-4 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="pt-6 border-t border-gray-100/50">
                      <div className="flex flex-wrap gap-4">
                        <label className="cursor-pointer group/ref">
                          <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(item.id, e.target.files[0], 'reference')} />
                          <div className="flex items-center gap-3 px-5 py-3 bg-white border-2 border-gray-100 rounded-2xl group-hover/ref:border-primary transition-all shadow-sm">
                            <ImageIcon className="h-4 w-4 text-gray-400 group-hover/ref:text-primary" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                              {item.referenceFile ? 'Change Reference' : 'Add Image Ref'}
                            </span>
                          </div>
                        </label>
                        {item.referencePreview && (
                          <div className="h-11 w-11 rounded-xl border-2 border-gray-100 overflow-hidden shadow-sm animate-in zoom-in duration-300">
                            <img src={item.referencePreview} className="h-full w-full object-cover" alt="Preview" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {cart.length === 0 && (
                  <div className="py-20 text-center space-y-6">
                    <div className="h-20 w-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mx-auto">
                      <Search className="h-8 w-8 text-gray-200" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Your list is empty</p>
                      <p className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter italic">Select from inventory or use the form above</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-8 bg-gray-50/50 border-t border-gray-100">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20">
                  <Send className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-900 uppercase tracking-widest">Ready to submit?</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Total items in list: {cart.length}</p>
                </div>
              </div>
              <button
                onClick={() => setShowSubmitModal(true)}
                disabled={cart.length === 0 && pendingFromScans.length === 0}
                className="w-full md:w-auto px-12 py-5 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/30 hover:bg-primary-dark hover:-translate-y-1 transition-all active:translate-y-0 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
              >
                Proceed to Verification
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Inventory Explorer */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden flex flex-col h-full">
          <div className="p-8 border-b border-gray-50">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center">
              <Search className="mr-3 h-5 w-5 text-primary" />
              Inventory Explorer
            </h2>
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="SEARCH EQUIPMENT, UNITS, OR SLUGS..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50/50 border-2 border-transparent rounded-2xl pl-16 pr-8 py-5 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all placeholder:text-gray-200 placeholder:uppercase"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar max-h-[85vh]">
            <div className="space-y-3">
              {inventory
                .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((product) => (
                  <div key={product.name} className={`rounded-3xl border transition-all duration-300 ${expandedProduct === product.name ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5' : 'border-gray-100 bg-white hover:border-gray-200 shadow-sm'}`}>
                    <button
                      onClick={() => setExpandedProduct(expandedProduct === product.name ? null : product.name)}
                      className="w-full p-5 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-colors ${expandedProduct === product.name ? 'bg-primary text-white' : 'bg-gray-50 text-gray-400'}`}>
                          <Box className="h-6 w-6" />
                        </div>
                        <div className="text-left">
                          <h4 className={`text-xs font-black uppercase tracking-widest transition-colors ${expandedProduct === product.name ? 'text-primary' : 'text-gray-900'}`}>{product.name}</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1">Available: {getFilteredQty(product)} {product.unit}</p>
                        </div>
                      </div>
                      <ChevronRight className={`h-5 w-5 text-gray-300 transition-transform duration-300 ${expandedProduct === product.name ? 'rotate-90 text-primary' : ''}`} />
                    </button>

                    {expandedProduct === product.name && (
                      <div className="px-5 pb-5 pt-2 space-y-6 animate-in slide-in-from-top-2 duration-300">
                        {/* Specs Filtering */}
                        {Object.entries(product.specs).map(([key, values]) => (
                          <div key={key} className="space-y-3">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">{key}</p>
                            <div className="flex flex-wrap gap-2">
                              {(values as any[]).map((v: any, index: number) => (
                                <button
                                  key={`${v}-${index}`}
                                  onClick={() => toggleFilter(product.name, key, v)}
                                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${productFilters[product.name]?.[key] === v ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-white border border-gray-100 text-gray-400 hover:border-primary/30 hover:text-primary'}`}
                                >
                                  {v}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}

                        {/* List of Slugs */}
                        <div className="pt-4 border-t border-primary/10">
                          <p className="text-[9px] font-black text-primary/60 uppercase tracking-[0.2em] px-1 mb-3">Available Units (Select to add)</p>
                          <div className="grid grid-cols-1 gap-2">
                            {product.items
                              .filter((item: any) => Object.entries(productFilters[product.name] || {}).every(([fKey, fVal]) => 
                                item.fieldValues.some((fv: any) => {
                                  if (fv.name !== fKey) return false;
                                  const val = fv.value;
                                  if (val && typeof val === 'object' && val.useUnitQty) return String(val.main || '') === fVal;
                                  return String(val) === fVal;
                                })
                              ))
                              .map((item: any) => (
                                <button
                                  key={item.slug}
                                  onClick={() => {
                                    const currentSpecStr = item.fieldValues
                                      .filter((fv: any) => fv.value)
                                      .map((fv: any) => {
                                        const v = fv.value;
                                        const displayVal = typeof v === 'object' ? (v.main || '') : v;
                                        return displayVal ? `${fv.name}: ${displayVal}` : null;
                                      })
                                      .filter(Boolean)
                                      .join(', ');
                                    
                                    setCart([...cart, {
                                      id: Math.random().toString(36).substr(2, 9),
                                      slug: item.slug,
                                      manualSlug: item.slug,
                                      productName: product.name,
                                      qty: 1,
                                      unit: product.unit,
                                      specs: currentSpecStr,
                                      status: 'success'
                                    }]);
                                    toast.success(`${product.name} added to list`);
                                  }}
                                  className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-primary hover:bg-white hover:shadow-md transition-all text-left"
                                >
                                  <div>
                                    <p className="text-xs font-mono font-black text-gray-900 group-hover:text-primary transition-colors">{item.slug}</p>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mt-1">Batch: {item.batch || 'N/A'}</p>
                                  </div>
                                  <div className="h-8 w-8 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-primary transition-colors">
                                    <Plus className="h-4 w-4 text-gray-300 group-hover:text-white" />
                                  </div>
                                </button>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
