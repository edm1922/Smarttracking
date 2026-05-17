import React from 'react';
import { Search, History, Plus } from 'lucide-react';

interface UnitTrackingItemSelectorProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredRequests: any[];
  addRequestItem: (req: any) => void;
  selectedItems: any[];
}

export const UnitTrackingItemSelector: React.FC<UnitTrackingItemSelectorProps> = ({
  searchTerm,
  setSearchTerm,
  filteredRequests,
  addRequestItem,
  selectedItems,
}) => {
  return (
    <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl shadow-gray-200/50 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center">
          <History className="mr-2 h-4 w-4 text-primary" />
          Request History
        </h3>
        <span className="text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">
          PICK FROM DATABASE
        </span>
      </div>
      
      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder="SEARCH ASSET ID OR REQUESTER..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value.toUpperCase())}
          className="w-full bg-gray-50 border-2 border-transparent rounded-2xl pl-16 pr-6 py-5 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all placeholder:text-gray-200"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-3 custom-scrollbar">
        {filteredRequests.map(req => {
          const isSelected = selectedItems.find(i => i.requestId === req.id);
          return (
            <button 
              key={req.id} 
              onClick={() => addRequestItem(req)} 
              disabled={!!isSelected}
              className={`flex flex-col p-4 rounded-2xl border transition-all text-left group ${
                isSelected 
                ? 'bg-gray-50 border-gray-100 opacity-50 cursor-default' 
                : 'bg-white border-gray-100 hover:border-primary/20 hover:bg-primary/[0.02] hover:shadow-lg hover:shadow-primary/5'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className={`text-xs font-black transition-colors ${isSelected ? 'text-gray-400' : 'text-gray-900 group-hover:text-primary'}`}>
                  {req.item.slug}
                </div>
                <div className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${isSelected ? 'bg-gray-200 text-gray-400' : 'bg-primary/10 text-primary'}`}>
                  {req.qty} {req.unit}
                </div>
              </div>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                {req.user.username} • {new Date(req.createdAt).toLocaleDateString()}
              </div>
              <div className={`text-[8px] font-black uppercase mt-2 tracking-widest ${
                req.status === 'RELEASED' ? 'text-green-500' : 'text-orange-500'
              }`}>
                {req.status}
              </div>
            </button>
          );
        })}
        {filteredRequests.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">No matching records found</p>
          </div>
        )}
      </div>
    </div>
  );
};
