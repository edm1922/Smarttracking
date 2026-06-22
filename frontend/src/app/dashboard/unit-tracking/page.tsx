'use client';

import { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import { PageHeaderSkeleton } from '@/components/ui/LoadingSkeletons';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
applyPlugin(jsPDF);
import { X, FileText, ImageIcon, CheckCircle, Clock, User, Box, ClipboardList } from 'lucide-react';

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
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [stockInLogs, setStockInLogs] = useState<any[]>([]);

  // Filters & State
  const [logSearch, setLogSearch] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [stockHealthRange, setStockHealthRange] = useState({ 
    start: new Date(Date.now() - 7 * 86400000).toLocaleDateString('en-CA'),
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
  const [exportType, setExportType] = useState<'all' | 'stock-in' | 'stock-out'>('all');

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

    const start = new Date(stockHealthRange.start + 'T00:00:00');
    const end = new Date(stockHealthRange.end + 'T23:59:59.999');

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
        const fieldName = fv.field?.name || fv.name || '';
        return val ? `${fieldName ? fieldName + ': ' : ''}${val}` : '';
      }).filter(Boolean).sort().join(', ') || 'Standard';
      if (!summary[pName].movementBreakdown[specString]) summary[pName].movementBreakdown[specString] = [];
      summary[pName].movementBreakdown[specString].push({ qty: req.qty, date: req.createdAt, slug: req.item?.slug });
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
      
      let qty = Number(log.changes?.quantity);
      if (isNaN(qty)) {
        qty = liveQty ?? 0;
      }
      if (isNaN(qty) || qty === 0) {
         qty = (log.action === 'SUBMIT_CONTENT' || log.action === 'CREATE_ITEM' ? 1 : 0);
      }

      if (qty > 0) {
        summary[pName].inToday += qty;
        const specString = log.item?.fieldValues?.map((fv: any) => {
          const v = fv.value;
          const val = v && typeof v === 'object' ? (v.main ?? v.qty) : v;
          const fieldName = fv.field?.name || '';
          return val ? `${fieldName ? fieldName + ': ' : ''}${val}` : '';
        }).filter(Boolean).sort().join(', ') || 'Standard';
        if (!summary[pName].inBreakdown[specString]) summary[pName].inBreakdown[specString] = [];
        summary[pName].inBreakdown[specString].push({ qty, date: log.createdAt, slug: log.item?.slug });
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
    } catch (err) {
      console.error(err);
      if (err && typeof err === 'object' && 'response' in err && !err.response) {
        toast.error('Cannot reach server — data may be stale');
      }
    }
  };

  const fetchRequests = async () => {
    try {
      const skip = (page - 1) * pageSize;
      const res = await api.get('/pull-out-requests', { params: { skip, take: pageSize, search: debouncedLogSearch } });
      setRequests(res.data.data);
      setTotalRequests(res.data.total);
    } catch (err) {
      console.error(err);
      if (err && typeof err === 'object' && 'response' in err && !err.response) {
        toast.error('Cannot reach server — data may be stale');
      }
    }
  };

  const fetchStockInLogs = async () => {
    try {
      const startUTC = new Date(stockHealthRange.start + 'T00:00:00').toISOString();
      const endUTC = new Date(stockHealthRange.end + 'T23:59:59.999').toISOString();
      const res = await api.get('/logs', { params: { action: 'STOCK_IN,CREATE_ITEM', startDate: startUTC, endDate: endUTC, take: 10000 } });
      setStockInLogs(res.data.data || []);
    } catch (err) {
      console.error(err);
      if (err && typeof err === 'object' && 'response' in err && !err.response) {
        toast.error('Cannot reach server — data may be stale');
      }
    }
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

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'letter');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const ml = 15;
    const mr = 28;
    const usableWidth = pageWidth - ml - mr;

    // ── Title ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('UNIFORM TRANSACTION', pageWidth / 2, 22, { align: 'center' });

    doc.setFontSize(16);
    const subtitle = exportType === 'stock-in' ? 'STOCK IN REPORT'
      : exportType === 'stock-out' ? 'STOCK OUT REPORT'
      : 'STOCK HEALTH REPORT';
    doc.text(subtitle, pageWidth / 2, 32, { align: 'center' });

    // ── Separator line ──
    doc.setDrawColor(200, 200, 200);
    doc.line(ml, 36, pageWidth - mr, 36);

    // ── Metadata ──
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const leftMeta = [
      `Recipient: ${transmittalHeader.recipient || 'N/A'}`,
      `Department: ${transmittalHeader.department || 'N/A'}`,
      `Date Covered: ${stockHealthRange.start === stockHealthRange.end ? stockHealthRange.start : `${stockHealthRange.start} to ${stockHealthRange.end}`}`,
    ];
    const rightMeta = [
      `Transaction No.: ${transmittalHeader.transmittalNo}`,
      `Created by: ${typeof window !== 'undefined' ? (localStorage.getItem('username')?.toUpperCase() || 'N/A') : 'N/A'}`,
      `Created at: ${new Date().toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).toUpperCase()}`,
    ];

    const metaStartY = 42;
    leftMeta.forEach((line, i) => {
      doc.text(line, ml, metaStartY + i * 6);
    });
    rightMeta.forEach((line, i) => {
      doc.text(line, pageWidth - mr, metaStartY + i * 6, { align: 'right' });
    });

    // ── Data Table ──
    const dataRows = productSummary
      .filter((item: any) =>
        exportType === 'stock-in' ? item.inToday > item.outToday
        : exportType === 'stock-out' ? item.outToday > item.inToday
        : item.inToday > 0 || item.outToday > 0
      )
      .map((item: any, idx: number) => {
        const breakdownParts = exportType === 'stock-in'
          ? Object.entries(item.inBreakdown || {}).map(([s, q]) => `IN ${s}: +${q}`)
          : exportType === 'stock-out'
          ? Object.entries(item.movementBreakdown || {}).map(([s, q]) => `OUT ${s}: ${q}`)
          : [
              ...Object.entries(item.movementBreakdown || {}).map(([s, q]) => `OUT ${s}: ${q}`),
              ...Object.entries(item.inBreakdown || {}).map(([s, q]) => `IN ${s}: +${q}`),
            ];
        const breakdownStr = breakdownParts.join('; ') || '\u2014';
    const opening = item.totalInStock + item.outToday - item.inToday;
        const movement = item.inToday - item.outToday;
        const movementStr = movement > 0 ? `+${movement}` : String(movement);
        return [
          `${idx + 1}.`,
          item.name,
          String(opening),
          movementStr,
          String(item.totalInStock),
          breakdownStr,
        ];
      });

    const tableStartY = metaStartY + leftMeta.length * 6 + 8;

    if (dataRows.length > 0) {
      (doc as any).autoTable({
        startY: tableStartY,
        head: [['NO.', 'PRODUCT REFERENCE', 'OPENING', 'MOVEMENT', 'CLOSING', 'BREAKDOWN']],
        body: dataRows,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
        },
        bodyStyles: {
          fontSize: 7.5,
          lineColor: [220, 220, 220],
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 70, halign: 'left' },
          2: { cellWidth: 25, halign: 'right' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 'auto', halign: 'left' },
        },
        margin: { left: ml, right: mr },
        pageBreak: 'auto',
      });
    }

    // ── Summary / Total ──
    const totalY = dataRows.length > 0
      ? (doc as any).lastAutoTable.finalY + 8
      : tableStartY + 10;

    if (dataRows.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.text('No stock movement recorded in selected range.', pageWidth / 2, totalY, { align: 'center' });
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`TOTAL ITEMS RECORDED: ${dataRows.length}`, ml, totalY);
    }

    // ── Signatory Section ──
    const signFields = ['preparedBy', 'checkedBy', 'receivedBy', 'approvedBy']
      .filter(f => (enabledSignatories as any)[f]);

    if (signFields.length > 0) {
      const signY = totalY + 14;
      const signColWidth = usableWidth / signFields.length;

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);

      signFields.forEach((field, i) => {
        const x = ml + i * signColWidth;
        const label = field === 'preparedBy' ? 'Prepared by:'
          : field === 'checkedBy' ? 'Checked by:'
          : field === 'receivedBy' ? 'Received by:'
          : 'Approved by:';
        const name = (transmittalHeader as any)[field] || '____________________';

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(label, x, signY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(name, x, signY + 6);

        doc.line(x, signY + 9, x + signColWidth - 5, signY + 9);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6);
        doc.text('Signature Over Printed Name', x, signY + 13);
      });
    }

    // ── Footer ──
    const footerY = pageHeight - 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const dateStr = new Date().toLocaleDateString('en-US', {
      month: '2-digit', day: '2-digit', year: '2-digit'
    });
    const timeStr = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit'
    });
    doc.text(`${dateStr}, ${timeStr}`, ml, footerY);
    doc.text(`Uniform Transaction - ${transmittalHeader.transmittalNo}`, pageWidth / 2, footerY, { align: 'center' });
    doc.text('1/1', pageWidth - mr, footerY, { align: 'right' });

    // ── Print ──
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
    setIsBuildingTransmittal(false);
  };

  const handlePrintItem = async (item: any) => {
    // Fetch fresh data for the report (bypass stale state)
    const [inventoryRes, requestsRes, stockInLogsRes] = await Promise.all([
      api.get('/items/unit-inventory', { params: { skip: 0, take: 9999 } }),
      api.get('/pull-out-requests', { params: { skip: 0, take: 9999 } }),
      api.get('/logs', {
        params: {
          action: 'STOCK_IN,CREATE_ITEM',
          startDate: new Date(stockHealthRange.start + 'T00:00:00').toISOString(),
          endDate: new Date(stockHealthRange.end + 'T23:59:59.999').toISOString(),
          take: 10000,
        },
      }),
    ]);

    const freshInventory = inventoryRes.data.data || [];
    const freshRequests = (requestsRes.data.data || []).filter((r: any) => r.status === 'APPROVED');
    const freshStockInLogs = stockInLogsRes.data.data || [];
    const pName = item.name;
    const start = new Date(stockHealthRange.start + 'T00:00:00');
    const end = new Date(stockHealthRange.end + 'T23:59:59.999');

    let totalInStock = 0;
    freshInventory.forEach((p: any) => {
      if (p.name === pName) totalInStock += p.totalQty;
    });

    let outToday = 0;
    const movementBreakdown: Record<string, { qty: number; date: string }[]> = {};
    freshRequests.forEach((req: any) => {
      const reqPName = req.item.product?.name || req.item.name;
      if (reqPName !== pName) return;
      const isUnitTracked = req.item.fieldValues?.some((fv: any) => fv.value && typeof fv.value === 'object' && fv.value.useUnitQty);
      if (!isUnitTracked) return;
      outToday += req.qty;
      const specString = req.item.fieldValues?.map((fv: any) => {
        const v = fv.value;
        const val = v && typeof v === 'object' ? (v.main ?? v.qty) : v;
        const fieldName = fv.field?.name || fv.name || '';
        return val ? `${fieldName ? fieldName + ': ' : ''}${val}` : '';
      }).filter(Boolean).sort().join(', ') || 'Standard';
      if (!movementBreakdown[specString]) movementBreakdown[specString] = [];
      movementBreakdown[specString].push({ qty: req.qty, date: req.createdAt });
    });

    let inToday = 0;
    const inBreakdown: Record<string, { qty: number; date: string }[]> = {};
    freshStockInLogs.forEach((log: any) => {
      const logPName = log.product?.name || log.item?.name;
      if (logPName !== pName) return;
      if (log.item) {
        const isUnitTracked = log.item.fieldValues?.some((fv: any) => fv.value && typeof fv.value === 'object' && fv.value.useUnitQty);
        if (!isUnitTracked) return;
      }
      const unitField = log.item?.fieldValues?.find((fv: any) => {
        const val = fv.value;
        return val && typeof val === 'object' && val.useUnitQty;
      });
      const liveQty = unitField && !isNaN(Number(unitField.value?.qty)) ? Number(unitField.value.qty) : undefined;
      let qty = Number(log.changes?.quantity);
      if (isNaN(qty)) qty = liveQty ?? 0;
      if (isNaN(qty) || qty === 0) qty = (log.action === 'SUBMIT_CONTENT' || log.action === 'CREATE_ITEM' ? 1 : 0);
      if (qty > 0) {
        inToday += qty;
        const specString = log.item?.fieldValues?.map((fv: any) => {
          const v = fv.value;
          const val = v && typeof v === 'object' ? (v.main ?? v.qty) : v;
          const fieldName = fv.field?.name || '';
          return val ? `${fieldName ? fieldName + ': ' : ''}${val}` : '';
        }).filter(Boolean).sort().join(', ') || 'Standard';
        if (!inBreakdown[specString]) inBreakdown[specString] = [];
        inBreakdown[specString].push({ qty, date: log.createdAt });
      }
    });

    const freshItem = { name: pName, totalInStock, outToday, inToday, movementBreakdown, inBreakdown };

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Uniform Stocks Report', {
      views: [{ showGridLines: false }]
    });

    const thinBorder = { style: 'thin' as const, color: { argb: 'FF94A3B8' } };
    const allBorders = {
      top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder,
    };

    // Landscape page setup, 10 columns matching the reference layout
    ws.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.2, right: 0.2, top: 0.2, bottom: 0.2, header: 0, footer: 0,
      },
    };
    ws.columns = [
      { key: 'a', width: 6 },
      { key: 'b', width: 12 },
      { key: 'c', width: 32 },
      { key: 'd', width: 10 },
      { key: 'e', width: 12 },
      { key: 'f', width: 10 },
      { key: 'g', width: 12 },
      { key: 'h', width: 10 },
      { key: 'i', width: 12 },
      { key: 'j', width: 10 },
      { key: 'k', width: 12 },
      { key: 'l', width: 10 },
    ];

    const fmtStart = new Date(stockHealthRange.start).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
    const fmtEnd = new Date(stockHealthRange.end).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
    const runtimeStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const opening = freshItem.totalInStock + freshItem.outToday - freshItem.inToday;

    // ── Company Header ──
    ws.mergeCells('A1:L1');
    const h1 = ws.getCell('A1');
    h1.value = 'CENTRO SERVICES COOPERATIVE';
    h1.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF0F172A' } };
    h1.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(1).height = 28;

    ws.mergeCells('A2:L2');
    const h2 = ws.getCell('A2');
    h2.value = 'Purok Camachille, Brgy. Tambler, General Santos City';
    h2.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF64748B' } };
    h2.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(2).height = 18;

    ws.mergeCells('A3:L3');
    const h3 = ws.getCell('A3');
    h3.value = 'centrocooperative21@gmail.com | (083) 554 5552';
    h3.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF94A3B8' } };
    h3.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(3).height = 18;

    // ── Spacer ──
    ws.getRow(4).height = 8;

    // ── Title ──
    ws.mergeCells('A5:L5');
    const title = ws.getCell('A5');
    title.value = 'UNIFORM STOCKS REPORT';
    title.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FF0F172A' } };
    title.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(5).height = 32;

    // ── Spacer ──
    ws.getRow(6).height = 8;

    // ── Period Covered ──
    ws.mergeCells('C7:L7');
    const periodLabel = ws.getCell('A7');
    periodLabel.value = 'Period Covered:';
    periodLabel.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF475569' } };
    periodLabel.alignment = { horizontal: 'left', vertical: 'middle' };
    const periodVal = ws.getCell('C7');
    periodVal.value = `${fmtStart} - ${fmtEnd}`;
    periodVal.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF0F172A' } };
    ws.getRow(7).height = 20;

    // ── Runtime ──
    ws.mergeCells('C8:L8');
    const runtimeLabel = ws.getCell('A8');
    runtimeLabel.value = 'Runtime:';
    runtimeLabel.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF475569' } };
    runtimeLabel.alignment = { horizontal: 'left', vertical: 'middle' };
    const runtimeVal = ws.getCell('C8');
    runtimeVal.value = runtimeStr;
    runtimeVal.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF0F172A' } };
    ws.getRow(8).height = 20;

    // ── Spacer ──
    ws.getRow(9).height = 8;
    ws.getRow(11).height = 6;
    ws.getRow(13).height = 6;

    // ── Item Name ──
    ws.mergeCells('A10:L10');
    const itemRow = ws.getCell('A10');
    itemRow.value = `ITEM: ${freshItem.name?.toUpperCase() || 'N/A'}`;
    itemRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    ws.getRow(10).height = 22;

    // ── Collect spec data ──
    const allSpecKeys = new Set([
      ...Object.keys(freshItem.inBreakdown || {}),
      ...Object.keys(freshItem.movementBreakdown || {}),
    ]);

    const specData = Array.from(allSpecKeys).map(spec => {
      const inEntries = (freshItem.inBreakdown?.[spec] || []) as { qty: number; date: string }[];
      const outEntries = (freshItem.movementBreakdown?.[spec] || []) as { qty: number; date: string }[];
      const inTotal = inEntries.reduce((s, e) => s + e.qty, 0);
      const outTotal = outEntries.reduce((s, e) => s + e.qty, 0);
      return { spec, inTotal, outTotal, net: inTotal - outTotal, specOpening: 0 };
    });

    // Calculate each spec's opening balance proportionally
    let totalMovement = specData.reduce((s, d) => s + Math.abs(d.net), 0);
    if (totalMovement === 0) totalMovement = 1;
    let remainingOpening = opening;
    specData.forEach((d, i) => {
      if (i === specData.length - 1) {
        d.specOpening = remainingOpening;
      } else {
        const proportion = Math.abs(d.net) / totalMovement;
        d.specOpening = Math.round(opening * proportion);
        remainingOpening -= d.specOpening;
      }
    });

    let cr = 12;
    const dataStartRow = cr;

    if (specData.length > 0) {
      // ── Table Header (matches reference file structure) ──
      const hRow = cr;
      // A: NO. (merged hRow to hRow+2)
      ws.mergeCells(`A${hRow}:A${hRow + 2}`);
      const hA = ws.getCell(`A${hRow}`);
      hA.value = 'NO.';
      hA.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF334155' } };
      hA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      hA.alignment = { horizontal: 'center', vertical: 'middle' };
      hA.border = allBorders;
      ws.getCell(`A${hRow + 1}`).border = allBorders;
      ws.getCell(`A${hRow + 2}`).border = allBorders;

      // B: empty (merged hRow to hRow+2)
      ws.mergeCells(`B${hRow}:B${hRow + 2}`);
      const hB = ws.getCell(`B${hRow}`);
      hB.value = '';
      hB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      hB.border = allBorders;
      ws.getCell(`B${hRow + 1}`).border = allBorders;
      ws.getCell(`B${hRow + 2}`).border = allBorders;

      // C: SPECIFICATION (merged hRow to hRow+2)
      ws.mergeCells(`C${hRow}:C${hRow + 2}`);
      const hC = ws.getCell(`C${hRow}`);
      hC.value = 'SPECIFICATION';
      hC.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF334155' } };
      hC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      hC.alignment = { horizontal: 'center', vertical: 'middle' };
      hC.border = allBorders;
      ws.getCell(`C${hRow + 1}`).border = allBorders;
      ws.getCell(`C${hRow + 2}`).border = allBorders;

      // D: (empty — no price, merged hRow to hRow+2)
      ws.mergeCells(`D${hRow}:D${hRow + 2}`);
      const hD = ws.getCell(`D${hRow}`);
      hD.value = '';
      hD.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      hD.border = allBorders;
      ws.getCell(`D${hRow + 1}`).border = allBorders;
      ws.getCell(`D${hRow + 2}`).border = allBorders;

      // E-F: OPENING (merged hRow to hRow+1)
      ws.mergeCells(`E${hRow}:F${hRow + 1}`);
      const hEF = ws.getCell(`E${hRow}`);
      hEF.value = 'OPENING';
      hEF.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF334155' } };
      hEF.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      hEF.alignment = { horizontal: 'center', vertical: 'middle' };
      hEF.border = allBorders;
      ws.getCell(`F${hRow}`).border = allBorders;
      ws.getCell(`E${hRow + 1}`).border = allBorders;
      ws.getCell(`F${hRow + 1}`).border = allBorders;

      // G-H: STOCK IN (merged hRow to hRow+1)
      ws.mergeCells(`G${hRow}:H${hRow + 1}`);
      const hGH = ws.getCell(`G${hRow}`);
      hGH.value = 'STOCK IN';
      hGH.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF334155' } };
      hGH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      hGH.alignment = { horizontal: 'center', vertical: 'middle' };
      hGH.border = allBorders;
      ws.getCell(`H${hRow}`).border = allBorders;
      ws.getCell(`G${hRow + 1}`).border = allBorders;
      ws.getCell(`H${hRow + 1}`).border = allBorders;

      // I-J: STOCK OUT (merged hRow to hRow+1)
      ws.mergeCells(`I${hRow}:J${hRow + 1}`);
      const hIJ = ws.getCell(`I${hRow}`);
      hIJ.value = 'STOCK OUT';
      hIJ.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF334155' } };
      hIJ.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      hIJ.alignment = { horizontal: 'center', vertical: 'middle' };
      hIJ.border = allBorders;
      ws.getCell(`J${hRow}`).border = allBorders;
      ws.getCell(`I${hRow + 1}`).border = allBorders;
      ws.getCell(`J${hRow + 1}`).border = allBorders;

      // K-L: ENDING (merged hRow to hRow+1)
      ws.mergeCells(`K${hRow}:L${hRow + 1}`);
      const hKL = ws.getCell(`K${hRow}`);
      hKL.value = 'ENDING';
      hKL.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF334155' } };
      hKL.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      hKL.alignment = { horizontal: 'center', vertical: 'middle' };
      hKL.border = allBorders;
      ws.getCell(`L${hRow}`).border = allBorders;
      ws.getCell(`K${hRow + 1}`).border = allBorders;
      ws.getCell(`L${hRow + 1}`).border = allBorders;

      // Row hRow+2: sub-headers
      ws.getCell(`E${hRow + 2}`).value = 'QTY';
      ws.getCell(`E${hRow + 2}`).font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: 'FF64748B' } };
      ws.getCell(`E${hRow + 2}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      ws.getCell(`E${hRow + 2}`).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getCell(`E${hRow + 2}`).border = allBorders;

      ws.getCell(`F${hRow + 2}`).value = '';
      ws.getCell(`F${hRow + 2}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      ws.getCell(`F${hRow + 2}`).border = allBorders;

      ws.getCell(`G${hRow + 2}`).value = 'QTY';
      ws.getCell(`G${hRow + 2}`).font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: 'FF64748B' } };
      ws.getCell(`G${hRow + 2}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      ws.getCell(`G${hRow + 2}`).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getCell(`G${hRow + 2}`).border = allBorders;

      ws.getCell(`H${hRow + 2}`).value = '';
      ws.getCell(`H${hRow + 2}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      ws.getCell(`H${hRow + 2}`).border = allBorders;

      ws.getCell(`I${hRow + 2}`).value = 'QTY';
      ws.getCell(`I${hRow + 2}`).font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: 'FF64748B' } };
      ws.getCell(`I${hRow + 2}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      ws.getCell(`I${hRow + 2}`).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getCell(`I${hRow + 2}`).border = allBorders;

      ws.getCell(`J${hRow + 2}`).value = '';
      ws.getCell(`J${hRow + 2}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      ws.getCell(`J${hRow + 2}`).border = allBorders;

      ws.getCell(`K${hRow + 2}`).value = 'QTY';
      ws.getCell(`K${hRow + 2}`).font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: 'FF64748B' } };
      ws.getCell(`K${hRow + 2}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      ws.getCell(`K${hRow + 2}`).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getCell(`K${hRow + 2}`).border = allBorders;

      ws.getCell(`L${hRow + 2}`).value = '';
      ws.getCell(`L${hRow + 2}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      ws.getCell(`L${hRow + 2}`).border = allBorders;

      ws.getRow(hRow).height = 20;
      ws.getRow(hRow + 1).height = 4;
      ws.getRow(hRow + 2).height = 20;

      cr = hRow + 3;

      // ── Data Rows ──
      specData.forEach((d, i) => {
        const ending = d.specOpening + d.net;
        const r = cr;

        ws.getCell(`A${r}`).value = i + 1;
        ws.getCell(`A${r}`).font = { name: 'Segoe UI', size: 9, color: { argb: 'FF475569' } };
        ws.getCell(`A${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(`A${r}`).border = allBorders;

        ws.getCell(`B${r}`).value = '';
        ws.getCell(`B${r}`).border = allBorders;

        ws.getCell(`C${r}`).value = d.spec;
        ws.getCell(`C${r}`).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF0F172A' } };
        ws.getCell(`C${r}`).alignment = { vertical: 'middle' };
        ws.getCell(`C${r}`).border = allBorders;

        ws.getCell(`D${r}`).value = '';
        ws.getCell(`D${r}`).border = allBorders;

        ws.getCell(`E${r}`).value = d.specOpening;
        ws.getCell(`E${r}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
        ws.getCell(`E${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(`E${r}`).border = allBorders;

        ws.getCell(`F${r}`).value = '';
        ws.getCell(`F${r}`).border = allBorders;

        ws.getCell(`G${r}`).value = d.inTotal || '';
        ws.getCell(`G${r}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: d.inTotal > 0 ? 'FF059669' : 'FF94A3B8' } };
        ws.getCell(`G${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(`G${r}`).border = allBorders;

        ws.getCell(`H${r}`).value = '';
        ws.getCell(`H${r}`).border = allBorders;

        ws.getCell(`I${r}`).value = d.outTotal || '';
        ws.getCell(`I${r}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: d.outTotal > 0 ? 'FFDC2626' : 'FF94A3B8' } };
        ws.getCell(`I${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(`I${r}`).border = allBorders;

        ws.getCell(`J${r}`).value = '';
        ws.getCell(`J${r}`).border = allBorders;

        ws.getCell(`K${r}`).value = ending;
        ws.getCell(`K${r}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: ending >= 0 ? 'FF0F172A' : 'FFDC2626' } };
        ws.getCell(`K${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(`K${r}`).border = allBorders;

        ws.getCell(`L${r}`).value = '';
        ws.getCell(`L${r}`).border = allBorders;

        ws.getRow(r).height = 22;
        cr++;
      });
    }

    // ── Totals Row ──
    const totalIn = specData.reduce((s, d) => s + d.inTotal, 0);
    const totalOut = specData.reduce((s, d) => s + d.outTotal, 0);
    const totalEnd = opening + totalIn - totalOut;

    ws.mergeCells(`A${cr}:C${cr}`);
    const totLabel = ws.getCell(`A${cr}`);
    totLabel.value = 'TOTAL';
    totLabel.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1E293B' } };
    totLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    totLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    totLabel.border = allBorders;

    ws.getCell(`D${cr}`).border = allBorders;
    ws.getCell(`D${cr}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

    ws.getCell(`E${cr}`).value = opening;
    ws.getCell(`E${cr}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    ws.getCell(`E${cr}`).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(`E${cr}`).border = allBorders;
    ws.getCell(`E${cr}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

    ws.getCell(`F${cr}`).border = allBorders;
    ws.getCell(`F${cr}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

    ws.getCell(`G${cr}`).value = totalIn;
    ws.getCell(`G${cr}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF059669' } };
    ws.getCell(`G${cr}`).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(`G${cr}`).border = allBorders;
    ws.getCell(`G${cr}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

    ws.getCell(`H${cr}`).border = allBorders;
    ws.getCell(`H${cr}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

    ws.getCell(`I${cr}`).value = totalOut;
    ws.getCell(`I${cr}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFDC2626' } };
    ws.getCell(`I${cr}`).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(`I${cr}`).border = allBorders;
    ws.getCell(`I${cr}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

    ws.getCell(`J${cr}`).border = allBorders;
    ws.getCell(`J${cr}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

    ws.getCell(`K${cr}`).value = totalEnd;
    ws.getCell(`K${cr}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    ws.getCell(`K${cr}`).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(`K${cr}`).border = allBorders;
    ws.getCell(`K${cr}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

    ws.getCell(`L${cr}`).border = allBorders;
    ws.getCell(`L${cr}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    ws.getRow(cr).height = 24;

    cr += 2;

    // ── Footer ──
    ws.mergeCells(`A${cr}:L${cr}`);
    const footer = ws.getCell(`A${cr}`);
    footer.value = `Smart Tracking System • Printed: ${new Date().toLocaleString()}`;
    footer.font = { name: 'Segoe UI', size: 8, italic: true, color: { argb: 'FF94A3B8' } };
    footer.alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getRow(cr).height = 20;

    // ── Export ──
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const ts = `${pad(now.getMonth() + 1)}${pad(now.getDate())}${now.getFullYear()}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    saveAs(blob, `Uniform Stocks Report (${fmtStart} - ${fmtEnd}) ${ts}.xlsx`);
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
    if (dateRange.start) filtered = filtered.filter(r => new Date(r.createdAt) >= new Date(dateRange.start + 'T00:00:00'));
    if (dateRange.end) {
      const end = new Date(dateRange.end + 'T23:59:59.999');
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
          selectedRequest={selectedRequest} setSelectedRequest={setSelectedRequest}
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
          handleExportPDF={() => setIsBuildingTransmittal(true)}
          isBuildingTransmittal={isBuildingTransmittal}
          setIsBuildingTransmittal={setIsBuildingTransmittal}
          transmittalHeader={transmittalHeader}
          setTransmittalHeader={setTransmittalHeader}
          enabledSignatories={enabledSignatories}
          setEnabledSignatories={setEnabledSignatories}
          exportType={exportType}
          setExportType={setExportType}
          onConfirmExport={handleExportPDF}
          onPrintItem={handlePrintItem}
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

      {selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="bg-primary px-10 py-8 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center">
                  <ClipboardList className="mr-3 h-5 w-5" />
                  Requisition Details
                </h3>
                <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest mt-1.5">
                  {selectedRequest.user?.username || 'Unknown'} &mdash; {selectedRequest.status}
                </p>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="text-white/60 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100 custom-scrollbar">
              <div className="p-8 space-y-6 flex-1 bg-white">
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Personnel Information</h3>
                  <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-xs font-bold text-gray-500">Name</span>
                      <span className="text-xs font-black text-gray-900 uppercase">{selectedRequest.user?.username || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs font-bold text-gray-500">Role</span>
                      <span className="text-xs font-black text-gray-900 uppercase">{selectedRequest.user?.role || 'Staff Member'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs font-bold text-gray-500">Supervisor</span>
                      <span className="text-xs font-black text-gray-900 uppercase">{selectedRequest.supervisor || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Item Details</h3>
                  <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-xs font-bold text-gray-500">Item</span>
                      <span className="text-xs font-black text-gray-900 uppercase">{selectedRequest.item?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs font-bold text-gray-500">Slug</span>
                      <span className="text-xs font-black text-gray-900 font-mono">{selectedRequest.item?.slug || 'N/A'}</span>
                    </div>
                    {selectedRequest.item?.fieldValues?.slice(0, 4).map((fv: any, idx: number) => {
                      const val = fv.value;
                      const displayVal = val && typeof val === 'object' ? (val.main ?? val.qty) : val;
                      if (!displayVal) return null;
                      return (
                        <div key={idx} className="flex justify-between">
                          <span className="text-xs font-bold text-gray-500">{fv.name}</span>
                          <span className="text-xs font-black text-gray-900 uppercase">{String(displayVal)}</span>
                        </div>
                      );
                    })}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-xs font-black text-gray-500 uppercase">Quantity Requested</span>
                      <span className="text-lg font-black text-primary">{selectedRequest.qty} {selectedRequest.unit || 'pcs'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Status</h3>
                  <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                    selectedRequest.status === 'SUBMITTED' ? 'bg-orange-50 border-orange-200 text-orange-600' :
                    selectedRequest.status === 'APPROVED' ? 'bg-green-50 border-green-200 text-green-600' :
                    'bg-red-50 border-red-200 text-red-600'
                  }`}>
                    {selectedRequest.status === 'SUBMITTED' && <Clock className="h-5 w-5" />}
                    {selectedRequest.status === 'APPROVED' && <CheckCircle className="h-5 w-5" />}
                    {selectedRequest.status === 'REJECTED' && <X className="h-5 w-5" />}
                    <span className="font-black text-xs uppercase tracking-widest">{selectedRequest.status}</span>
                  </div>
                </div>

                <div className="flex justify-between text-[10px] font-bold text-gray-400">
                  <span>Requested: {new Date(selectedRequest.createdAt).toLocaleDateString()}</span>
                  <span>Updated: {new Date(selectedRequest.updatedAt).toLocaleDateString()}</span>
                </div>

                {selectedRequest.remarks && (
                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Remarks</h3>
                    <p className="text-xs text-gray-700 bg-yellow-50/50 p-4 rounded-2xl border border-yellow-100 leading-relaxed">{selectedRequest.remarks}</p>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col bg-gray-50/50 p-8">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex justify-between items-center">
                  <span>Attached Document</span>
                  {selectedRequest.attachmentUrl && (
                    <a href={selectedRequest.attachmentUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 underline text-[9px]">Open in new tab</a>
                  )}
                </h3>

                <div className="flex-1 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center min-h-[300px]">
                  {selectedRequest.attachmentUrl ? (
                    selectedRequest.attachmentUrl.toLowerCase().endsWith('.pdf') ? (
                      <iframe src={selectedRequest.attachmentUrl} className="w-full h-full border-0 min-h-[400px]" title="Attached Document" />
                    ) : (
                      <img src={selectedRequest.attachmentUrl} alt="Attached Document" className="max-w-full max-h-full object-contain p-2" />
                    )
                  ) : (
                    <div className="text-center text-gray-400 p-8">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-xs font-black uppercase tracking-widest">No document attached</p>
                    </div>
                  )}
                </div>

                {selectedRequest.imageUrl && !selectedRequest.attachmentUrl && (
                  <div className="mt-4">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center">
                      <ImageIcon className="mr-2 h-3 w-3" />
                      QR Scan Image
                    </h3>
                    <img src={selectedRequest.imageUrl} alt="QR Scan" className="max-h-48 rounded-2xl border border-gray-200 object-contain bg-white" />
                  </div>
                )}

                {selectedRequest.additionalImages && selectedRequest.additionalImages.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center">
                      <ImageIcon className="mr-2 h-3 w-3" />
                      Support Photos
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedRequest.additionalImages.map((url: string, idx: number) => (
                        <a key={idx} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-2xl border border-gray-200 overflow-hidden hover:opacity-80 transition-opacity bg-white">
                          <img src={url} alt={`Support ${idx + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `}</style>
    </div>
  );
}
