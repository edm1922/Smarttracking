import React, { useState } from 'react';
import { 
  TrendingUp, TrendingDown, LayoutGrid, FileSpreadsheet, 
  Search, ArrowUpRight, ArrowDownLeft, Info, Activity, X,
  Printer, History, Check
} from 'lucide-react';

interface UnitTrackingInsightsProps {
  productSummary: any[];
  stockHealthRange: { start: string, end: string };
  setStockHealthRange: (range: { start: string, end: string }) => void;
  handleExportPDF: () => void;
  isBuildingTransmittal: boolean;
  setIsBuildingTransmittal: (val: boolean) => void;
  transmittalHeader: any;
  setTransmittalHeader: (val: any) => void;
  enabledSignatories: any;
  setEnabledSignatories: (val: any) => void;
  exportType: 'all' | 'stock-in' | 'stock-out';
  setExportType: (val: 'all' | 'stock-in' | 'stock-out') => void;
  onConfirmExport: () => void;
  onPrintItem: (item: any) => void;
}

export const UnitTrackingInsights: React.FC<UnitTrackingInsightsProps> = ({
  productSummary,
  stockHealthRange,
  setStockHealthRange,
  handleExportPDF,
  isBuildingTransmittal,
  setIsBuildingTransmittal,
  transmittalHeader,
  setTransmittalHeader,
  enabledSignatories,
  setEnabledSignatories,
  exportType,
  setExportType,
  onConfirmExport,
  onPrintItem,
}) => {
  const [selectedMovementItem, setSelectedMovementItem] = useState<any | null>(null);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Configuration & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 bg-white p-10 rounded-[3rem] border border-gray-200 shadow-xl shadow-gray-200/50">
        <div className="flex-1 space-y-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight leading-none mb-1">Stock Health Analytics</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Temporal Movement & Lifecycle Auditing</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 items-end">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">Analysis Start</label>
              <input 
                type="date" 
                value={stockHealthRange.start}
                onChange={e => setStockHealthRange({ ...stockHealthRange, start: e.target.value })}
                className="bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all shadow-sm"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">Analysis End</label>
              <input 
                type="date" 
                value={stockHealthRange.end}
                onChange={e => setStockHealthRange({ ...stockHealthRange, end: e.target.value })}
                className="bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 text-xs font-black text-gray-900 outline-none focus:bg-white focus:border-primary transition-all shadow-sm"
              />
            </div>
            <div className="bg-blue-50 px-6 py-4 rounded-2xl border border-blue-100 flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Active Metrics</span>
                <span className="text-xs font-black text-blue-700 uppercase tracking-tight">Movement Auditing</span>
              </div>
              <div className="h-8 w-[1px] bg-blue-200"></div>
              <span className="text-lg font-black text-blue-900">{(stockHealthRange.start === stockHealthRange.end) ? '24H' : 'LOGGED'}</span>
            </div>
          </div>
        </div>

        <button 
          onClick={handleExportPDF}
          className="px-10 py-5 bg-gray-900 text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-gray-900/20 hover:bg-black hover:-translate-y-1 transition-all flex items-center gap-3 no-print"
        >
          <FileSpreadsheet className="h-5 w-5" />
          PRINT
        </button>
      </div>

      {/* Movement Table */}
      <div className="bg-white rounded-[3rem] border border-gray-200 shadow-2xl shadow-gray-200/50 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-900 border-b border-gray-800">
                <th className="px-10 py-8 text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">Product Reference</th>
                <th className="px-10 py-8 text-[10px] font-black text-white/60 uppercase tracking-[0.3em] text-right">Opening</th>
                <th className="px-10 py-8 text-[10px] font-black text-[#50C878] uppercase tracking-[0.3em] text-right">In (+)</th>
                <th className="px-10 py-8 text-[10px] font-black text-red-400 uppercase tracking-[0.3em] text-right">Out (-)</th>
                <th className="px-10 py-8 text-[10px] font-black text-white/60 uppercase tracking-[0.3em] text-right">Closing</th>
                <th className="px-10 py-8 text-[10px] font-black text-white/60 uppercase tracking-[0.3em] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {productSummary.map((item, idx) => (
                <tr 
                  key={item.name} 
                  className="hover:bg-gray-50/50 transition-all group cursor-pointer"
                  onDoubleClick={() => setSelectedMovementItem(item)}
                  title="Double click to view movement breakdown details"
                >
                  <td className="px-10 py-8">
                    <div className="flex flex-col">
                      <span className="text-base font-black text-gray-900 uppercase tracking-tight group-hover:text-primary transition-colors">{item.name}</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {item.specs && Object.entries(item.specs).slice(0, 3).flatMap(([fieldName, values]) =>
                          Array.from(values as Set<string>).slice(0, 1).map(val => (
                            <span key={`${fieldName}-${val}`} className="text-[8px] font-black text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">
                              {fieldName === '__value__' ? val : `${fieldName}: ${val}`}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <span className="text-sm font-black text-gray-400 tracking-tight">{item.totalInStock + item.outToday - item.inToday}</span>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <div className="inline-flex flex-col items-end">
                      <span className={`text-lg font-black ${item.inToday > 0 ? 'text-[#50C878]' : 'text-gray-300'}`}>
                        {item.inToday > 0 ? `+${item.inToday}` : ''}
                      </span>
                      {Object.keys(item.inBreakdown).length > 0 && (
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mt-1 italic">Distributed Input</span>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <div className="inline-flex flex-col items-end">
                      <span className={`text-lg font-black ${item.outToday > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                        {item.outToday > 0 ? `-${item.outToday}` : ''}
                      </span>
                      {Object.keys(item.movementBreakdown).length > 0 && (
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mt-1 italic">Allocated Output</span>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <div className="inline-flex flex-col items-end">
                      <span className="text-xl font-black text-gray-900 tracking-tight">{item.totalInStock}</span>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{item.unit || 'Units'}</span>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-right no-print">
                    <button 
                      onClick={() => setSelectedMovementItem(item)}
                      className="h-10 w-10 bg-gray-50 text-gray-300 rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm"
                      title="View movement breakdown"
                      aria-label={`View movement details for ${item.name}`}
                    >
                      <TrendingUp className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {productSummary.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-10 py-40 text-center">
                    <div className="max-w-xs mx-auto space-y-6 opacity-30">
                      <div className="h-24 w-24 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200 flex items-center justify-center mx-auto">
                        <Activity className="h-10 w-10 text-gray-300" />
                      </div>
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] italic">No stock movement recorded in selected range</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedMovementItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-10 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-gray-900/20">
                  <Activity className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-1">{selectedMovementItem.name}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Movement Breakdown Details</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { onPrintItem(selectedMovementItem); }}
                  className="h-10 w-10 bg-white border border-gray-200 text-gray-400 rounded-xl flex items-center justify-center hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all shadow-sm"
                  title="Print movement grouped by spec"
                  aria-label="Print movement report grouped by specification"
                >
                  <Printer className="h-5 w-5" />
                </button>
                <button 
                  onClick={() => setSelectedMovementItem(null)}
                  className="h-10 w-10 bg-white border border-gray-200 text-gray-400 rounded-xl flex items-center justify-center hover:bg-gray-100 hover:text-gray-900 transition-all shadow-sm"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-10 overflow-y-auto flex-1 bg-white custom-scrollbar space-y-8">
              {/* Stock In Breakdown */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-[#50C878]/10 text-[#50C878] rounded-xl flex items-center justify-center">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Stock In (+)</h4>
                </div>
                {Object.keys(selectedMovementItem.inBreakdown || {}).length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(selectedMovementItem.inBreakdown as Record<string, { qty: number; date: string; slug?: string }[]>).map(([spec, entries]) => (
                      entries.map((entry, idx) => (
                        <div key={`${spec}-${idx}`} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between group hover:border-gray-200 transition-all">
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-2">
                              {spec.split(', ').map((s: string, i: number) => (
                                <span key={i} className="text-[9px] font-black text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded-md uppercase shadow-sm">{s}</span>
                              ))}
                            </div>
                            <span className="text-[9px] font-bold text-gray-400">
                              {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            {entry.slug && (
                              <span className="text-[8px] font-mono text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded self-start">
                                {entry.slug}
                              </span>
                            )}
                          </div>
                          <span className="text-lg font-black text-[#50C878]">+{entry.qty}</span>
                        </div>
                      ))
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-gray-400 italic bg-gray-50/50 p-4 rounded-2xl text-center border border-dashed border-gray-200">No input recorded</p>
                )}
              </div>

              <div className="h-[1px] w-full bg-gray-100"></div>

              {/* Stock Out Breakdown */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
                    <TrendingDown className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Stock Out (-)</h4>
                </div>
                {Object.keys(selectedMovementItem.movementBreakdown || {}).length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(selectedMovementItem.movementBreakdown as Record<string, { qty: number; date: string; slug?: string }[]>).map(([spec, entries]) => (
                      entries.map((entry, idx) => (
                        <div key={`${spec}-${idx}`} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between group hover:border-gray-200 transition-all">
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-2">
                              {spec.split(', ').map((s: string, i: number) => (
                                <span key={i} className="text-[9px] font-black text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded-md uppercase shadow-sm">{s}</span>
                              ))}
                            </div>
                            <span className="text-[9px] font-bold text-gray-400">
                              {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            {entry.slug && (
                              <span className="text-[8px] font-mono text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded self-start">
                                {entry.slug}
                              </span>
                            )}
                          </div>
                          <span className="text-lg font-black text-red-500">-{entry.qty}</span>
                        </div>
                      ))
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-gray-400 italic bg-gray-50/50 p-4 rounded-2xl text-center border border-dashed border-gray-200">No output recorded</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Transmittal Configuration Modal */}
      {isBuildingTransmittal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] border border-gray-100">
            {/* Modal Header */}
            <div className="p-10 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-5">
                <div className="h-16 w-16 bg-primary text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-primary/30 rotate-3">
                  <FileSpreadsheet className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Transmittal Configuration</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Excel Layout & Signatory Authorization Engine</p>
                </div>
              </div>
              <button 
                onClick={() => setIsBuildingTransmittal(false)}
                className="h-12 w-12 bg-gray-50 border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all shadow-sm group"
              >
                <X className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>
            
            <div className="p-10 overflow-y-auto flex-1 bg-white custom-scrollbar">
              {/* Export Type Toggle */}
              <div className="flex items-center justify-center mb-10">
                <div className="inline-flex bg-gray-100 rounded-2xl p-1.5 gap-1 shadow-inner">
                  {(['all', 'stock-in', 'stock-out'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setExportType(type)}
                      className={`px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                        exportType === type
                          ? 'bg-white text-gray-900 shadow-xl shadow-gray-900/10'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {type === 'all' ? 'All Movement' : type === 'stock-in' ? 'Stock In' : 'Stock Out'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {/* Configuration Form */}
              <div className="md:col-span-1 space-y-8 pr-4 border-r border-gray-50">
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></div>
                    Report Metadata
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Transmittal No.</label>
                      <input 
                          type="text" 
                          value={transmittalHeader.transmittalNo}
                          onChange={e => setTransmittalHeader({...transmittalHeader, transmittalNo: e.target.value})}
                          className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-black text-gray-900 focus:bg-white focus:border-primary transition-all outline-none shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Department</label>
                      <input 
                          type="text" 
                          placeholder="e.g. INVENTORY CONTROL"
                          value={transmittalHeader.department}
                          onChange={e => setTransmittalHeader({...transmittalHeader, department: e.target.value})}
                          className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-black text-gray-900 focus:bg-white focus:border-primary transition-all outline-none shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Recipient / End-User</label>
                      <input 
                          type="text" 
                          placeholder="Name of recipient"
                          value={transmittalHeader.recipient}
                          onChange={e => setTransmittalHeader({...transmittalHeader, recipient: e.target.value})}
                          className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-black text-gray-900 focus:bg-white focus:border-primary transition-all outline-none shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-gray-50 space-y-6">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                    Signatory Authorization
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {['preparedBy', 'checkedBy', 'receivedBy', 'approvedBy'].map(field => (
                      <div key={field} className={`p-5 rounded-[2rem] border-2 transition-all ${
                        (enabledSignatories as any)[field] 
                          ? 'bg-primary/5 border-primary/20 ring-4 ring-primary/5' 
                          : 'bg-gray-50 border-transparent grayscale opacity-60'
                      }`}>
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">{field.endsWith('By') ? field.slice(0, -2) + ' By' : field}</label>
                            <div 
                              onClick={() => setEnabledSignatories({...enabledSignatories, [field]: !(enabledSignatories as any)[field]})}
                              className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-all duration-300 ${
                                (enabledSignatories as any)[field] ? 'bg-primary' : 'bg-gray-300'
                              }`}
                            >
                              <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-300 transform ${
                                (enabledSignatories as any)[field] ? 'translate-x-4' : ''
                              }`} />
                            </div>
                          </div>
                          <input 
                              type="text" 
                              disabled={!(enabledSignatories as any)[field]}
                              placeholder={field === 'checkedBy' ? 'Optional' : 'Name'}
                              value={(transmittalHeader as any)[field]}
                              onChange={e => setTransmittalHeader({...transmittalHeader, [field]: e.target.value})}
                              className={`w-full px-4 py-2 bg-white rounded-xl text-xs font-black outline-none border transition-all ${
                                (enabledSignatories as any)[field] 
                                  ? 'border-primary/20 text-gray-900 focus:ring-4 focus:ring-primary/5' 
                                  : 'border-transparent text-gray-400'
                              }`}
                          />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8 border-t border-gray-50">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Remarks & Footnotes</label>
                  <textarea 
                      placeholder="Additional notes for the report..."
                      value={transmittalHeader.remarks}
                      onChange={e => setTransmittalHeader({...transmittalHeader, remarks: e.target.value})}
                      className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-xs font-bold text-gray-900 focus:bg-white focus:border-primary transition-all outline-none h-24 resize-none shadow-sm"
                  />
                </div>
              </div>

              {/* Items Preview */}
              <div className="md:col-span-2 space-y-8 bg-gray-50/30 rounded-[2.5rem] p-10 border border-gray-100 flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                    Stock Movement Preview
                  </h3>
                  <div className="px-4 py-1.5 bg-white rounded-full border border-gray-100 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    {productSummary.filter(p => exportType === 'stock-in' ? p.inToday > p.outToday : exportType === 'stock-out' ? p.outToday > p.inToday : p.inToday > 0 || p.outToday > 0).length} Product Groups
                  </div>
                </div>

                <div className="flex-1 overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-xl shadow-gray-200/20">
                  <div className="h-full overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Reference</th>
                          <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Start</th>
                          <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Move</th>
                          <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Result</th>
                          <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Breakdown</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {productSummary.filter(p => exportType === 'stock-in' ? p.inToday > p.outToday : exportType === 'stock-out' ? p.outToday > p.inToday : p.inToday > 0 || p.outToday > 0).map((p, idx) => {
                          const sumQty = (entries: { qty: number; date: string }[]) => entries.reduce((s: number, e: { qty: number; date: string }) => s + e.qty, 0);
                          const breakdownParts = exportType === 'stock-in'
                            ? Object.entries(p.inBreakdown || {}).map(([spec, entries]) => `IN ${spec}: +${sumQty(entries as { qty: number; date: string }[])}`)
                            : exportType === 'stock-out'
                            ? Object.entries(p.movementBreakdown || {}).map(([spec, entries]) => `OUT ${spec}: ${sumQty(entries as { qty: number; date: string }[])}`)
                            : [
                                ...Object.entries(p.movementBreakdown || {}).map(([spec, entries]) => `OUT ${spec}: ${sumQty(entries as { qty: number; date: string }[])}`),
                                ...Object.entries(p.inBreakdown || {}).map(([spec, entries]) => `IN ${spec}: +${sumQty(entries as { qty: number; date: string }[])}`),
                              ];
                          const breakdownStr = breakdownParts.join(' | ') || '—';
                          return (
                          <tr key={p.name} className="hover:bg-gray-50/50 transition-all">
                            <td className="px-6 py-4 text-[11px] font-black text-gray-900 uppercase">{p.name}</td>
                            <td className="px-6 py-4 text-[11px] font-bold text-gray-400 text-right">{p.totalInStock + p.outToday - p.inToday}</td>
                            <td className="px-6 py-4 text-[11px] font-black text-right">
                              <span className={p.inToday - p.outToday > 0 ? 'text-[#50C878]' : 'text-red-500'}>
                                {p.inToday - p.outToday > 0 ? `+${p.inToday - p.outToday}` : p.inToday - p.outToday}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-[11px] font-black text-gray-900 text-right">{p.totalInStock}</td>
                            <td className="px-6 py-4 text-[9px] font-bold text-gray-500 text-right max-w-[200px] truncate" title={breakdownStr}>{breakdownStr}</td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="pt-6 flex justify-end gap-4">
                    <button 
                        onClick={() => setIsBuildingTransmittal(false)}
                        className="px-10 py-5 bg-white border border-gray-200 rounded-[1.5rem] text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
                    >
                        Discard
                    </button>
                    <button 
                        onClick={onConfirmExport}
                        className="px-12 py-5 bg-gray-900 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest shadow-2xl shadow-gray-900/30 hover:bg-black hover:-translate-y-1 transition-all flex items-center gap-3"
                    >
                        <Printer className="h-5 w-5" />
                        PRINT
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
