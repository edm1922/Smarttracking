'use client';

import { useState, useEffect } from 'react';

import { 
  Plus, 
  Search, 
  Printer, 
  Layers, 
  History, 
  X, 
  Trash2, 
  Calendar, 
  DollarSign, 
  Info,
  ChevronDown,
  Check,
  ChevronRight,
  ChevronLeft,
  Filter,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { exportRSQToExcel, exportTransactionToExcel } from './utils/excelExport';

// Parse Remarks formatted: "RSQ: RSQ-00588 | Month: MAY 2026 | Remarks: Custom text"
const parseRemarks = (remarksString: string) => {
  if (!remarksString) return { rsqNo: '', month: '', remarks: '' };
  const rsqMatch = remarksString.match(/RSQ:\s*([^\s|]+)/);
  const monthMatch = remarksString.match(/Month:\s*([^|]+)/);
  const remarksMatch = remarksString.match(/Remarks:\s*(.*)/);

  return {
    rsqNo: rsqMatch ? rsqMatch[1] : '',
    month: monthMatch ? monthMatch[1].trim() : '',
    remarks: remarksMatch ? remarksMatch[1].trim() : (remarksString.includes('|') ? '' : remarksString)
  };
};

const normalizeFabricName = (name: string) => {
  if (!name) return '';
  let n = name.trim().toUpperCase();
  n = n.replace('APHAGINA', 'ALPHAGINA');
  n = n.replace('ALPAGINA', 'ALPHAGINA');
  n = n.replace('LAVANDER', 'LAVENDER');
  n = n.replace('SKYBLUE', 'SKY BLUE');
  return n;
};

const APPAREL_MAP: Record<string, string> = {
  "HOODCAP- YELLOW (KATRINA)": "KATRINA - YELLOW",
  "PANTS (LARGE) - KATRINA": "KATRINA - NAVY BLUE",
  "TRAPAL- TRANSPARENT": "TRAPAL- TRANSPARENT",
  "HOODCAP YELLOW WITH GREEN BAND (KATRINA)": "KATRINA - YELLOW",
  "HOODCAP YELLOW WITH ORANGE BAND (KATRINA)": "KATRINA - YELLOW",
  "HOODCAP- YELLOW W/ BLUE BAND (KATRINA)": "KATRINA - YELLOW",
  "HAIRNET WHITE (SOFTULE)": "SOFT TULE - WHITE",
  "PANTS MEDIUM- NAVY BLUE (KATRINA)": "KATRINA - NAVY BLUE",
  "PANTS LARGE- NAVY BLUE (KATRINA)": "KATRINA - NAVY BLUE",
  "SMOCKGOWN- YELLOW (ALPAGINA)": "ALPHAGINA - YELLOW",
  "SMOCK GOWN- PINK (ALPHAGINA)": "ALPHAGINA - PINK",
  "HOODCAP- PINK (KATRINA)": "KATRINA - PINK",
  "BULLCAP- ORANGE (KATRINA)": "KATRINA - ORANGE",
  "BULLCAP- RED (KATRINA)": "KATRINA - RED",
  "SMOCK GOWN - PINK (ALPHAGINA)": "ALPHAGINA - PINK",
  "MASK- WHITE (KATRINA)": "KATRINA - WHITE",
  "HOOD CAP - ORANGE (KATRINA)": "KATRINA - ORANGE",
  "SMOCK GOWN- ORANGE (ALPHAGINA)": "ALPHAGINA - ORANGE",
  "PANTS LARGE - NAVY BLUE KATRINA": "KATRINA - NAVY BLUE",
  "PANTS (MEDIUM) - KATRINA": "KATRINA - NAVY BLUE",
  "PANTS SMALL- NAVY BLUE (KATRINA)": "KATRINA - NAVY BLUE",
  "SMOCK GOWN - LAVANDER (ALPHAGINA)": "ALPHAGINA - LAVENDER",
  "HOOD CAP - LAVANDER (KATRINA)": "KATRINA - LAVANDER",
  "BULLCAP - YELLOW (KATRINA)": "KATRINA - YELLOW",
  "BULLCAP- NAVY BLUE (KATRINA)": "KATRINA - NAVY BLUE",
  "BULLCAP- VIOLET (KATRINA)": "KATRINA - VIOLET",
  "HOODCAP- ORANGE W/YELLOW BAND (KATRINA)": "KATRINA - ORANGE",
  "SMOCK GOWN - BROWN (ALPHAGINA)": "ALPHAGINA - BROWN",
  "HOOD CAP - BROWN (KATRINA)": "KATRINA - BROWN",
  "APRON- SKY BLUE (KATRINA)": "KATRINA - SKY BLUE",
  "BULLCAP- MAROON (KATRINA)": "KATRINA - MAROON",
  "BULLCAP- APPLE GREEN (KATRINA)": "KATRINA - APPLE GREEN",
};

const parseTransactionRow = (trn: any) => {
  const parts = trn.transactionNo?.split('_') || [trn.transactionNo || ''];
  let batchNo = parts[0] || '—';
  let seriesNo = parts[1] || '—';

  // Parse remarks
  const remarksString = trn.remarks || '';
  const rsqMatch = remarksString.match(/RSQ:\s*([^\s|]+)/);
  const monthMatch = remarksString.match(/Month:\s*([^|]+)/);
  const apparelMatch = remarksString.match(/Apparel:\s*([^|]+)/);
  const remarksMatch = remarksString.match(/Remarks:\s*(.*)/);

  // If this is an initial balance record, display clean labels
  if (trn.type === 'INITIAL_BALANCE' || trn.type === 'BEGINNING' || batchNo.startsWith('INIT')) {
    batchNo = 'BEGINNING';
    seriesNo = '—';
  }

  // Fallback Month Calculation
  let month = '—';
  if (monthMatch) {
    month = monthMatch[1].trim();
  } else if (trn.date) {
    const d = new Date(trn.date);
    const monthsList = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];
    month = `${monthsList[d.getMonth()]} ${d.getFullYear()}`;
  }

  return {
    id: trn.id,
    batchNo,
    seriesNo,
    rsqNo: rsqMatch ? rsqMatch[1] : '—',
    applicableMonth: month,
    remarks: remarksMatch ? remarksMatch[1].trim() : (remarksString.includes('|') ? '' : remarksString),
    apparel: apparelMatch && apparelMatch[1].trim() !== '—' ? apparelMatch[1].trim() : (trn.fabric?.name || '—'),
    fabricName: trn.fabric?.name || '—',
    apparelGroup: trn.fabric?.type || '—',
    type: trn.type === 'INITIAL_BALANCE' ? 'BEGINNING' : trn.type,
    date: trn.date,
    quantity: trn.quantity,
    unit: trn.unit || trn.fabric?.unit || 'pcs',
    price: trn.fabric?.unitPrice || 0,
    amount: trn.quantity * (trn.fabric?.unitPrice || 0),
    rawRemarks: remarksString,
    fabric: trn.fabric,
  };
};

