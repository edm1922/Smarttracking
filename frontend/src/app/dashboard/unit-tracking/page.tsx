'use client';

import { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import { PageHeaderSkeleton } from '@/components/ui/LoadingSkeletons';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import { UnitTrackingHeader } from './components/UnitTrackingHeader';
import { UnitTrackingStats } from './components/UnitTrackingStats';
import { UnitTrackingInventory } from './components/UnitTrackingInventory';
import { UnitTrackingRequisition } from './components/UnitTrackingRequisition';
import { UnitTrackingInsights } from './components/UnitTrackingInsights';

export default function UnitTrackingPage() {
  return (
    <Suspense fallback={<div className="p-10"><PageHeaderSkeleton /></div>}>
      <UnitTrackingContent />
    </Suspense>
  );
}

function UnitTrackingContent() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'insights' | 'requisition'>('inventory');
  const [requisitionSubTab, setRequisitionSubTab] = useState<'pending' | 'history'>('pending');

  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [stockInLogs, setStockInLogs] = useState<any[]>([]);

  // Filters & State
  const [logSearch, setLogSearch] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [stockHealthRange, setStockHealthRange] = useState({ 
    start: new Date().toLocaleDateString('en-CA'),
    end: new Date().toLocaleDateString('en-CA')
  });
  const [productFilters, setProductFilters] = useState<Record<string, Record<string, string>>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);
  const [isProcessingRejection, setIsProcessingRejection] = useState(false);
  const [isDeletingLog, setIsDeletingLog] = useState(false);
  const [isBuildingTransmittal, setIsBuildingTransmittal] = useState(false);
  const [transmittalHeader, setTransmittalHeader] = useState({
    transmittalNo: `UT-${new Date().getTime()}`,
    date: new Date().toISOString().split('T')[0],
    department: '',
    recipient: '',
    preparedBy: '',
    checkedBy: '',
    receivedBy: '',
    approvedBy: '',
    remarks: ''
  });
  const [enabledSignatories, setEnabledSignatories] = useState({ 
    preparedBy: true,
    checkedBy: false,
    receivedBy: true,
    approvedBy: false
  });

  const [invPage, setInvPage] = useState(1);
  const [invTotal, setInvTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);
  const pageSize = 100;

  const debouncedLogSearch = useDebounce(logSearch, 300);
  const debouncedInventorySearch = useDebounce(searchTerm, 300);

  const [modalConfig, setModalConfig] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Data Aggregation
  const productSummary = useMemo(() => {
    const summary: Record<string, any> = {};
    inventory.forEach(p => {
      const pName = p.name || 'Unnamed Product';
      if (!summary[pName]) {
        summary[pName] = { name: pName, totalInStock: 0, outToday: 0, inToday: 0, specs: new Set(), movementBreakdown: {}, inBreakdown: {} };
      }
      summary[pName].totalInStock += p.totalQty;
      p.items.forEach((item: any) => {
        item.fieldValues?.forEach((fv: any) => {
          const v = fv.value;
          const val = v && typeof v === 'object' ? (v.main ?? v.qty) : v;
          if (val) summary[pName].specs.add(String(val));
        });
      });
    });

    const start = new Date(stockHealthRange.start);
    const end = new Date(stockHealthRange.end);
    end.setHours(23, 59, 59, 999);

    requests.filter(r => {
      const d = new Date(r.createdAt);
      return r.status === 'APPROVED' && d >= start && d <= end;
    }).forEach(req => {
      const pName = req.item.product?.name || req.item.name;
      if (!pName || pName.trim() === '') return;
      
      const isUnitTracked = req.item.fieldValues?.some((fv: any) => fv.value && typeof fv.value === 'object' && fv.value.useUnitQty);
      if (!isUnitTracked) return;

      if (!summary[pName]) {
        summary[pName] = { name: pName, totalInStock: 0, outToday: 0, inToday: 0, specs: new Set(), movementBreakdown: {}, inBreakdown: {} };
      }
      
      summary[pName].outToday += req.qty;
      const specString = req.item.fieldValues?.map((fv: any) => {
        const v = fv.value;
        const val = v && typeof v === 'object' ? (v.main ?? v.qty) : v;
        return val ? String(val) : '';
      }).filter(Boolean).sort().join(', ') || 'Standard';
      summary[pName].movementBreakdown[specString] = (summary[pName].movementBreakdown[specString] || 0) + req.qty;
    });

    stockInLogs.forEach(log => {
      const pName = log.product?.name || log.item?.name;
      if (!pName || pName.trim() === '') return;
      
      if (log.item) {
        const isUnitTracked = log.item.fieldValues?.some((fv: any) => fv.value && typeof fv.value === 'object' && fv.value.useUnitQty);
        if (!isUnitTracked) return;
      } else {
        if (!summary[pName]) return;
      }

      if (!summary[pName]) {
        summary[pName] = { name: pName, totalInStock: 0, outToday: 0, inToday: 0, specs: new Set(), movementBreakdown: {}, inBreakdown: {} };
      }
      
      const unitField = log.item?.fieldValues?.find((fv: any) => {
         const val = fv.value;
         return val && typeof val === 'object' && val.useUnitQty;
      });
      const liveQty = unitField && !isNaN(Number(unitField.value?.qty)) ? Number(unitField.value.qty) : undefined;
      
      let qty = liveQty ?? Number(log.changes?.quantity);
      if (isNaN(qty) || (liveQty === undefined && log.changes?.quantity === undefined)) {
         qty = (log.action === 'SUBMIT_CONTENT' || log.action === 'CREATE_ITEM' ? 1 : 0);
      }

      if (qty > 0) {
        summary[pName].inToday += qty;
        const specString = log.item?.fieldValues?.map((fv: any) => {
          const v = fv.value;
          const val = v && typeof v === 'object' ? (v.main ?? v.qty) : v;
          return val ? String(val) : '';
        }).filter(Boolean).sort().join(', ') || 'Standard';
        summary[pName].inBreakdown[specString] = (summary[pName].inBreakdown[specString] || 0) + qty;
      }
    });

    return Object.values(summary);
  }, [inventory, requests, stockInLogs, stockHealthRange]);

  // API Fetches
  const fetchInventory = async () => {
    try {
      const skip = (invPage - 1) * pageSize;
      const res = await api.get('/items/unit-inventory', { params: { skip, take: pageSize, search: debouncedInventorySearch } });
      setInventory(res.data.data || []);
      setInvTotal(res.data.total || 0);
    } catch (err) { console.error(err); }
  };

  const fetchRequests = async () => {
    try {
      const skip = (page - 1) * pageSize;
      const res = await api.get('/pull-out-requests', { params: { skip, take: pageSize, search: debouncedLogSearch } });
      setRequests(res.data.data);
      setTotalRequests(res.data.total);
    } catch (err) { console.error(err); }
  };

  const fetchStockInLogs = async () => {
    try {
      const res = await api.get('/logs', { params: { action: 'STOCK_IN,SUBMIT_CONTENT,CREATE_ITEM', startDate: stockHealthRange.start, endDate: stockHealthRange.end, take: 10000 } });
      setStockInLogs(res.data.data || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const load = async () => {
      if (isFirstLoad.current) setLoading(true);
      await Promise.all([fetchRequests(), fetchInventory(), fetchStockInLogs()]);
      if (isFirstLoad.current) {
        setLoading(false);
        isFirstLoad.current = false;
      }
    };
    load();
  }, [invPage, page, debouncedLogSearch, debouncedInventorySearch]);

  useEffect(() => {
    if (activeTab === 'insights') fetchStockInLogs();
  }, [stockHealthRange, activeTab]);

  // Handlers
  const handleApprove = async (id: string) => {
    setModalConfig({
      isOpen: true, title: "Authorize Release", message: "Authorize this asset pull-out? Inventory levels will synchronize immediately.",
      confirmText: "Authorize", onConfirm: async () => {
        setProcessingId(id); setIsProcessingApproval(true); setModalConfig((p: any) => ({...p, isOpen: false}));
        try {
          await api.patch(`/pull-out-requests/${id}/approve`);
          toast.success('Asset release authorized.');
          fetchRequests(); fetchInventory();
        } catch (err: any) { toast.error(err.response?.data?.message || 'Authorization failed.'); }
        finally { setProcessingId(null); setIsProcessingApproval(false); }
      }
    });
  };

  const handleReject = async (id: string) => {
    setModalConfig({
      isOpen: true, title: "Deny Request", message: "Deny this asset pull-out? The requester will be notified of the decision.",
      confirmText: "Deny Request", isDestructive: true, onConfirm: async () => {
        setProcessingId(id); setIsProcessingRejection(true); setModalConfig((p: any) => ({...p, isOpen: false}));
        try {
          await api.patch(`/pull-out-requests/${id}/reject`);
          toast.info('Release request denied.');
          fetchRequests();
        } catch (err: any) { toast.error('Decision transmission failed.'); }
        finally { setProcessingId(null); setIsProcessingRejection(false); }
      }
    });
  };

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Stock Health Report');

    // 1. Header Section
    sheet.mergeCells('A1:E1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'STOCK HEALTH & TRANSMITTAL REPORT';
    titleCell.font = { name: 'Aptos', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' } // Dark Slate 800
    };
    sheet.getRow(1).height = 40;

    // 2. Metadata Section (Info)
    const metaData = [
      ['Transmittal No:', transmittalHeader.transmittalNo],
      ['Date Covered:', stockHealthRange.start === stockHealthRange.end ? stockHealthRange.start : `${stockHealthRange.start} to ${stockHealthRange.end}`],
      ['Department:', transmittalHeader.department || 'N/A'],
      ['Recipient:', transmittalHeader.recipient || 'N/A'],
      ['Remarks:', transmittalHeader.remarks || 'None'],
    ];

    metaData.forEach((row, i) => {
      const rowIndex = i + 2;
      sheet.getCell(`A${rowIndex}`).value = row[0];
      sheet.getCell(`B${rowIndex}`).value = row[1];
      
      sheet.getCell(`A${rowIndex}`).font = { bold: true, size: 10, name: 'Aptos' };
      sheet.getCell(`B${rowIndex}`).font = { size: 10, name: 'Aptos' };
      sheet.getCell(`A${rowIndex}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' }
      };
      sheet.getRow(rowIndex).height = 20;
    });

    // Spacer
    sheet.getRow(7).height = 10;

    // 3. Stock Movement Header
    sheet.mergeCells('A8:E8');
    const tableTitle = sheet.getCell('A8');
    tableTitle.value = 'STOCK MOVEMENT DATA';
    tableTitle.font = { bold: true, size: 11, name: 'Aptos', color: { argb: 'FF334155' } };
    tableTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    sheet.getRow(8).height = 25;

    // 4. Data Table
    const headerRow = sheet.getRow(9);
    headerRow.values = ['Product Reference', 'Starting Stock', 'Movement Qty', 'Resulting Stock', 'Movement Breakdown'];
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Aptos' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    const dataRows = productSummary.filter(i => i.inToday > 0 || i.outToday > 0).map(item => {
      const breakdownStr = Object.entries(item.movementBreakdown)
        .map(([spec, qty]) => `${spec}: ${qty}`)
        .join(' | ');
        
      return [
        item.name,
        item.totalInStock + item.outToday - item.inToday,
        item.inToday - item.outToday,
        item.totalInStock,
        breakdownStr || 'No Movement'
      ];
    });

    dataRows.forEach((row, i) => {
      const excelRow = sheet.addRow(row);
      excelRow.height = 25;
      excelRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Aptos', size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 || colNumber === 5 ? 'left' : 'right' };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        
        // Product Reference bold
        if (colNumber === 1) cell.font = { bold: true, name: 'Aptos' };
        
        // Movement Qty Red if negative
        if (colNumber === 3 && typeof cell.value === 'number' && cell.value < 0) {
          cell.font = { color: { argb: 'FFEF4444' }, bold: true, name: 'Aptos' };
        }

        // Breakdown wrapping
        if (colNumber === 5) {
          cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
          excelRow.height = Math.max(25, (String(cell.value).length / 40) * 15);
        }

        // Alternating row colors
        if (i % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
      });
    });

    // Enable Autofilter
    sheet.autoFilter = 'A9:E9';

    // Conditional Formatting for Resulting Stock
    const lastDataRow = 9 + dataRows.length;
    sheet.addConditionalFormatting({
      ref: `D10:D${lastDataRow}`,
      rules: [
        {
          priority: 1,
          type: 'cellIs',
          operator: 'lessThan',
          formulae: ['20'], // Low stock example
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFEE2E2' } }, font: { color: { argb: 'FF991B1B' }, bold: true } }
        },
        {
          priority: 2,
          type: 'cellIs',
          operator: 'between',
          formulae: ['20', '50'],
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFEF3C7' } }, font: { color: { argb: 'FF92400E' }, bold: true } }
        },
        {
          priority: 3,
          type: 'cellIs',
          operator: 'greaterThan',
          formulae: ['50'],
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFDCFCE7' } }, font: { color: { argb: 'FF166534' }, bold: true } }
        }
      ]
    });

    // 5. Signatories Section
    let currentSigRow = lastDataRow + 3;
    sheet.getCell(`A${currentSigRow}`).value = 'SIGNATORIES';
    sheet.getCell(`A${currentSigRow}`).font = { bold: true, size: 11, name: 'Aptos' };
    sheet.getRow(currentSigRow).height = 25;
    
    currentSigRow += 2;
    const signatoriesList = ['preparedBy', 'checkedBy', 'receivedBy', 'approvedBy'].filter(f => (enabledSignatories as any)[f]);
    
    // Group signatories in pairs
    for (let i = 0; i < signatoriesList.length; i += 2) {
      const sig1 = signatoriesList[i];
      const sig2 = signatoriesList[i + 1];
      
      const label1 = sig1.replace(/By$/, ' By');
      const name1 = (transmittalHeader as any)[sig1] || '____________________';
      
      sheet.getCell(`A${currentSigRow}`).value = label1.toUpperCase();
      sheet.getCell(`A${currentSigRow}`).font = { size: 9, bold: true, color: { argb: 'FF64748B' } };
      
      sheet.getCell(`A${currentSigRow + 2}`).value = name1.toUpperCase();
      sheet.getCell(`A${currentSigRow + 2}`).font = { size: 10, bold: true, name: 'Aptos' };
      sheet.getCell(`A${currentSigRow + 2}`).alignment = { horizontal: 'center' };
      sheet.getCell(`A${currentSigRow + 2}`).border = { bottom: { style: 'thin' } };
      
      sheet.getCell(`A${currentSigRow + 3}`).value = 'Signature / Date';
      sheet.getCell(`A${currentSigRow + 3}`).font = { size: 8, italic: true, color: { argb: 'FF94A3B8' } };
      sheet.getCell(`A${currentSigRow + 3}`).alignment = { horizontal: 'center' };

      if (sig2) {
        const label2 = sig2.replace(/By$/, ' By');
        const name2 = (transmittalHeader as any)[sig2] || '____________________';
        
        sheet.getCell(`D${currentSigRow}`).value = label2.toUpperCase();
        sheet.getCell(`D${currentSigRow}`).font = { size: 9, bold: true, color: { argb: 'FF64748B' } };
        
        sheet.getCell(`D${currentSigRow + 2}`).value = name2.toUpperCase();
        sheet.getCell(`D${currentSigRow + 2}`).font = { size: 10, bold: true, name: 'Aptos' };
        sheet.getCell(`D${currentSigRow + 2}`).alignment = { horizontal: 'center' };
        sheet.getCell(`D${currentSigRow + 2}`).border = { bottom: { style: 'thin' } };
        
        sheet.getCell(`D${currentSigRow + 3}`).value = 'Signature / Date';
        sheet.getCell(`D${currentSigRow + 3}`).font = { size: 8, italic: true, color: { argb: 'FF94A3B8' } };
        sheet.getCell(`D${currentSigRow + 3}`).alignment = { horizontal: 'center' };
      }
      
      currentSigRow += 6;
    }

    // Column Widths
    sheet.getColumn(1).width = 35; // Reference
    sheet.getColumn(2).width = 18; // Starting
    sheet.getColumn(3).width = 18; // Movement
    sheet.getColumn(4).width = 18; // Resulting
    sheet.getColumn(5).width = 65; // Breakdown

    // Remove Gridlines
    sheet.views = [{ ...sheet.views[0], showGridLines: false }];

    // Generate Buffer and Save
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${transmittalHeader.transmittalNo}_Transmittal_Report.xlsx`);
    setIsBuildingTransmittal(false);
  };

  const toggleFilter = (productName: string, specKey: string, specValue: string) => {
    setProductFilters(prev => {
      if (productName === '') return {}; // Clear all
      const currentProductFilters = prev[productName] || {};
      const newFilters = { ...currentProductFilters };
      if (newFilters[specKey] === specValue) delete newFilters[specKey];
      else newFilters[specKey] = specValue;
      return { ...prev, [productName]: newFilters };
    });
  };

  const getFilteredQty = (product: any) => {
    const filters = productFilters[product.name] || {};
    if (Object.keys(filters).length === 0) return product.totalQty;
    return product.items.filter((item: any) => Object.entries(filters).every(([fKey, fVal]) => item.fieldValues.some((fv: any) => fv.name === fKey && String(fv.value && typeof fv.value === 'object' ? (fv.value.main || '') : fv.value) === fVal))).reduce((sum: number, item: any) => sum + item.qty, 0);
  };

  const displayRequests = useMemo(() => {
    let filtered = requests;
    if (dateRange.start) filtered = filtered.filter(r => new Date(r.createdAt) >= new Date(dateRange.start));
    if (dateRange.end) {
      const end = new Date(dateRange.end); end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => new Date(r.createdAt) <= end);
    }
    if (requisitionSubTab === 'pending') filtered = filtered.filter(r => r.status === 'PENDING' || r.status === 'SUBMITTED');
    else filtered = filtered.filter(r => r.status === 'APPROVED' || r.status === 'REJECTED');
    return filtered;
  }, [requests, dateRange, requisitionSubTab]);

  if (loading && inventory.length === 0) return <div className="p-10"><PageHeaderSkeleton /></div>;

  return (
    <div className="max-w-[1600px] mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
      <UnitTrackingHeader 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        totalStock={inventory.reduce((acc, p) => acc + p.totalQty, 0)} 
      />

      <UnitTrackingStats 
        totalProducts={inventory.length}
        totalQRs={inventory.reduce((acc, p) => acc + p.items.length, 0)}
        totalStock={inventory.reduce((acc, p) => acc + p.totalQty, 0)}
        lowStockCount={inventory.filter(p => p.totalQty <= (p.threshold || 50)).length}
      />

      {activeTab === 'inventory' && (
        <UnitTrackingInventory 
          inventory={inventory} searchTerm={searchTerm} setSearchTerm={setSearchTerm}
          expandedProduct={expandedProduct} setExpandedProduct={setExpandedProduct}
          productFilters={productFilters} toggleFilter={toggleFilter} getFilteredQty={getFilteredQty}
          invPage={invPage} setInvPage={setInvPage} invTotal={invTotal} pageSize={pageSize}
        />
      )}

      {activeTab === 'requisition' && (
        <UnitTrackingRequisition 
          displayRequests={displayRequests} requisitionSubTab={requisitionSubTab} setRequisitionSubTab={setRequisitionSubTab}
          selectedRequestIds={selectedRequestIds} 
          toggleRequestSelection={(id) => setSelectedRequestIds(prev => prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id])}
          handleApprove={handleApprove} handleReject={handleReject}
          handleBulkApprove={async () => {
            setModalConfig({
              isOpen: true, title: "Bulk Authorization", message: `Authorize release for ${selectedRequestIds.length} selected assets?`,
              confirmText: "Authorize All", onConfirm: async () => {
                setModalConfig((p: any) => ({...p, isOpen: false})); setIsProcessingApproval(true);
                try {
                  await api.post('/pull-out-requests/bulk-approve', { ids: selectedRequestIds });
                  toast.success('Bulk authorization completed.');
                  setSelectedRequestIds([]); fetchRequests(); fetchInventory();
                } catch (err) { toast.error('Bulk operation failed.'); }
                finally { setIsProcessingApproval(false); }
              }
            });
          }}
          handleBulkReject={async () => {
            setModalConfig({
              isOpen: true, title: "Bulk Denial", message: `Deny release for ${selectedRequestIds.length} selected assets?`,
              confirmText: "Deny All", isDestructive: true, onConfirm: async () => {
                setModalConfig((p: any) => ({...p, isOpen: false})); setIsProcessingRejection(true);
                try {
                  await api.post('/pull-out-requests/bulk-reject', { ids: selectedRequestIds });
                  toast.info('Bulk denial completed.');
                  setSelectedRequestIds([]); fetchRequests();
                } catch (err) { toast.error('Bulk operation failed.'); }
                finally { setIsProcessingRejection(false); }
              }
            });
          }}
          handleDeleteLog={async (id) => {
            setModalConfig({
              isOpen: true, title: "Purge Audit Log", message: "Permanently delete this audit entry? Inventory levels will not be affected.",
              confirmText: "Purge Entry", isDestructive: true, onConfirm: async () => {
                setModalConfig((p: any) => ({...p, isOpen: false}));
                try {
                  await api.delete(`/pull-out-requests/${id}`);
                  toast.success('Audit entry purged.');
                  fetchRequests();
                } catch (err) { toast.error('Purge failed.'); }
              }
            });
          }}
          processingId={processingId} isProcessingApproval={isProcessingApproval} isProcessingRejection={isProcessingRejection}
          logSearch={logSearch} setLogSearch={setLogSearch} dateRange={dateRange} setDateRange={setDateRange}
        />
      )}

      {activeTab === 'insights' && (
        <UnitTrackingInsights 
          productSummary={productSummary} 
          stockHealthRange={stockHealthRange} 
          setStockHealthRange={setStockHealthRange}
          handleExportExcel={() => setIsBuildingTransmittal(true)}
          isBuildingTransmittal={isBuildingTransmittal}
          setIsBuildingTransmittal={setIsBuildingTransmittal}
          transmittalHeader={transmittalHeader}
          setTransmittalHeader={setTransmittalHeader}
          enabledSignatories={enabledSignatories}
          setEnabledSignatories={setEnabledSignatories}
          onConfirmExport={handleExportExcel}
        />
      )}

      <ConfirmModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}
        isDestructive={modalConfig.isDestructive}
        requireConfirmationText={modalConfig.requireConfirmationText}
      />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `}</style>
    </div>
  );
}
