import React from 'react';
import { Truck, Search, User, ClipboardList, Clock, ArrowUpRight, ChevronRight, Package, Box } from 'lucide-react';

interface UnitReqReleasingTabProps {
  staffInventory: any[];
  staffReleases: any[];
  selectedInventoryItem: any;
  setSelectedInventoryItem: (item: any) => void;
  releaseForm: any;
  setReleaseForm: (form: any) => void;
  handleRelease: () => void;
  isProcessingRelease: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export const UnitReqReleasingTab: React.FC<UnitReqReleasingTabProps> = ({
  staffInventory,
  staffReleases,
  selectedInventoryItem,
  setSelectedInventoryItem,
  releaseForm,
  setReleaseForm,
  handleRelease,
  isProcessingRelease,
  searchTerm,
  setSearchTerm,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Left: Release Form */}
      <div className="lg:col-span-8 space-y-8">
        <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden">
          <div className="bg-gray-900 px-10 py-8 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center">
                <Truck className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-widest">Equipment Issuance</h2>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mt-1.5">Official release tracking & documentation</p>
              </div>
            </div>
          </div>

          <div className="p-10">
            {selectedInventoryItem ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div className="p-8 bg-primary/5 rounded-[2rem] border border-primary/10 relative overflow-hidden group">
                    <Box className="absolute -right-6 -bottom-6 h-32 w-32 text-primary/5 rotate-12 transition-transform group-hover:scale-110" />
                    <div className="relative space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Selected Equipment</span>
                        <button 
                          onClick={() => setSelectedInventoryItem(null)}
                          className="text-[10px] font-black text-primary/60 hover:text-primary uppercase tracking-widest transition-colors"
                        >
                          Change Item
                        </button>
                      </div>
                      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{selectedInventoryItem.productName}</h3>
                      <div className="flex flex-wrap gap-3">
                        <span className="px-3 py-1.5 bg-white rounded-xl text-[10px] font-black text-primary border border-primary/10 shadow-sm">{selectedInventoryItem.specs}</span>
                        <span className="px-3 py-1.5 bg-white rounded-xl text-[10px] font-black text-primary border border-primary/10 shadow-sm">Available: {selectedInventoryItem.qty} {selectedInventoryItem.unit}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Release Date</label>
                      <div className="relative group">
                        <Clock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-focus-within:text-primary transition-colors" />
                        <input
                          type="date"
                          value={releaseForm.date}
                          onChange={e => setReleaseForm({ ...releaseForm, date: e.target.value })}
                          className="w-full bg-gray-50 border-2 border-transparent rounded-2xl pl-14 pr-6 py-4 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all placeholder:text-gray-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantity to Release</label>
                        <input
                          type="number"
                          max={selectedInventoryItem.qty}
                          value={releaseForm.qty}
                          onChange={e => setReleaseForm({ ...releaseForm, qty: Math.min(selectedInventoryItem.qty, parseInt(e.target.value) || 1) })}
                          className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Shift / Group</label>
                        <input
                          type="text"
                          placeholder="SHIFT A, B, ETC..."
                          value={releaseForm.shift}
                          onChange={e => setReleaseForm({ ...releaseForm, shift: e.target.value.toUpperCase() })}
                          className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all placeholder:text-gray-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Department</label>
                      <input
                        type="text"
                        placeholder="ENTER DEPARTMENT..."
                        value={releaseForm.department}
                        onChange={e => setReleaseForm({ ...releaseForm, department: e.target.value.toUpperCase() })}
                        className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all placeholder:text-gray-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Direct Supervisor</label>
                      <input
                        type="text"
                        placeholder="NAME OF SUPERVISOR..."
                        value={releaseForm.supervisor}
                        onChange={e => setReleaseForm({ ...releaseForm, supervisor: e.target.value.toUpperCase() })}
                        className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all placeholder:text-gray-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Issuance Remarks</label>
                      <textarea
                        placeholder="ADDITIONAL NOTES..."
                        value={releaseForm.remarks}
                        onChange={e => setReleaseForm({ ...releaseForm, remarks: e.target.value })}
                        className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-primary transition-all min-h-[120px] resize-none placeholder:text-gray-200"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleRelease}
                    disabled={isProcessingRelease}
                    className="w-full py-5 bg-gray-900 text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-gray-900/30 hover:bg-black hover:-translate-y-1 transition-all active:translate-y-0 disabled:opacity-50"
                  >
                    {isProcessingRelease ? 'Processing Release...' : 'Confirm Official Release'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="h-28 w-28 bg-gray-50 rounded-[3rem] flex items-center justify-center mx-auto border-2 border-dashed border-gray-200">
                  <ArrowUpRight className="h-12 w-12 text-gray-200" />
                </div>
                <div className="max-w-md mx-auto space-y-3">
                  <p className="text-lg font-black text-gray-900 uppercase tracking-tight">Select an item to release</p>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                    Choose from your active inventory list on the right to begin the issuance process for an employee.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Release History */}
        <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden">
          <div className="px-10 py-8 border-b border-gray-50 flex items-center gap-5">
            <div className="h-12 w-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Recent Issuance History</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Logs of equipment released to staff</p>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Date / Time</th>
                  <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Group / Shift</th>
                  <th className="px-10 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Equipment Issued</th>
                  <th className="px-10 py-5 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staffReleases.map((rel, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/30 transition-colors group">
                    <td className="px-10 py-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-900 leading-none mb-1">
                          {new Date(rel.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">
                          {new Date(rel.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-900 uppercase tracking-tight leading-none mb-1">{rel.shift || 'N/A'}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{rel.department || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-primary uppercase tracking-tight leading-none mb-1">{rel.productName}</span>
                        <span className="text-[9px] font-mono font-bold text-gray-400 tracking-tighter uppercase">{rel.itemSlug || rel.specs}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-center">
                      <span className="text-xs font-black text-gray-900">{rel.qty} {rel.unit || 'PCS'}</span>
                    </td>
                  </tr>
                ))}
                {staffReleases.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-20 text-center space-y-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">No release history recorded yet</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right: Active Inventory for Release */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden flex flex-col h-full">
          <div className="p-8 border-b border-gray-50 space-y-6">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center">
              <Package className="mr-3 h-5 w-5 text-primary" />
              Pick From Inventory
            </h3>
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="FILTER INVENTORY..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl pl-16 pr-8 py-5 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all placeholder:text-gray-200"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar max-h-[1000px]">
            <div className="space-y-3">
              {staffInventory
                .filter(p => p.productName.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedInventoryItem(item);
                      setReleaseForm((prev: any) => ({ ...prev, qty: 1 }));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full p-6 flex items-center justify-between rounded-3xl border transition-all duration-300 group ${
                      selectedInventoryItem === item 
                        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5' 
                        : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-colors ${
                        selectedInventoryItem === item ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-gray-50 text-gray-400 group-hover:bg-gray-100'
                      }`}>
                        <Box className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className={`text-xs font-black uppercase tracking-widest transition-colors ${selectedInventoryItem === item ? 'text-primary' : 'text-gray-900'}`}>{item.productName}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter line-clamp-1">{item.specs}</span>
                          <span className="text-[10px] font-black text-primary/60 bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">Qty: {item.qty}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={`h-5 w-5 text-gray-300 transition-all ${selectedInventoryItem === item ? 'translate-x-1 text-primary' : 'group-hover:translate-x-1'}`} />
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