export default function RSQPage() {

  const [fabrics, setFabrics] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tailors, setTailors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal control
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
    fetchTailors();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch fabrics (needed for both inventory calculations and auto-completions)
      const fabRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rsq/fabrics`);
      const fabData = await fabRes.json();
      setFabrics(fabData);

      // Fetch active job requests (needed for checking matching printouts)
      const reqRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rsq/requests`);
      const reqData = await reqRes.json();
      setRequests(reqData);

      // Fetch transactions
      const txRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rsq/transactions`);
      const txData = await txRes.json();
      setTransactions(txData);
    } catch (error) {
      console.error('Error fetching RSQ data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTailors = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rsq/tailors`);
      const data = await res.json();
      setTailors(data);
    } catch (e) {
      console.error('Error fetching tailors:', e);
    }
  };

  const handlePrintRSQ = async (rsqNo: string) => {
    // Find the matching Tailoring Request in active state
    const matchedReq = requests.find(r => r.rsqNo === rsqNo);
    if (matchedReq) {
      try {
        await exportRSQToExcel(matchedReq);
      } catch (error) {
        console.error('Error exporting RSQ to Excel:', error);
        alert('Failed to export RSQ to Excel.');
      }
    } else {
      alert(`Could not find a tailoring request record for ${rsqNo} to print.`);
    }
  };

  const handlePrintTrn = async (trn: any) => {
    try {
      await exportTransactionToExcel(trn);
    } catch (error) {
      console.error('Error exporting Transaction to Excel:', error);
      alert('Failed to export Transaction to Excel.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="no-print space-y-6">
        
        {/* Modern Glassmorphic Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Fabric &amp; RSQ</h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Raw Material Movements &amp; Transactions</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => setIsBatchModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Transaction Batch
            </button>
          </div>
        </div>

        {/* Main Content Pane */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 min-h-[600px] overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[600px] gap-4">
              <div className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Loading Live Sheet Data...</p>
            </div>
          ) : (
            <div className="p-8">
              <TransactionSheetList 
                data={transactions} 
                requests={requests}
                fabrics={fabrics}
                onPrintRSQ={handlePrintRSQ}
                onPrintTrn={handlePrintTrn} 
                onRefresh={fetchData}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {isBatchModalOpen && (
        <BatchTransactionModal 
          onClose={() => setIsBatchModalOpen(false)} 
          fabrics={fabrics} 
          tailors={tailors}
          onSuccess={() => { setIsBatchModalOpen(false); fetchData(); }} 
        />
      )}
    </div>
  );
}

// 1. Unified Transactions Sheet List (Excel Layout)
function TransactionSheetList({ 
  data, 
  requests, 
  fabrics,
  onPrintRSQ, 
  onPrintTrn,
  onRefresh
}: { 
  data: any[], 
  requests: any[], 
  fabrics: any[],
  onPrintRSQ: (rsqNo: string) => void, 
  onPrintTrn: (trn: any) => void,
  onRefresh?: () => void
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  // Checklist Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Double Click / Edit Transaction Modal State
  const [editTransaction, setEditTransaction] = useState<any | null>(null);

  // Process rows
  const parsedRows = data.map(parseTransactionRow);

  // Available filters
  const uniqueMonths = Array.from(new Set(parsedRows.map((r: any) => r.applicableMonth).filter(Boolean)));

  const filtered = parsedRows.filter((row: any) => {
    const matchesSearch = 
      row.batchNo.toLowerCase().includes(search.toLowerCase()) ||
      row.rsqNo.toLowerCase().includes(search.toLowerCase()) ||
      row.apparel.toLowerCase().includes(search.toLowerCase()) ||
      row.remarks.toLowerCase().includes(search.toLowerCase());

    const matchesType = !typeFilter || row.type === typeFilter;
    const matchesMonth = !monthFilter || row.applicableMonth === monthFilter;

    return matchesSearch && matchesType && matchesMonth;
  });

  // Toggle selection for all filtered rows
  const isAllSelected = filtered.length > 0 && filtered.every(row => selectedIds.includes(row.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const filteredIds = filtered.map(row => row.id);
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      const filteredIds = filtered.map(row => row.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleToggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row double click / hover triggers
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Perform bulk delete
  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rsq/transactions/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: selectedIds }),
      });
      
      if (res.ok) {
        setSelectedIds([]);
        setIsConfirmDeleteOpen(false);
        if (onRefresh) {
          onRefresh();
        }
      } else {
        alert('Failed to delete transactions. Please try again.');
      }
    } catch (err) {
      console.error('Error during deletion:', err);
      alert('An error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtering and Search Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch justify-between">
        <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-2xl border border-gray-200/50 flex-1 max-w-md shadow-inner">
          <Search className="h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search batch #, RSQ #, or apparel name..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-xs font-bold text-gray-600 placeholder:text-gray-300 w-full focus:ring-0"
          />
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {/* Type Filter */}
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200/50">
            <Filter className="h-3 w-3 text-gray-400" />
            <select 
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-bold text-gray-600 focus:ring-0 py-0.5 cursor-pointer"
            >
              <option value="">All Movement Types</option>
              <option value="WITHDRAWAL">WITHDRAWAL</option>
              <option value="STOCK_IN">STOCK IN</option>
              <option value="RETURN">RETURN</option>
              <option value="BEGINNING">BEGINNING</option>
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200/50">
            <Calendar className="h-3 w-3 text-gray-400" />
            <select 
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-bold text-gray-600 focus:ring-0 py-0.5 cursor-pointer"
            >
              <option value="">All Applicable Months</option>
              {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Spreadsheet grid layout */}
      <div className="overflow-x-auto rounded-3xl border border-gray-200 shadow-sm max-h-[600px] overflow-y-auto custom-scrollbar relative">
        <table className="w-full text-[11px] font-sans border-collapse relative">
          <thead className="sticky top-0 z-20 bg-gray-50 shadow-sm text-center">
            <tr className="border-b border-gray-200 text-gray-400 uppercase tracking-widest text-[9px] font-black">
              <th className="px-3 py-3 border-r border-gray-200 text-center w-10 sticky left-0 bg-gray-50 z-30">
                <input 
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer transition-all"
                />
              </th>
              <th className="px-3 py-3 border-r border-gray-200 text-left">Transaction #</th>
              <th className="px-3 py-3 border-r border-gray-200">Series #</th>
              <th className="px-3 py-3 border-r border-gray-200">RSQ #</th>
              <th className="px-3 py-3 border-r border-gray-200 text-left w-48">Apparel (Fabric)</th>
              <th className="px-3 py-3 border-r border-gray-200">Group</th>
              <th className="px-3 py-3 border-r border-gray-200">Type</th>
              <th className="px-3 py-3 border-r border-gray-200">Month</th>
              <th className="px-3 py-3 border-r border-gray-200">Date</th>
              <th className="px-3 py-3 border-r border-gray-200">Qty</th>
              <th className="px-3 py-3 border-r border-gray-200">Unit</th>
              <th className="px-3 py-3 border-r border-gray-200">Price</th>
              <th className="px-3 py-3 border-r border-gray-200">Amount</th>
              <th className="px-3 py-3 border-r border-gray-200 text-left w-44">Remarks</th>
              <th className="px-3 py-3 text-center">Print</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={15} className="text-center py-12 text-gray-400 font-bold uppercase tracking-wider text-xs">
                  No matching transaction rows found.
                </td>
              </tr>
            ) : (
              filtered.map((row: any) => {
                const isWithdrawal = row.type === 'WITHDRAWAL';
                const isReturn = row.type === 'RETURN';
                const hasMatchingSlip = (isWithdrawal || isReturn) && row.rsqNo && row.rsqNo !== '—' && requests.some(r => r.rsqNo === row.rsqNo);
                const isRowSelected = selectedIds.includes(row.id);

                return (
                  <tr 
                    key={row.id} 
                    onDoubleClick={() => setEditTransaction(row)}
                    className={`hover:bg-primary/5 transition-colors font-semibold text-gray-700 cursor-pointer select-none ${isRowSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                    title="Double-click row to edit transaction"
                  >
                    <td 
                      className={`px-3 py-2.5 border-r border-gray-100 text-center sticky left-0 z-10 transition-all ${isRowSelected ? 'bg-blue-50/50' : 'bg-white'}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input 
                        type="checkbox"
                        checked={isRowSelected}
                        onChange={(e) => handleToggleSelectRow(row.id, e as any)}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer transition-all"
                      />
                    </td>
                    <td className="px-3 py-2.5 border-r border-gray-100 font-black text-gray-900">{row.batchNo}</td>
                    <td className="px-3 py-2.5 border-r border-gray-100 text-center font-mono font-bold text-gray-500">{row.seriesNo}</td>
                    <td className="px-3 py-2.5 border-r border-gray-100 text-center font-mono font-black text-primary">{row.rsqNo || '—'}</td>
                    <td className="px-3 py-2.5 border-r border-gray-100 text-left font-black uppercase text-gray-800 leading-tight">
                      {row.apparel}
                      {row.fabricName !== '—' && row.fabricName !== row.apparel && (
                        <div className="text-[9px] text-gray-400 font-bold mt-0.5">{row.fabricName}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 border-r border-gray-100 text-center uppercase text-[10px] text-gray-500">{row.apparelGroup}</td>
                    <td className="px-3 py-2.5 border-r border-gray-100 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${
                        row.type === 'WITHDRAWAL' ? 'bg-red-50 text-red-600 border border-red-100' :
                        row.type === 'RETURN' ? 'bg-green-50 text-green-600 border border-green-100' :
                        row.type === 'STOCK_IN' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        {row.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 border-r border-gray-100 text-center uppercase font-bold text-[10px] text-gray-500">{row.applicableMonth || '—'}</td>
                    <td className="px-3 py-2.5 border-r border-gray-100 text-center font-bold text-gray-500">{new Date(row.date).toLocaleDateString()}</td>
                    <td className="px-3 py-2.5 border-r border-gray-100 text-center font-black text-gray-900">{row.quantity}</td>
                    <td className="px-3 py-2.5 border-r border-gray-100 text-center uppercase text-gray-400 text-[10px]">{row.unit}</td>
                    <td className="px-3 py-2.5 border-r border-gray-100 text-center font-bold text-gray-500">₱{row.price.toLocaleString()}</td>
                    <td className="px-3 py-2.5 border-r border-gray-100 text-center font-black text-gray-900">₱{row.amount.toLocaleString()}</td>
                    <td className="px-3 py-2.5 border-r border-gray-100 text-left line-clamp-1 italic text-gray-400 text-[10px] leading-tight py-3" title={row.remarks}>
                      {row.remarks || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => {
                          if (hasMatchingSlip) {
                            onPrintRSQ(row.rsqNo);
                          } else {
                            onPrintTrn({
                              id: row.id,
                              transactionNo: row.batchNo === 'BEGINNING' ? 'BEGINNING' : `${row.batchNo}_${row.seriesNo}`,
                              date: row.date,
                              type: row.type,
                              quantity: row.quantity,
                              unit: row.unit,
                              remarks: row.rawRemarks,
                              fabric: row.fabric,
                              createdAt: row.date
                            });
                          }
                        }} 
                        className="p-1 text-gray-400 hover:text-primary transition-all hover:bg-primary/5 rounded-lg active:scale-95 group relative flex items-center justify-center mx-auto"
                        title={hasMatchingSlip ? "Print 4-Copy RSQ Slips" : "Print Material Transmittal Report"}
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Floating Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-white/90 backdrop-blur-md px-6 py-4 rounded-3xl border border-gray-200/80 shadow-2xl flex items-center gap-6 transition-all animate-bounce-subtle">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Selection Active</span>
            <span className="text-xs font-black text-gray-950 mt-1">{selectedIds.length} Transaction{selectedIds.length > 1 ? 's' : ''} Selected</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSelectedIds([])}
              className="px-4 py-2 border border-gray-200 text-gray-500 rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-gray-100 hover:text-gray-950 active:scale-95 transition-all"
            >
              Clear Selection
            </button>
            <button 
              onClick={() => setIsConfirmDeleteOpen(true)}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-red-200 flex items-center gap-2 active:scale-95 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl w-full max-w-md p-6 space-y-6 hover:scale-[1.01] transition-all">
            <div className="flex items-center gap-4 text-red-600">
              <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Confirm Bulk Deletion</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Destructive Ledger Action</p>
              </div>
            </div>

            <p className="text-xs font-bold text-gray-500 leading-relaxed uppercase">
              Are you absolutely sure you want to delete <span className="text-gray-950 font-black">{selectedIds.length} selected transaction logs</span>? This action is permanent and cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button 
                onClick={() => setIsConfirmDeleteOpen(false)}
                disabled={isDeleting}
                className="px-5 py-2.5 border border-gray-200 text-gray-500 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-red-200 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {isDeleting ? (
                  <div className="h-3.5 w-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editTransaction && (
        <EditTransactionModal
          row={editTransaction}
          fabrics={fabrics}
          onClose={() => setEditTransaction(null)}
          onSuccess={() => { setEditTransaction(null); if (onRefresh) onRefresh(); }}
        />
      )}
    </div>
  );
}

// 2.5. Edit Transaction Modal (Double-click to correct info in print)
function EditTransactionModal({ row, fabrics, onClose, onSuccess }: {
  row: any;
  fabrics: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);

  // Parse encoded remarks into separate fields
  const remarksString = row.rawRemarks || '';
  const rsqMatch = remarksString.match(/RSQ:\s*([^|]+)/);
  const monthMatch = remarksString.match(/Month:\s*([^|]+)/);
  const apparelMatch = remarksString.match(/Apparel:\s*([^|]+)/);
  const remarksMatch = remarksString.match(/Remarks:\s*(.*)/);

  const [fabricId, setFabricId] = useState(row.fabric?.id || '');
  const [type, setType] = useState(row.type === 'BEGINNING' ? 'INITIAL_BALANCE' : row.type);
  const [quantity, setQuantity] = useState(row.quantity);
  const [date, setDate] = useState(row.date ? new Date(row.date).toISOString().split('T')[0] : '');
  const [rsqNo, setRsqNo] = useState(rsqMatch ? rsqMatch[1].trim() : '');
  const [applicableMonth, setApplicableMonth] = useState(monthMatch ? monthMatch[1].trim() : (row.applicableMonth !== '—' ? row.applicableMonth : ''));
  const [apparelName, setApparelName] = useState(apparelMatch ? apparelMatch[1].trim() : (row.apparel !== '—' && row.apparel !== row.fabricName ? row.apparel : ''));
  const [customRemarks, setCustomRemarks] = useState(remarksMatch ? remarksMatch[1].trim() : (row.remarks && row.remarks !== '—' ? row.remarks : ''));

  const selectedFabric = fabrics.find((f: any) => f.id === fabricId);

  const handleSave = async () => {
    if (!fabricId) return alert('Please select a fabric.');
    setLoading(true);
    try {
      // Re-encode remarks with separate fields
      const encodedRemarks = `RSQ: ${rsqNo || '—'} | Month: ${applicableMonth || '—'} | Apparel: ${apparelName || '—'} | Remarks: ${customRemarks || ''}`;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rsq/transactions/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fabricId,
          type,
          quantity: parseFloat(quantity) || 0,
          unit: selectedFabric?.unit || row.unit || 'Roll',
          remarks: encodedRemarks,
          date,
        }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const err = await res.json();
        alert(`Failed to update: ${err.message || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Network error while updating transaction.');
    } finally {
      setLoading(false);
    }
  };

  const monthsList = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];
  const currentYear = new Date().getFullYear();
  const monthDropdownOptions = monthsList.map(m => `${m} ${currentYear}`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl w-full max-w-lg overflow-hidden hover:scale-[1.002] transition-all">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Edit Transaction</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
              {row.batchNo === 'BEGINNING' ? 'BEGINNING' : `${row.batchNo}_${row.seriesNo}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-900 transition-all active:scale-95">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {/* Fabric */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Fabric</label>
            <select
              value={fabricId}
              onChange={e => setFabricId(e.target.value)}
              className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-xs font-bold bg-white focus:ring-primary focus:border-primary shadow-sm"
            >
              <option value="">-- Select Fabric --</option>
              {fabrics.map((f: any) => (
                <option key={f.id} value={f.id}>{f.name} ({f.type})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Movement Type */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Movement Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-xs font-bold bg-white focus:ring-primary focus:border-primary shadow-sm"
              >
                <option value="WITHDRAWAL">WITHDRAWAL</option>
                <option value="STOCK_IN">STOCK IN</option>
                <option value="RETURN">RETURN</option>
                <option value="INITIAL_BALANCE">BEGINNING</option>
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Quantity ({selectedFabric?.unit || row.unit || 'Roll'})</label>
              <input
                type="number"
                required
                min="0"
                step="0.1"
                value={quantity}
                onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-xs font-bold bg-white focus:ring-primary focus:border-primary shadow-sm"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-xs font-bold bg-white focus:ring-primary focus:border-primary shadow-sm"
            />
          </div>

          {/* RSQ # & Applicable Month */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">RSQ #</label>
              <input
                type="text"
                value={rsqNo}
                onChange={e => setRsqNo(e.target.value)}
                placeholder="e.g. RSQ-00588"
                className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-xs font-bold bg-white focus:ring-primary focus:border-primary shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Applicable Month</label>
              <select
                value={applicableMonth}
                onChange={e => setApplicableMonth(e.target.value)}
                className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-xs font-bold bg-white focus:ring-primary focus:border-primary shadow-sm"
              >
                <option value="">-- Month --</option>
                {monthDropdownOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>

          {/* Apparel Name */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Apparel Name</label>
            <input
              type="text"
              value={apparelName}
              onChange={e => setApparelName(e.target.value)}
              placeholder="e.g. APRON, BULLCAP"
              className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-xs font-bold bg-white focus:ring-primary focus:border-primary shadow-sm"
            />
          </div>

          {/* Custom Remarks */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Remarks / Notes</label>
            <textarea
              value={customRemarks}
              onChange={e => setCustomRemarks(e.target.value)}
              rows={2}
              className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-xs font-bold bg-white focus:ring-primary focus:border-primary shadow-sm resize-none"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/30">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
          >
            {loading ? (
              <div className="h-3.5 w-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : null}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// 3. Batch Transaction Form Modal (Supercharged Excel Multi-line Form)
interface FormItemRow {
  fabricId: string;
  type: string; // WITHDRAWAL, RETURN, STOCK_IN, BEGINNING
  quantity: number;
  price: number;
  remarks: string;
  tailorId: string;
  apparelName: string;
  rsqNo?: string;
  seriesNo?: string;
}

function BatchTransactionModal({ onClose, fabrics, tailors: initialTailors, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [transactionNo, setTransactionNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [applicableMonth, setApplicableMonth] = useState('');
  const [tailorsList, setTailorsList] = useState<any[]>(initialTailors || []);

  const [sequenceData, setSequenceData] = useState<any>(null);
  
  // Grid row states
  const [rows, setRows] = useState<FormItemRow[]>([
    { fabricId: '', type: 'WITHDRAWAL', quantity: 1, price: 0, remarks: '', tailorId: initialTailors[0]?.id || '', apparelName: '' }
  ]);

  // Set default applicable month (e.g. "MAY 2026")
  useEffect(() => {
    const today = new Date();
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    setApplicableMonth(`${months[today.getMonth()]} ${today.getFullYear()}`);
  }, []);

  // Fetch sequence numbers on load
  useEffect(() => {
    const fetchSeq = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rsq/next-sequence`);
        const data = await res.json();
        setSequenceData(data);
        setTransactionNo(data.nextTransactionNo);
      } catch (err) {
        console.error('Failed to fetch sequences', err);
      }
    };
    fetchSeq();
  }, []);

  // Auto-calculate rows' Series # and RSQ # whenever rows, date, or sequenceData changes
  const computedRows = rows.map((row, idx) => {
    if (!sequenceData) return { ...row, seriesNo: '', rsqNo: '' };

    // 1. Calculate Series No
    // Date formats: e.g. "2026-05-17"
    const [y, m, d] = date.split('-').map(Number);
    
    // We count sequence of rows entered today.
    // If today matches current date, startSeq is today's start count. Otherwise, default start count to 1.
    const todayStr = new Date().toISOString().split('T')[0];
    let startSeq = 1;
    if (date === todayStr) {
      const todaySeqStr = sequenceData.todaySeriesSequence.split('.');
      startSeq = parseInt(todaySeqStr[todaySeqStr.length - 1]) || 1;
    }
    const computedSeries = `${m}.${d}.${startSeq + idx}`;

    // 2. Calculate RSQ No
    let computedRsq = '';
    if (row.type === 'WITHDRAWAL' || row.type === 'RETURN') {
      const lastRsqStr = sequenceData.nextRsqNo.replace('RSQ-', '');
      const lastRsqNo = parseInt(lastRsqStr) || 589;
      
      // Count how many withdrawals/returns occurred before this row index
      const priorCount = rows.slice(0, idx).filter(r => r.type === 'WITHDRAWAL' || r.type === 'RETURN').length;
      computedRsq = `RSQ-${String(lastRsqNo + priorCount).padStart(5, '0')}`;
    }

    return {
      ...row,
      seriesNo: computedSeries,
      rsqNo: computedRsq
    };
  });

  const handleAddRow = () => {
    setRows([
      ...rows,
      { fabricId: '', type: 'WITHDRAWAL', quantity: 1, price: 0, remarks: '', tailorId: tailorsList[0]?.id || '', apparelName: '' }
    ]);
  };

  const handleRemoveRow = (idx: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== idx));
  };

  const handleUpdateRow = (idx: number, fields: Partial<FormItemRow>) => {
    const updated = rows.map((row, i) => {
      if (i !== idx) return row;
      const newRow = { ...row, ...fields };

      // If fabricId changed, auto-populate price from fabric price
      if (fields.fabricId) {
        const fab = fabrics.find((f: any) => f.id === fields.fabricId);
        newRow.price = fab ? fab.unitPrice : 0;
      }

      // If type changed to STOCK_IN or BEGINNING, clear tailorId
      if (fields.type && (fields.type === 'STOCK_IN' || fields.type === 'BEGINNING')) {
        newRow.tailorId = '';
      } else if (fields.type && !newRow.tailorId) {
        newRow.tailorId = tailorsList[0]?.id || '';
      }

      return newRow;
    });
    setRows(updated);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!transactionNo) return alert('Transaction number is required');

    // Validation
    const invalidRow = computedRows.find(r => !r.fabricId);
    if (invalidRow) {
      return alert('Please select a fabric/apparel for all rows.');
    }

    setLoading(true);
    try {
      const itemsToSubmit = computedRows.map(row => ({
        transactionNo,
        seriesNo: row.seriesNo,
        rsqNo: row.rsqNo || undefined,
        fabricId: row.fabricId,
        type: row.type,
        quantity: parseFloat(row.quantity as any) || 0,
        remarks: row.remarks,
        applicableMonth,
        date,
        tailorId: row.tailorId || undefined,
        apparelName: row.apparelName || undefined
      }));

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rsq/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToSubmit })
      });

      if (res.ok) {
        onSuccess();
      } else {
        const err = await res.json();
        alert(`Failed to save: ${err.message || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Network error while saving batch.');
    } finally {
      setLoading(false);
    }
  };

  // Summaries
  const totalQty = rows.reduce((acc, r) => acc + (parseFloat(r.quantity as any) || 0), 0);
  const totalAmount = computedRows.reduce((acc, r) => acc + ((parseFloat(r.quantity as any) || 0) * (r.price || 0)), 0);

  const monthsList = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  const currentYear = new Date().getFullYear();
  const monthDropdownOptions = monthsList.map(m => `${m} ${currentYear}`);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-7xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-black uppercase tracking-widest text-gray-900">Add Transaction Batch Entry</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Logs a batch of fabric movements simultaneously</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Top global inputs row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gray-50 border-b border-gray-200/50 shrink-0">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Transaction # (Batch Code)</label>
              <input 
                type="text" 
                required 
                value={transactionNo} 
                onChange={e => setTransactionNo(e.target.value)} 
                className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-xs font-black bg-white focus:ring-primary focus:border-primary shadow-sm" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Applicable Month</label>
              <select 
                required 
                value={applicableMonth} 
                onChange={e => setApplicableMonth(e.target.value)} 
                className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-xs font-bold bg-white focus:ring-primary focus:border-primary shadow-sm cursor-pointer"
              >
                <option value="">-- Choose Applicable Month --</option>
                {monthDropdownOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Batch Date</label>
              <input 
                type="date" 
                required 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-xs font-bold bg-white focus:ring-primary focus:border-primary shadow-sm" 
              />
            </div>
          </div>

          {/* Grid spreadsheet-style rows editor */}
          <div className="flex-1 overflow-auto p-6 custom-scrollbar min-h-0">
            <table className="w-full border-collapse text-left text-[11px] font-semibold text-gray-700">
              <thead>
                <tr className="bg-gray-100/50 text-[9px] font-black uppercase text-gray-400 tracking-wider border-b border-gray-200">
                  <th className="py-2.5 px-2 text-center w-16">Series #</th>
                  <th className="py-2.5 px-2 text-center w-20">RSQ #</th>
                  <th className="py-2.5 px-2 w-48">Apparel Name</th>
                  <th className="py-2.5 px-2 w-52">Fabric</th>
                  <th className="py-2.5 px-2 text-center w-24">Group</th>
                  <th className="py-2.5 px-2 text-center w-36">Movement Type</th>
                  <th className="py-2.5 px-2 text-center w-16">Qty</th>
                  <th className="py-2.5 px-2 text-center w-16">Unit</th>
                  <th className="py-2.5 px-2 text-center w-24">Price</th>
                  <th className="py-2.5 px-2 text-center w-28">Amount</th>
                  <th className="py-2.5 px-2 w-48">Tailor (Dest.)</th>
                  <th className="py-2.5 px-2 w-48">Remarks</th>
                  <th className="py-2.5 px-2 text-center w-12">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {computedRows.map((row, idx) => {
                  const selectedFabric = fabrics.find((f: any) => f.id === row.fabricId);
                  const isJobOrder = row.type === 'WITHDRAWAL' || row.type === 'RETURN';

                  return (
                    <tr key={idx} className="hover:bg-gray-50/20 align-middle">
                      {/* Series # */}
                      <td className="py-3 px-2 text-center font-mono text-gray-400 font-bold">
                        {row.seriesNo || '—'}
                      </td>

                      {/* RSQ # */}
                      <td className="py-3 px-2 text-center font-mono font-black text-primary">
                        {row.rsqNo || '—'}
                      </td>

                      {/* Apparel Name (Text Input with Datalist) */}
                      <td className="py-3 px-2">
                        <input 
                          type="text" 
                          list={`apparel-list-${idx}`}
                          placeholder="e.g. BULLCAP, APRON"
                          value={row.apparelName} 
                          onChange={e => {
                            const val = e.target.value;
                            const targetFabricName = APPAREL_MAP[val];
                            let updateFields: Partial<FormItemRow> = { apparelName: val };
                            
                            if (targetFabricName) {
                              const matchingFab = fabrics.find((f: any) => 
                                normalizeFabricName(f.name) === normalizeFabricName(targetFabricName)
                              );
                              if (matchingFab) {
                                updateFields.fabricId = matchingFab.id;
                                updateFields.price = matchingFab.unitPrice;
                              }
                            }
                            handleUpdateRow(idx, updateFields);
                          }} 
                          className="w-full rounded-lg border-gray-200 py-1 px-2 text-[10px] font-bold bg-white focus:ring-primary focus:border-primary shadow-sm"
                        />
                        <datalist id={`apparel-list-${idx}`}>
                          {Object.keys(APPAREL_MAP).map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </datalist>
                      </td>

                      {/* Fabric Selection */}
                      <td className="py-3 px-2">
                        <select 
                          required
                          value={row.fabricId}
                          onChange={e => handleUpdateRow(idx, { fabricId: e.target.value })}
                          className="w-full rounded-lg border-gray-200 py-1 px-2 text-[10px] font-bold bg-white focus:ring-primary focus:border-primary shadow-sm"
                        >
                          <option value="">-- Choose Fabric --</option>
                          {fabrics.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      </td>

                      {/* Apparel Group */}
                      <td className="py-3 px-2 text-center uppercase text-[10px] text-gray-400">
                        {selectedFabric?.type || '—'}
                      </td>

                      {/* Movement Type */}
                      <td className="py-3 px-2">
                        <select 
                          value={row.type}
                          onChange={e => handleUpdateRow(idx, { type: e.target.value })}
                          className="w-full rounded-lg border-gray-200 py-1 px-2 text-[10px] font-black uppercase bg-white focus:ring-primary focus:border-primary shadow-sm cursor-pointer"
                        >
                          <option value="WITHDRAWAL">WITHDRAWAL</option>
                          <option value="STOCK_IN">STOCK IN</option>
                          <option value="RETURN">RETURN</option>
                          <option value="BEGINNING">BEGINNING</option>
                        </select>
                      </td>

                      {/* Qty */}
                      <td className="py-3 px-2 text-center">
                        <input 
                          type="number" 
                          required 
                          min="0.1" 
                          step="0.1"
                          value={row.quantity} 
                          onChange={e => handleUpdateRow(idx, { quantity: parseFloat(e.target.value) || 0 })} 
                          className="w-full rounded-lg border-gray-200 py-1 px-2 text-[10px] font-black text-center bg-white focus:ring-primary focus:border-primary shadow-sm"
                        />
                      </td>

                      {/* Unit */}
                      <td className="py-3 px-2 text-center uppercase text-gray-400 text-[10px]">
                        {selectedFabric?.unit || '—'}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-2 text-center">
                        <input 
                          type="number" 
                          required 
                          min="0" 
                          value={row.price} 
                          onChange={e => handleUpdateRow(idx, { price: parseFloat(e.target.value) || 0 })} 
                          className="w-full rounded-lg border-gray-200 py-1 px-2 text-[10px] font-bold text-center bg-white focus:ring-primary focus:border-primary shadow-sm"
                        />
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-2 text-center font-black text-gray-900">
                        ₱{((row.quantity || 0) * (row.price || 0)).toLocaleString()}
                      </td>

                      {/* Tailor (Dest) */}
                      <td className="py-3 px-2">
                        {isJobOrder ? (
                          <select 
                            required={isJobOrder}
                            value={row.tailorId}
                            onChange={async e => {
                              const val = e.target.value;
                              if (val === 'ADD_NEW') {
                                const name = prompt('Enter the name of the new tailor:');
                                if (!name) return;
                                try {
                                  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rsq/tailors`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ name: name.toUpperCase() })
                                  });
                                  if (res.ok) {
                                    const newTailor = await res.json();
                                    setTailorsList(prev => [...prev, newTailor].sort((a, b) => a.name.localeCompare(b.name)));
                                    handleUpdateRow(idx, { tailorId: newTailor.id });
                                  } else {
                                    alert('Failed to save new tailor.');
                                  }
                                } catch (err) {
                                  console.error(err);
                                  alert('Error saving new tailor.');
                                }
                              } else {
                                handleUpdateRow(idx, { tailorId: val });
                              }
                            }}
                            className="w-full rounded-lg border-gray-200 py-1 px-2 text-[10px] font-bold bg-white focus:ring-primary focus:border-primary shadow-sm cursor-pointer"
                          >
                            <option value="">-- Choose Tailor --</option>
                            {tailorsList.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            <option value="ADD_NEW" className="text-primary font-black font-semibold">+ Add New Tailor...</option>
                          </select>
                        ) : (
                          <span className="text-[10px] text-gray-300 font-bold uppercase block text-center bg-gray-50 py-1 rounded border border-gray-100">BODEGA</span>
                        )}
                      </td>

                      {/* Remarks */}
                      <td className="py-3 px-2">
                        <input 
                          type="text" 
                          placeholder="Instructions/Notes..."
                          value={row.remarks} 
                          onChange={e => handleUpdateRow(idx, { remarks: e.target.value })} 
                          className="w-full rounded-lg border-gray-200 py-1 px-2 text-[10px] bg-white focus:ring-primary focus:border-primary shadow-sm"
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-2 text-center">
                        <button 
                          type="button" 
                          disabled={rows.length === 1}
                          onClick={() => handleRemoveRow(idx)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 disabled:opacity-30 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Append row button */}
            <button 
              type="button" 
              onClick={handleAddRow}
              className="mt-4 flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-colors active:scale-95 shadow-sm border border-gray-200/50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item Row
            </button>
          </div>

          {/* Footer Area with summaries and buttons */}
          <div className="bg-gray-50 border-t border-gray-200/50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
            {/* Totals */}
            <div className="flex gap-6 text-xs uppercase font-bold text-gray-500 tracking-wider">
              <div>
                <span>Total Quantity: </span>
                <span className="font-black text-gray-900 text-sm ml-1">{totalQty}</span>
              </div>
              <div className="border-r border-gray-200 h-5"></div>
              <div>
                <span>Total Amount: </span>
                <span className="font-black text-gray-900 text-sm ml-1">₱{totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? 'Saving Batch...' : 'Save Transaction Batch'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

