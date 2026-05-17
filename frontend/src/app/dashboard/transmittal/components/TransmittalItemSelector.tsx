import React from 'react';
import { Search, Box, Plus, Calendar, User } from 'lucide-react';
import { Product, TransmittalItem } from '../types';

interface TransmittalItemSelectorProps {
  selectionMode: 'PRODUCT' | 'LOG' | 'RELEASE';
  setSelectionMode: (mode: 'PRODUCT' | 'LOG' | 'RELEASE') => void;
  transmittalType: 'MATERIAL' | 'EMPLOYEE';
  setTransmittalType: (type: 'MATERIAL' | 'EMPLOYEE') => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  logFilter: 'IN' | 'OUT';
  setLogFilter: (filter: 'IN' | 'OUT') => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  filteredProducts: any[];
  filteredLogs: any[];
  pullRequests: any[];
  releases: any[];
  addItem: (product: any) => void;
  addLogItem: (log: any) => void;
  addReleaseItem: (rel: any) => void;
  updateSubject: (mode: 'PRODUCT' | 'LOG' | 'RELEASE', filter: 'IN' | 'OUT', type?: 'MATERIAL' | 'EMPLOYEE') => void;
}

export const TransmittalItemSelector: React.FC<TransmittalItemSelectorProps> = ({
  selectionMode,
  setSelectionMode,
  transmittalType,
  setTransmittalType,
  searchTerm,
  setSearchTerm,
  logFilter,
  setLogFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  filteredProducts,
  filteredLogs,
  pullRequests,
  releases,
  addItem,
  addLogItem,
  addReleaseItem,
  updateSubject,
}) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
          <Box className="mr-2 h-4 w-4" />
          Select Items
        </h3>
        <div className="flex bg-gray-100 p-1 rounded-lg self-start">
          <button 
            onClick={() => { setSelectionMode('PRODUCT'); setTransmittalType('MATERIAL'); updateSubject('PRODUCT', logFilter, 'MATERIAL'); }} 
            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-tight rounded-md transition-all ${selectionMode === 'PRODUCT' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Stocks
          </button>
          <button 
            onClick={() => { setSelectionMode('LOG'); setTransmittalType('MATERIAL'); updateSubject('LOG', logFilter, 'MATERIAL'); }} 
            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-tight rounded-md transition-all ${selectionMode === 'LOG' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Stock History
          </button>
          <button 
            onClick={() => { setSelectionMode('RELEASE'); setTransmittalType('EMPLOYEE'); updateSubject('RELEASE', logFilter, 'EMPLOYEE'); }} 
            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-tight rounded-md transition-all ${selectionMode === 'RELEASE' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Employee Releases
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search items or SKU..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        {selectionMode === 'LOG' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3 text-gray-400" />
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-1.5 text-[10px] outline-none focus:ring-1 bg-white"
              />
            </div>
            <span className="text-gray-400 text-[10px]">to</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-1.5 text-[10px] outline-none focus:ring-1 bg-white"
            />
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-[10px] text-red-500 font-bold hover:underline px-1"
              >
                Clear
              </button>
            )}
            <select 
              value={logFilter} 
              onChange={e => { 
                const val = e.target.value as 'IN' | 'OUT';
                setLogFilter(val);
                updateSubject('LOG', val);
              }} 
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1 bg-white"
            >
              <option value="OUT">Stock OUT</option>
              <option value="IN">Stock IN</option>
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
        {selectionMode === 'PRODUCT' ? (
          filteredProducts.map(product => (
            <button 
              key={product.id} 
              onClick={() => addItem(product)} 
              className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-primary/5 hover:border-primary/20 transition-all text-left group"
            >
              <div>
                <div className="text-xs font-bold text-gray-900 group-hover:text-primary transition-colors">{product.name}</div>
                <div className="text-[10px] font-mono text-gray-500 mt-0.5">{product.sku}</div>
                {product.description && <div className="text-[10px] text-gray-400 italic mt-0.5 line-clamp-1">{product.description}</div>}
              </div>
              <Plus className="h-4 w-4 text-gray-400 group-hover:text-primary group-hover:scale-110 transition-all" />
            </button>
          ))
        ) : selectionMode === 'LOG' ? (
          filteredLogs.map(log => (
            <button 
              key={log.id} 
              onClick={() => addLogItem(log)} 
              className="flex flex-col p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-primary/5 hover:border-primary/20 transition-all text-left group"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <div className="text-xs font-bold text-gray-900 group-hover:text-primary transition-colors">{log.product.name}</div>
                <div className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">{log.quantity}</div>
              </div>
              <div className="text-[10px] text-gray-500 italic line-clamp-1 group-hover:text-gray-700">{log.remarks || 'No remarks'}</div>
            </button>
          ))
        ) : (
          <div className="space-y-6 col-span-full">
            {/* Stock Out Logs with Requester */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 flex items-center">
                <span className="w-8 h-px bg-gray-100 mr-2"></span>
                Stock Out History
                <span className="flex-1 h-px bg-gray-100 ml-2"></span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredLogs.filter(log => log.type === 'OUT').map(log => {
                  let parsedRequester = '';
                  if (log.remarks?.includes('Req by:')) {
                    parsedRequester = log.remarks.split('Req by:')[1]?.trim();
                  } else if (log.remarks?.includes('Legacy Quick Pull:')) {
                    if (log.remarks.includes('| Req by:')) {
                      parsedRequester = log.remarks.split('| Req by:')[1]?.trim();
                    } else {
                      parsedRequester = log.remarks.split('Legacy Quick Pull:')[1]?.split('(')[0]?.trim();
                    }
                  }

                  return (
                    <button 
                      key={`log-${log.id}`} 
                      onClick={() => addLogItem(log)} 
                      className="flex flex-col p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-primary/5 hover:border-primary/20 transition-all text-left group shadow-sm"
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <div className="text-xs font-bold text-gray-900 group-hover:text-primary transition-colors">{log.product?.name}</div>
                        <div className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">{log.quantity}</div>
                      </div>
                      {parsedRequester ? (
                        <div className="text-[10px] text-gray-900 font-bold flex items-center mb-2">
                          <User className="h-3 w-3 mr-1.5 text-primary" />
                          Requested by: {parsedRequester}
                        </div>
                      ) : (
                        <div className="text-[10px] text-gray-500 italic line-clamp-1 mb-2">{log.remarks || 'No remarks'}</div>
                      )}
                      <div className="text-[9px] text-gray-400 uppercase font-black tracking-tight flex items-center justify-between border-t border-gray-100/50 pt-2">
                        <span>{log.location?.name}</span>
                        <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Unit Requests */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 flex items-center">
                <span className="w-8 h-px bg-gray-100 mr-2"></span>
                Unit Requests
                <span className="flex-1 h-px bg-gray-100 ml-2"></span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pullRequests.filter(req => 
                  (req.item?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (req.user?.username || '').toLowerCase().includes(searchTerm.toLowerCase())
                ).map(req => (
                  <button 
                    key={`pr-${req.id}`} 
                    onClick={() => addReleaseItem({ ...req, employeeName: req.user?.username, productName: req.item?.name, qty: req.qty, date: req.createdAt })} 
                    className="flex flex-col p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-primary/5 hover:border-primary/20 transition-all text-left group shadow-sm"
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="text-xs font-bold text-gray-900 group-hover:text-primary transition-colors">{req.item?.name}</div>
                      <div className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">{req.qty} {req.unit}</div>
                    </div>
                    <div className="text-[10px] text-gray-900 font-bold flex items-center mb-2">
                      <User className="h-3 w-3 mr-1.5 text-primary" />
                      Requested by: {req.user?.username}
                    </div>
                    <div className="text-[9px] text-gray-400 uppercase font-black tracking-tight flex items-center justify-between border-t border-gray-100/50 pt-2">
                      <span className={req.status === 'APPROVED' ? 'text-green-600' : 'text-orange-600'}>{req.status}</span>
                      <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Staff Releases */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 flex items-center">
                <span className="w-8 h-px bg-gray-100 mr-2"></span>
                Staff Issuance History
                <span className="flex-1 h-px bg-gray-100 ml-2"></span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {releases.filter(rel => 
                  rel.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  rel.productName.toLowerCase().includes(searchTerm.toLowerCase())
                ).map(rel => (
                  <button 
                    key={`rel-${rel.id}`} 
                    onClick={() => addReleaseItem(rel)} 
                    className="flex flex-col p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-primary/5 hover:border-primary/20 transition-all text-left group shadow-sm"
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="text-xs font-bold text-gray-900 group-hover:text-primary transition-colors">{rel.productName}</div>
                      <div className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">{rel.qty}</div>
                    </div>
                    <div className="text-[10px] text-gray-900 font-bold flex items-center mb-2">
                      <User className="h-3 w-3 mr-1.5 text-primary" />
                      Issued to: {rel.employeeName}
                    </div>
                    <div className="text-[9px] text-gray-400 uppercase font-black tracking-tight flex items-center justify-between border-t border-gray-100/50 pt-2">
                      <span>{rel.department}</span>
                      <span>{new Date(rel.date).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
