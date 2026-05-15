'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { 
  Boxes, Package, Search, Filter, ArrowRight, 
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp, History,
  TrendingDown, TrendingUp, AlertTriangle, Box,
  QrCode, Clock, User, ArrowUpRight, Check, X, Truck, Activity, FileText, Printer, LayoutGrid, Trash2, ClipboardList,
  ImageIcon, Eye, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import api from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { TableSkeleton, CardSkeleton, PageHeaderSkeleton } from '@/components/ui/LoadingSkeletons';
import { LoadingProgress, useLoadingSteps } from '@/components/ui/LoadingProgress';


export default function UnitTrackingPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'insights' | 'requisition'>('inventory');
  const [requisitionSubTab, setRequisitionSubTab] = useState<'pending' | 'history'>('pending');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [stockInLogs, setStockInLogs] = useState<any[]>([]);

  const custodianData = useMemo(() => {
    const groups: Record<string, any> = {};
    requests.filter(r => r.status === 'APPROVED').forEach(req => {
      const pName = req.item.product?.name || req.item.name;
      if (!pName || pName.trim() === '') return;
      
      const username = req.user.username;
      if (!groups[username]) {
        groups[username] = {
          username,
          items: new Set(),
          totalQty: 0,
          lastActivity: req.createdAt
        };
      }
      groups[username].items.add(pName);
      groups[username].totalQty += req.qty;
      if (new Date(req.createdAt) > new Date(groups[username].lastActivity)) {
        groups[username].lastActivity = req.createdAt;
      }
    });
    return Object.values(groups);
  }, [requests]);
  const [isBuildingTransmittal, setIsBuildingTransmittal] = useState(false);
  const [groupBySpecs, setGroupBySpecs] = useState(false);
  const [transmittalHeader, setTransmittalHeader] = useState({
    transmittalNo: `TR-UNIT-${Date.now().toString().slice(-6)}`,
    date: new Date().toLocaleDateString('en-CA'),
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
    checkedBy: true, 
    receivedBy: true, 
    approvedBy: true 
  });

  const [stockHealthRange, setStockHealthRange] = useState({ 
    start: new Date().toLocaleDateString('en-CA'),
    end: new Date().toLocaleDateString('en-CA')
  });
  const [printMode, setPrintMode] = useState<'individual' | 'health_report'>('individual');
  
  const productSummary = useMemo(() => {
    const summary: Record<string, any> = {};
    
    inventory.forEach(p => {
      const pName = p.name || 'Unnamed Product';
      if (!summary[pName]) {
        summary[pName] = {
          name: pName,
          totalInStock: 0,
          outToday: 0,
          inToday: 0,
          specs: new Set(),
          outSpecs: new Set(),
          movementBreakdown: {} as Record<string, number>,
          inBreakdown: {} as Record<string, number>,
        };
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

    // Aggregate Pull Outs
    requests.filter(r => {
      const d = new Date(r.createdAt);
      return r.status === 'APPROVED' && d >= start && d <= end;
    }).forEach(req => {
       const pName = req.item.product?.name || req.item.name;
       if (!pName || pName.trim() === '') return;
       
       if (summary[pName]) {
         summary[pName].outToday += req.qty;
         const unitField = req.item.fieldValues?.find((fv: any) => {
            const val = fv.value;
            return val && typeof val === 'object' && val.unit;
         });
         summary[pName].unit = unitField?.value?.unit || req.item.product?.unit || 'Units';
         
         const specString = req.item.fieldValues?.map((fv: any) => {
            const v = fv.value;
            const val = v && typeof v === 'object' ? (v.main ?? v.qty) : v;
            return val ? String(val) : '';
         }).filter(Boolean).sort().join(', ') || 'Standard';

         summary[pName].movementBreakdown[specString] = (summary[pName].movementBreakdown[specString] || 0) + req.qty;

         // Track the specs of this specific request for UI highlighting
         req.item.fieldValues?.forEach((fv: any) => {
           const v = fv.value;
           const val = v && typeof v === 'object' ? (v.main ?? v.qty) : v;
           if (val) summary[pName].outSpecs.add(String(val));
         });
       }
    });

    // Aggregate Stock Ins from Activity Logs
    const processedSlugs = new Set<string>();
    
    // Sort logs by date ascending to process the first entry of the day for each item first
    const sortedLogs = [...stockInLogs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    sortedLogs.forEach(log => {
      const pName = log.product?.name || log.item?.name;
      if (!pName || pName.trim() === '') return;

      const slug = log.item?.slug;
      
      // Avoid double-counting the same item (QR code) in the same period
      if (slug) {
        if (processedSlugs.has(slug)) return;
        
        // Filter: Only count as stock-in if it's a known stock-in action OR an UPDATE that assigned a name for the first time
        const isKnownStockIn = ['STOCK_IN', 'SUBMIT_CONTENT', 'CREATE_ITEM'].includes(log.action);
        const isInitialAssignment = log.action === 'UPDATE_ITEM' && log.changes?.name?.old === null;
        
        if (!isKnownStockIn && !isInitialAssignment) return;
        processedSlugs.add(slug);
      }
      
      // Initialize summary entry if it doesn't exist
      if (!summary[pName]) {
        summary[pName] = {
          name: pName,
          totalInStock: 0,
          outToday: 0,
          inToday: 0,
          specs: new Set(),
          outSpecs: new Set(),
          movementBreakdown: {} as Record<string, number>,
          inBreakdown: {} as Record<string, number>,
        };
      }

      const unitField = log.item?.fieldValues?.find((fv: any) => {
         const val = fv.value;
         return val && typeof val === 'object' && val.useUnitQty;
      });
      const liveQty = unitField && !isNaN(Number(unitField.value?.qty)) ? Number(unitField.value.qty) : undefined;
      
      let qty = liveQty ?? Number(log.changes?.quantity);
      if (isNaN(qty) || (liveQty === undefined && log.changes?.quantity === undefined)) {
         qty = (log.action === 'SUBMIT_CONTENT' || log.action === 'CREATE_ITEM' || log.action === 'UPDATE_ITEM' ? 1 : 0);
      }

      const unit = log.changes?.unit || log.product?.unit || log.item?.unit || 'Units';
      
      if (qty > 0) {
        summary[pName].inToday += qty;
        summary[pName].unit = unit; 
        
        const specString = log.item?.fieldValues?.map((fv: any) => {
           const v = fv.value;
           const val = v && typeof v === 'object' ? (v.main ?? v.qty) : v;
           return val ? String(val) : '';
        }).filter(Boolean).sort().join(', ') || 'Standard';

        summary[pName].inBreakdown[specString] = (summary[pName].inBreakdown[specString] || 0) + qty;
        
        // Add specs to the main specs set so they show up in the table
        log.item?.fieldValues?.forEach((fv: any) => {
           const v = fv.value;
           const val = v && typeof fv.value === 'object' ? (v.main ?? v.qty) : v;
           if (val) summary[pName].specs.add(String(val));
        });
      }
    });

    return Object.values(summary);
  }, [inventory, requests, stockInLogs, stockHealthRange]);
  
  const [logSearch, setLogSearch] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [viewingLog, setViewingLog] = useState<any>(null);
  const [viewingStockDetail, setViewingStockDetail] = useState<any>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [productFilters, setProductFilters] = useState<Record<string, Record<string, string>>>({});

  

  const [page, setPage] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);
  const [invPage, setInvPage] = useState(1);
  const [invTotal, setInvTotal] = useState(0);
  const pageSize = 100;
  const debouncedLogSearch = useDebounce(logSearch, 300);
  const debouncedInventorySearch = useDebounce(searchTerm, 300);

  const { steps, setStepDone, setStepLabel } = useLoadingSteps([
    'Fetching pull-out requests',
    'Loading inventory'
  ]);

  useEffect(() => {
    const loadAll = async () => {
      if (isFirstLoad.current) setLoading(true);
      const startTime = Date.now();
      await Promise.all([fetchRequests(), fetchInventory(), fetchStockInLogs()]);
      const elapsed = Date.now() - startTime;
      
      if (isFirstLoad.current) {
        if (elapsed < 1800) {
          await new Promise(resolve => setTimeout(resolve, 1800 - elapsed));
        }
        setLoading(false);
        isFirstLoad.current = false;
      }
    };
    loadAll();

    const user = localStorage.getItem('username');
    if (user) {
      setTransmittalHeader(prev => ({ ...prev, preparedBy: user }));
    }
  }, [invPage, page, debouncedLogSearch, debouncedInventorySearch]);

  const fetchRequests = async () => {
    try {
      const skip = (page - 1) * pageSize;
      const res = await api.get('/pull-out-requests', { params: { skip, take: pageSize, search: debouncedLogSearch } });
      console.log('Fetched Requests:', res.data.data);
      setRequests(res.data.data);
      setTotalRequests(res.data.total);
      setStepDone('Fetching pull-out requests');
    } catch (err) {
      console.error('Failed to fetch pull out requests', err);
    }
  };

  const fetchInventory = async () => {
    try {
      const skip = (invPage - 1) * pageSize;
      const res = await api.get('/items/unit-inventory', { params: { skip, take: pageSize, search: debouncedInventorySearch } });
      console.log('Unit Inventory Data:', res.data);
      setInventory(res.data.data || []);
      setInvTotal(res.data.total || 0);
      setStepDone('Loading inventory');
    } catch (err) {
      console.error('Failed to fetch unit inventory', err);
    }
  };

  const fetchStockInLogs = async () => {
    try {
      const res = await api.get('/logs', { 
        params: { 
          action: 'STOCK_IN,SUBMIT_CONTENT,CREATE_ITEM,UPDATE_ITEM', 
          startDate: stockHealthRange.start, 
          endDate: stockHealthRange.end,
          take: 10000 
        } 
      });
      setStockInLogs(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch stock in logs', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'insights') {
      fetchStockInLogs();
    }
  }, [stockHealthRange, activeTab]);

  useEffect(() => {
    setPage(1);
  }, [debouncedLogSearch]);

  useEffect(() => {
    setInvPage(1);
  }, [debouncedInventorySearch]);

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this pull-out? It will deduct stock immediately.')) return;
    setProcessingId(id);
    try {
      await api.patch(`/pull-out-requests/${id}/approve`);
      await Promise.all([fetchRequests(), fetchInventory()]);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Reject this pull-out request?')) return;
    setProcessingId(id);
    try {
      await api.patch(`/pull-out-requests/${id}/reject`);
      await fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedRequestIds.length === 0) return;
    if (!confirm(`Are you sure you want to approve ${selectedRequestIds.length} requests?`)) return;
    
    setProcessingId('bulk');
    try {
      await api.post('/pull-out-requests/bulk-approve', { ids: selectedRequestIds });
      setSelectedRequestIds([]);
      await Promise.all([fetchRequests(), fetchInventory()]);
    } catch (err: any) {
      alert('Failed to process bulk approval');
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkReject = async () => {
    if (selectedRequestIds.length === 0) return;
    if (!confirm(`Are you sure you want to reject ${selectedRequestIds.length} requests?`)) return;
    
    setProcessingId('bulk');
    try {
      await api.post('/pull-out-requests/bulk-reject', { ids: selectedRequestIds });
      setSelectedRequestIds([]);
      await fetchRequests();
    } catch (err: any) {
      alert('Failed to process bulk rejection');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm('Are you sure you want to delete this log entry? This will not revert stock.')) return;
    try {
      await api.delete(`/pull-out-requests/${id}`);
      await fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete log entry');
    }
  };

  const totalUnitsAvailable = useMemo(() => 
    inventory.reduce((acc, p) => acc + p.totalQty, 0), 
    [inventory]
  );
  const lowStockItems = useMemo(() => 
    inventory.flatMap(p => p.items.filter((item: any) => item.qty <= (item.threshold || 0))),
    [inventory]
  );


  const toggleRequestSelection = (id: string) => {
    setSelectedRequestIds(prev => 
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };

  const handlePrintTransmittal = () => {
    window.print();
  };


   const filteredInventory = searchTerm 
    ? inventory.filter(p => 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : inventory;

  const toggleFilter = (productName: string, specKey: string, specValue: string) => {
    setProductFilters(prev => {
      const currentProductFilters = prev[productName] || {};
      const newFilters = { ...currentProductFilters };
      
      if (newFilters[specKey] === specValue) {
        delete newFilters[specKey]; // Deselect
      } else {
        newFilters[specKey] = specValue; // Select
      }
      
      return { ...prev, [productName]: newFilters };
    });
  };

  const getFilteredQty = (product: any) => {
    const filters = productFilters[product.name] || {};
    if (Object.keys(filters).length === 0) return product.totalQty;
    
    return product.items
      .filter((item: any) => {
        return Object.entries(filters).every(([fKey, fVal]) => {
          return item.fieldValues.some((fv: any) => {
            if (fv.name !== fKey) return false;
            const val = fv.value;
            if (val && typeof val === 'object' && val.useUnitQty) {
              return String(val.main || '') === fVal;
            }
            return String(val) === fVal;
          });
        });
      })
      .reduce((sum: number, item: any) => sum + item.qty, 0);
  };

  const getGroupedRequests = () => {
    let filtered = requests;

    // Filtering is handled server-side

    // Apply date range filter
    if (dateRange.start) {
      filtered = filtered.filter(r => new Date(r.createdAt) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => new Date(r.createdAt) <= end);
    }

    // Filter by sub-tab (Pending vs History)
    if (activeTab === 'requisition') {
      if (requisitionSubTab === 'pending') {
        filtered = filtered.filter(r => r.status === 'SUBMITTED');
      } else {
        filtered = filtered.filter(r => r.status !== 'SUBMITTED');
      }
    }

    if (!groupBySpecs) return filtered;

    const groups: Record<string, any> = {};
    
    filtered.forEach(req => {
      // Create a unique key based on name and all field values
      const specKey = `${req.item.name || 'Unnamed'}-${req.item.fieldValues?.map((fv: any) => fv.value).join('|')}`;
      
      if (!groups[specKey]) {
        groups[specKey] = {
          ...req,
          ids: [req.id],
          totalQty: req.qty,
          itemsCount: 1,
          slugs: [req.item.slug],
          isGrouped: true
        };
      } else {
        groups[specKey].ids.push(req.id);
        groups[specKey].totalQty += req.qty;
        groups[specKey].itemsCount += 1;
        if (!groups[specKey].slugs.includes(req.item.slug)) {
          groups[specKey].slugs.push(req.item.slug);
        }
      }
    });

    return Object.values(groups);
  };

  const displayRequests = getGroupedRequests();

  const totalStock = totalUnitsAvailable;
  const totalProducts = inventory.length;
  const totalQRs = inventory.reduce((acc, p) => acc + p.items.length, 0);

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Smarttracking System';
    workbook.lastModifiedBy = 'Smarttracking System';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet('Transmittal Report', {
      pageSetup: { 
        paperSize: 9, 
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
        printTitlesRow: '9:9'
      },
      headerFooter: {
        oddFooter: '&LPage &P of &N &RGenerated on &D &T | Smarttracking System'
      },
      views: [{ state: 'frozen', ySplit: 9 }]
    });

    // 1. Report Header (Title)
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'UNIFORM STOCK REPORT';
    titleCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF0F172A' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
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
    sheet.mergeCells('A8:F8');
    const tableTitle = sheet.getCell('A8');
    tableTitle.value = 'STOCK MOVEMENT';
    tableTitle.font = { bold: true, size: 11, name: 'Arial', color: { argb: 'FF1E293B' } };
    tableTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    sheet.getRow(8).height = 25;

    // 4. Data Table
    const headerRow = sheet.getRow(9);
    headerRow.values = ['Product Reference', 'Starting Stock', 'Stock In (+)', 'Stock Out (-)', 'Resulting Stock', 'Movement Breakdown'];
    headerRow.height = 30;
    headerRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Arial' };
      
      // Professional color-coded headers base on reference
      let bgColor = 'FF334155'; // Default Slate
      if (colNumber === 3) bgColor = 'FF065F46'; // Stock In - Green
      if (colNumber === 4) bgColor = 'FF991B1B'; // Stock Out - Red
      if (colNumber === 5) bgColor = 'FF1E40AF'; // Resulting Stock - Blue

      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });


    const dataRows = productSummary
      .filter(item => item.inToday > 0 || item.outToday > 0)
      .map(item => {
        const outBreakdown = Object.entries(item.movementBreakdown)
          .map(([spec, qty]) => `${spec}: -${qty}`)
          .join(' | ');
        
        const inBreakdown = Object.entries(item.inBreakdown)
          .map(([spec, qty]) => `${spec}: +${qty}`)
          .join(' | ');
          
        return [
          item.name,
          item.totalInStock + item.outToday - item.inToday,
          item.inToday,
          -item.outToday,
          item.totalInStock,
          [inBreakdown, outBreakdown].filter(Boolean).join(' || ') || 'No Movement'
        ];
      });

    dataRows.forEach((row, i) => {
      const excelRow = sheet.addRow(row);
      excelRow.height = 25;
      excelRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 || colNumber === 6 ? 'left' : 'right' };
        
        // Full borders for a clean table look
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        
        // Product Reference bold
        if (colNumber === 1) {
          cell.font = { bold: true, name: 'Arial', size: 10 };
          cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        }
        
        // Stock Out Red if negative
        if (colNumber === 4 && typeof cell.value === 'number' && cell.value < 0) {
          cell.font = { color: { argb: 'FFEF4444' }, bold: true, name: 'Arial' };
        }

        // Stock In Bold Green-ish (Blue-ish in current palette)
        if (colNumber === 3 && typeof cell.value === 'number' && cell.value > 0) {
          cell.font = { color: { argb: 'FF2563EB' }, bold: true, name: 'Arial' };
        }

        // Breakdown wrapping
        if (colNumber === 6) {
          cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left', indent: 1 };
          const lineCount = Math.max(1, String(cell.value).split('|').length);
          excelRow.height = Math.max(25, lineCount * 15);
        }

        // Alternating row colors
        if (i % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
      });
    });

    // Enable Autofilter
    sheet.autoFilter = {
      from: 'A9',
      to: {
        row: 9,
        column: 5
      }
    };

    // Conditional Formatting for Resulting Stock
    const lastDataRow = 9 + dataRows.length;
    if (dataRows.length > 0) {
      sheet.addConditionalFormatting({
        ref: `E10:E${lastDataRow}`,
        rules: [
          {
            priority: 1,
            type: 'cellIs',
            operator: 'lessThan',
            formulae: ['20'],
            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFEE2E2' } }, font: { color: { argb: 'FF991B1B' }, bold: true } }
          }
        ]
      });
    }


    // 5. Signatories Section
    let currentSigRow = lastDataRow + 3;
    sheet.getCell(`A${currentSigRow}`).value = 'SIGNATORIES';
    sheet.getCell(`A${currentSigRow}`).font = { bold: true, size: 11, name: 'Aptos' };
    sheet.getRow(currentSigRow).height = 25;
    
    currentSigRow += 2;
    const signatories = ['preparedBy', 'checkedBy', 'receivedBy', 'approvedBy'].filter(f => (enabledSignatories as any)[f]);
    
    // Group signatories in pairs
    for (let i = 0; i < signatories.length; i += 2) {
      const sig1 = signatories[i];
      const sig2 = signatories[i + 1];
      
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
    sheet.getColumn(2).width = 15; // Starting
    sheet.getColumn(3).width = 15; // In
    sheet.getColumn(4).width = 15; // Out
    sheet.getColumn(5).width = 15; // Resulting
    sheet.getColumn(6).width = 65; // Breakdown

    // Remove Gridlines for a cleaner look
    sheet.views = [{ ...sheet.views[0], showGridLines: false }];

    // Generate Buffer and Save
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${transmittalHeader.transmittalNo}_Transmittal_Report.xlsx`);
    setIsBuildingTransmittal(false);
  };

  if (loading) {
    return (
      <div className="space-y-10 animate-in fade-in duration-300">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <LoadingProgress 
          steps={steps}
          title="Loading Dashboard"
          showPercentage={true}
        />
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden mt-8">
           <div className="px-8 py-6 border-b border-gray-100 flex gap-4">
             <div className="h-10 w-32 bg-gray-100 rounded-xl animate-pulse" />
             <div className="h-10 w-32 bg-gray-100 rounded-xl animate-pulse" />
           </div>
           <table className="w-full">
             <tbody>
               <TableSkeleton columns={6} rows={5} />
             </tbody>
           </table>
        </div>
         </div>
    );
  }


  return (
    <div className="space-y-10 animate-in fade-in duration-700 print:space-y-0">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 print:hidden">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-4">Unit Tracking Hub</h1>
          <div className="flex items-center gap-2 mb-2">
             <button 
               onClick={() => setActiveTab('inventory')}
               className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-900 bg-gray-50'}`}
             >
               Detailed List
             </button>
             <button 
                onClick={() => setActiveTab('insights')}
                className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'insights' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-900 bg-gray-50'}`}
              >
                Insights & Audit
              </button>
             <button 
               onClick={() => setActiveTab('requisition')}
               className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'requisition' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-900 bg-gray-50'}`}
             >
               Unit Requisition (QR)
             </button>
          </div>
          
          {activeTab === 'requisition' && (
            <div className="flex items-center gap-4 mt-4 animate-in fade-in slide-in-from-left-4 duration-300">
               <button 
                 onClick={() => setRequisitionSubTab('pending')}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${requisitionSubTab === 'pending' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
               >
                 <Clock className="h-3 w-3" /> Pending ({requests.filter(r => r.status === 'SUBMITTED').length})
               </button>
               <button 
                 onClick={() => setRequisitionSubTab('history')}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${requisitionSubTab === 'history' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
               >
                 <History className="h-3 w-3" /> Release History
               </button>
            </div>
          )}
          <p className="text-gray-500 font-medium">Live sub-inventory of all QR-tracked units and stock levels.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end px-6 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Total Units</span>
            <span className="text-2xl font-black text-gray-900 leading-none">{totalStock.toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-end px-6 py-3 bg-gray-900 rounded-2xl shadow-xl shadow-gray-900/10">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Active QRs</span>
            <span className="text-2xl font-black text-white leading-none">{totalQRs.toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      {/* Pending Approvals Section */}
      {requests.filter(r => r.status === 'SUBMITTED').length > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-[2.5rem] p-8 space-y-6 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-orange-600/10 rounded-2xl flex items-center justify-center">
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Pending Approvals</h2>
                <p className="text-xs font-bold text-orange-600/60 uppercase tracking-widest">New bulk requisitions waiting for final sign-off</p>
              </div>
            </div>
            <span className="px-4 py-1.5 bg-orange-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest animate-pulse">
              {requests.filter(r => r.status === 'SUBMITTED').length} Action Required
            </span>
          </div>

          {selectedRequestIds.length > 0 && (
            <div className="flex items-center justify-between bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-orange-200 shadow-lg animate-in slide-in-from-bottom-2 duration-300">
               <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-orange-600 text-white rounded-lg flex items-center justify-center font-black text-xs">
                    {selectedRequestIds.length}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest leading-none">Items Selected</span>
                    <button 
                      onClick={() => setSelectedRequestIds([])}
                      className="text-[9px] font-bold text-gray-400 hover:text-orange-600 uppercase underline text-left"
                    >
                      Clear Selection
                    </button>
                  </div>
               </div>
               <div className="flex gap-2">
                  <button 
                    onClick={handleBulkReject}
                    disabled={processingId === 'bulk'}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-50"
                  >
                    {processingId === 'bulk' ? (
                      <>
                        <div className="h-3 w-3 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Reject Selected'
                    )}
                  </button>
                  <button 
                    onClick={handleBulkApprove}
                    disabled={processingId === 'bulk'}
                    className="flex items-center gap-2 px-6 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    {processingId === 'bulk' ? (
                      <>
                        <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Approve Selected'
                    )}
                  </button>
               </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.filter(r => r.status === 'SUBMITTED').map((req) => (
              <div 
                key={req.id} 
                onClick={() => toggleRequestSelection(req.id)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setViewingLog(req);
                }}
                className={`relative bg-white p-6 rounded-3xl border transition-all group cursor-pointer select-none overflow-hidden ${selectedRequestIds.includes(req.id) ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-orange-100'} ${processingId === req.id ? 'opacity-70 pointer-events-none' : ''}`}
                title="Click to select | Double-click for details"
              >
                {selectedRequestIds.includes(req.id) && (
                  <div className="absolute top-0 right-0 p-2 z-20">
                    <div className="h-6 w-6 bg-orange-600 text-white rounded-bl-xl flex items-center justify-center shadow-lg animate-in zoom-in duration-200">
                      <Check className="h-4 w-4" />
                    </div>
                  </div>
                )}

                {processingId === req.id && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Processing...</span>
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center group-hover:bg-orange-50 transition-colors border border-gray-100">
                      {req.imageUrl ? (
                        <img src={req.imageUrl} className="w-full h-full object-cover" alt="Attached" />
                      ) : (
                        <Truck className="h-5 w-5 text-gray-400 group-hover:text-orange-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Item Reference</p>
                      <p className="text-sm font-black text-gray-900 uppercase truncate">
                         {req.item.product?.name || req.item.name || 'Unnamed Item'}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5 max-w-[200px]">
                         {req.item.fieldValues && req.item.fieldValues.length > 0 ? 
                           req.item.fieldValues.map((fv: any) => {
                             const v = fv.value;
                             const val = v && typeof v === 'object' ? (v.main ?? v.qty) : v;
                             return val ? `${fv.field?.name || 'Spec'}: ${val}` : '';
                           }).filter(Boolean).join(', ')
                           : <span className="italic text-gray-400">No specifications</span>
                         }
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-mono font-bold text-gray-400">QR: {req.item.slug}</span>
                        {(req.attachmentUrl || (req.additionalImages && req.additionalImages.length > 0)) && (
                          <span className="text-[8px] font-black text-orange-600 uppercase flex items-center gap-1">
                            <ImageIcon className="h-2 w-2" /> Has Attachments
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-0.5">Qty to Release</p>
                    <p className="text-xl font-black text-gray-900 tracking-tighter">
                      {req.qty} <span className="text-[10px] text-gray-400 uppercase">{req.unit}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex flex-col">
                    <p className="text-[9px] font-black text-gray-400 uppercase">Requested By</p>
                    <p className="text-xs font-bold text-gray-700">{req.user.username}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleReject(req.id)}
                      className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"
                      title="Reject Request"
                    >
                      <X className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => handleApprove(req.id)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-orange-600 transition-all shadow-lg active:scale-95"
                    >
                      <Check className="h-4 w-4" /> Approve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 print:space-y-0">
           {/* Simple Stats Row */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl flex items-center gap-6">
                 <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                    <Boxes className="h-8 w-8" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Items In Stock</p>
                    <p className="text-3xl font-black text-gray-900 tracking-tighter">{totalUnitsAvailable.toLocaleString()} Units</p>
                 </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl flex items-center gap-6">
                 <div className="h-16 w-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
                    <ArrowUpRight className="h-8 w-8" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                      Movement from {new Date(stockHealthRange.start).toLocaleDateString()} to {new Date(stockHealthRange.end).toLocaleDateString()}
                    </p>
                    <p className="text-3xl font-black text-gray-900 tracking-tighter">
                      {requests.filter(r => {
                        const d = new Date(r.createdAt);
                        return r.status === 'APPROVED' && d >= new Date(stockHealthRange.start) && d <= new Date(stockHealthRange.end + 'T23:59:59');
                      }).reduce((acc, curr) => acc + curr.qty, 0).toLocaleString()} Units
                    </p>
                 </div>
              </div>
           </div>

           {/* Simple Stock Master Table */}
           <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden print:shadow-none print:border-none print:rounded-none">
              
              {/* PRINT ONLY HEADER */}
              <div className="hidden print:block mb-8">
                 <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Summary</h1>
                 <h2 className="text-lg font-bold text-gray-700 uppercase tracking-widest mt-1">Master Stock Health Report</h2>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                    Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                 </p>
                 <div className="w-full h-px bg-gray-900 mt-4 mb-2"></div>
              </div>

              <div className="p-8 border-b border-gray-50 flex items-center justify-between print:hidden">
                 <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Master Stock Health</h2>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Aggregated by Reference Name</p>
                 </div>
                   <div className="flex items-center gap-3">
                   <div className="flex items-center gap-4 bg-gray-50 px-5 py-2.5 rounded-2xl border border-gray-100 shadow-sm">
                     <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-gray-400 uppercase">From:</span>
                        <input 
                          type="date" 
                          value={stockHealthRange.start}
                          onChange={e => setStockHealthRange({...stockHealthRange, start: e.target.value})}
                          className="bg-transparent border-none text-[11px] font-black uppercase outline-none focus:text-primary transition-colors"
                        />
                     </div>
                     <div className="h-4 w-[1px] bg-gray-200" />
                     <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-gray-400 uppercase">To:</span>
                        <input 
                          type="date" 
                          value={stockHealthRange.end}
                          onChange={e => setStockHealthRange({...stockHealthRange, end: e.target.value})}
                          className="bg-transparent border-none text-[11px] font-black uppercase outline-none focus:text-primary transition-colors"
                        />
                     </div>
                   </div>
                   <button 
                      onClick={() => {
                        setPrintMode('health_report');
                        setIsBuildingTransmittal(true);
                      }}
                      className="p-3.5 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-all shadow-lg shadow-green-600/10 active:scale-95 flex items-center gap-2 px-6"
                      title="Configure and Export to Excel"
                   >
                      <FileSpreadsheet className="h-5 w-5" />
                      <span className="text-xs font-black uppercase tracking-widest">Build & Export Excel</span>
                   </button>
                 </div>
              </div>

              <div className="overflow-x-auto">
                 <table className="w-full text-left print:border-collapse">
                    <thead>
                       <tr className="bg-gray-50/50 print:bg-transparent print:border-b-2 print:border-gray-900">
                          <th className="px-8 py-4 print:px-2 print:py-2 text-[10px] font-black text-gray-400 print:text-gray-900 uppercase tracking-widest">Actual Item (Reference)</th>
                          <th className="px-8 py-4 print:px-2 print:py-2 text-[10px] font-black text-gray-400 print:text-gray-900 uppercase tracking-widest">Specifications</th>
                          <th className="px-8 py-4 print:px-2 print:py-2 text-[10px] font-black text-gray-400 print:text-gray-900 uppercase tracking-widest text-center">Starting Stock</th>
                          <th className="px-8 py-4 print:px-2 print:py-2 text-[10px] font-black text-gray-400 print:text-gray-900 uppercase tracking-widest text-center">Stock In (+)</th>
                          <th className="px-8 py-4 print:px-2 print:py-2 text-[10px] font-black text-gray-400 print:text-gray-900 uppercase tracking-widest text-center">Stock Out (-)</th>
                          <th className="px-8 py-4 print:px-2 print:py-2 text-[10px] font-black text-gray-400 print:text-gray-900 uppercase tracking-widest text-center">Resulting Stock</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 print:divide-gray-300">
                       {productSummary.map((item: any) => (
                          <tr 
                             key={item.name} 
                             onDoubleClick={() => setViewingStockDetail(item)}
                             className="hover:bg-gray-50/30 transition-colors cursor-pointer print:break-inside-avoid group"
                             title="Double-click to view movement details"
                          >
                             <td className="px-8 py-6 print:px-2 print:py-3 align-top">
                                <span className="text-sm print:text-xs font-black text-gray-900 uppercase">{item.name}</span>
                             </td>
                             <td className="px-8 py-6 print:px-2 print:py-3 align-top">
                                <div className="flex flex-wrap gap-1 print:hidden">
                                   {Array.from(item.specs).slice(0, 8).map((spec: any, i) => {
                                      const isMoved = item.outSpecs?.has(spec);
                                      return (
                                         <span 
                                           key={i} 
                                           className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${
                                             isMoved 
                                               ? 'bg-orange-500 text-white shadow-sm ring-2 ring-orange-500/20' 
                                               : 'bg-gray-100 text-gray-500'
                                           }`}
                                         >
                                            {spec}
                                         </span>
                                      );
                                   })}
                                   {item.specs.size > 8 && (
                                      <span className="text-[9px] font-bold text-gray-400">+{item.specs.size - 8} more specs</span>
                                   )}
                                   {item.specs.size === 0 && <span className="text-[9px] text-gray-300 italic">No specs listed</span>}
                                </div>
                                <div className="hidden print:block text-[10px] font-bold text-gray-600 max-w-md">
                                   {item.specs.size > 0 ? Array.from(item.specs).join(', ') : <span className="italic text-gray-400">No specifications</span>}
                                </div>
                             </td>
                             <td className="px-8 py-6 print:px-2 print:py-3 text-center align-top">
                                <div className="flex flex-col items-center">
                                   <span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Starting</span>
                                   <span className="text-sm print:text-xs font-black text-gray-900">
                                      {(item.totalInStock + item.outToday - item.inToday).toLocaleString()} 
                                      <span className="ml-1 text-[10px] text-gray-400 font-bold">{item.unit || 'Units'}</span>
                                   </span>
                                </div>
                             </td>
                             <td className="px-8 py-6 print:px-2 print:py-3 text-center align-top">
                                <div className="flex flex-col items-center">
                                   <span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1 text-green-600">Stock In</span>
                                   <span className={`text-sm print:text-xs font-black ${item.inToday > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                                      {item.inToday > 0 ? `+${item.inToday.toLocaleString()}` : '0'}
                                      {item.inToday > 0 && <span className="ml-1 text-[10px] opacity-70 font-bold">{item.unit || 'Units'}</span>}
                                   </span>
                                </div>
                             </td>
                             <td className="px-8 py-6 print:px-2 print:py-3 text-center align-top">
                                <div className="flex flex-col items-center">
                                   <span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1 text-orange-600">Stock Out</span>
                                   <span className={`text-sm print:text-xs font-black ${item.outToday > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
                                      {item.outToday > 0 ? `-${item.outToday.toLocaleString()}` : '0'}
                                      {item.outToday > 0 && <span className="ml-1 text-[10px] opacity-70 font-bold">{item.unit || 'Units'}</span>}
                                   </span>
                                </div>
                             </td>
                             <td className="px-8 py-6 print:px-2 print:py-3 text-center align-top bg-gray-50/50 rounded-r-2xl">
                                <div className="flex flex-col items-center">
                                   <span className="text-[10px] font-black text-primary uppercase leading-none mb-1">Resulting</span>
                                   <span className="text-sm print:text-xs font-black text-gray-900">
                                      {item.totalInStock.toLocaleString()}
                                      <span className="ml-1 text-[10px] text-gray-400 font-bold">{item.unit || 'Units'}</span>
                                   </span>
                                </div>
                             </td>
                          </tr>
                       ))}
                       {productSummary.length === 0 && (
                          <tr>
                             <td colSpan={4} className="py-20 text-center text-gray-400 font-medium italic print:py-8">
                                No items found in stock records.
                             </td>
                          </tr>
                       )}
                    </tbody>
                 </table>
              </div>

              {/* PRINT ONLY FOOTER */}
              <div className="hidden print:flex justify-between items-end mt-16 pt-8 break-inside-avoid">
                 <div className="w-1/3 text-center">
                    <div className="border-t border-gray-900 pt-2 mx-8">
                       <p className="text-[10px] font-black uppercase tracking-widest text-gray-900">Prepared By</p>
                       <p className="text-[9px] text-gray-500 mt-1">Signature over printed name</p>
                    </div>
                 </div>
                 <div className="w-1/3 text-center">
                    <div className="border-t border-gray-900 pt-2 mx-8">
                       <p className="text-[10px] font-black uppercase tracking-widest text-gray-900">Checked By</p>
                       <p className="text-[9px] text-gray-500 mt-1">Signature over printed name</p>
                    </div>
                 </div>
                 <div className="w-1/3 text-center">
                    <div className="border-t border-gray-900 pt-2 mx-8">
                       <p className="text-[10px] font-black uppercase tracking-widest text-gray-900">Date</p>
                    </div>
                 </div>
              </div>

           </div>

           {/* Recent Activity Log */}
           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6 print:hidden">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Recent Movement Log</h2>
              <div className="space-y-3">
                 {requests.filter(r => r.status === 'APPROVED').slice(0, 5).map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-50">
                       <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${req.qty > 0 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                             {req.qty > 0 ? <ArrowUpRight className="h-5 w-5" /> : <Box className="h-5 w-5" />}
                          </div>
                          <div>
                             <p className="text-sm font-black text-gray-900">{req.item.product?.name || req.item.name}</p>
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString()} • {req.user.username}
                             </p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-sm font-black text-gray-900">-{req.qty} Units</p>
                          <p className="text-[9px] font-mono font-bold text-gray-400 uppercase">{req.item.slug}</p>
                       </div>
                    </div>
                 ))}
                 {requests.filter(r => r.status === 'APPROVED').length === 0 && (
                    <p className="text-center py-10 text-gray-400 font-medium italic">No movements recorded yet.</p>
                 )}
              </div>
           </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Control Bar */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search items by product name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 py-5 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium text-gray-900"
              />
            </div>
            <button className="p-5 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm hover:bg-gray-50 transition-all">
              <Filter className="h-6 w-6 text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {filteredInventory.filter(product => product.name && product.name !== 'Unnamed Product').map((product, idx) => (
          <div 
            key={product.name}
            className="group relative bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden transition-all hover:shadow-2xl hover:shadow-primary/5"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            
            <div className="p-8">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <Box className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">{product.name}</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{product.unit}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className="block text-[10px] font-black text-primary uppercase tracking-widest mb-1">
                    {Object.keys(productFilters[product.name] || {}).length > 0 ? 'Filtered Stock' : 'Live Stock'}
                  </span>
                  <span className={`text-3xl font-black tracking-tighter leading-none transition-all ${Object.keys(productFilters[product.name] || {}).length > 0 ? 'text-blue-600' : 'text-gray-900'}`}>
                    {getFilteredQty(product)}
                  </span>
                  {Object.keys(productFilters[product.name] || {}).length > 0 && (
                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">of {product.totalQty} total</p>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-gray-50 rounded-full overflow-hidden mb-8 border border-gray-100/50">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-1000 ease-out" 
                  style={{ width: `${Math.min(100, (product.totalQty / 100) * 100)}%` }}
                />
              </div>

              {/* Quick Summary */}
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                <div className="flex items-center gap-2">
                  <QrCode className="h-3 w-3" />
                  <span>{product.items.length} Linked QR Codes</span>
                </div>
                <button 
                  onClick={() => setExpandedProduct(expandedProduct === product.name ? null : product.name)}
                  className="flex items-center gap-1 text-primary hover:underline transition-all"
                >
                  View Details {expandedProduct === product.name ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>

              {/* Expanded content */}
              {expandedProduct === product.name && (
                <div className="mt-8 pt-8 border-t border-gray-100 animate-in slide-in-from-top-4 duration-300">
                  {/* Group Specs Summary */}
                  {product.specs && (
                    <div className="mb-8 grid grid-cols-2 gap-y-6 gap-x-4 border-b border-orange-100/30 pb-8">
                      {Object.entries(product.specs).map(([key, values]: [string, any]) => (
                        <div key={key} className="animate-in fade-in slide-in-from-left-2 duration-500">
                          <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{key}</span>
                          <div className="flex flex-wrap gap-1">
                            {values.map((val: string, i: number) => {
                              const isActive = (productFilters[product.name]?.[key] === val);
                              return (
                                <button 
                                  key={i} 
                                  onClick={() => toggleFilter(product.name, key, val)}
                                  className={`text-sm font-black px-3 py-1 rounded-lg transition-all ${
                                    isActive 
                                      ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105' 
                                      : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
                                  }`}
                                >
                                  {val}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-4">QR Reference Breakdown</p>
                  <div className="grid grid-cols-1 gap-2">
                    {product.items.map((item: any) => {
                      const isLowStock = item.qty <= (item.threshold || 0);
                      return (
                        <div 
                          key={item.slug}
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all group/row ${
                            isLowStock 
                              ? 'bg-red-50 border-red-200 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                              : 'bg-gray-50/50 border-gray-100/50 hover:bg-white hover:border-primary/20'
                          } ${
                            Object.entries(productFilters[product.name] || {}).every(([fKey, fVal]) => 
                              item.fieldValues.some((fv: any) => {
                                if (fv.name !== fKey) return false;
                                const val = fv.value;
                                if (val && typeof val === 'object' && val.useUnitQty) return String(val.main || '') === fVal;
                                return String(val) === fVal;
                              })
                            ) ? 'opacity-100' : 'opacity-40 grayscale-[0.5]'
                          }`}
                        >
                          <div className="flex-1 cursor-pointer" onClick={() => window.open(`/i/${item.slug}`, '_blank')}>
                            <div className="flex items-center gap-3 mb-1.5">
                              <div className="flex -space-x-2 mr-1">
                                {item.imageUrl && <img src={item.imageUrl} className="w-6 h-6 rounded-lg object-cover border-2 border-white shadow-sm" />}
                                {item.imageUrl2 && <img src={item.imageUrl2} className="w-6 h-6 rounded-lg object-cover border-2 border-white shadow-sm" />}
                                {!item.imageUrl && !item.imageUrl2 && (
                                  <div className={`w-2 h-2 rounded-full ${isLowStock ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`} />
                                )}
                              </div>
                              <span className="text-sm font-mono font-bold text-gray-700">{item.slug}</span>
                              {item.batch && <span className="px-2 py-0.5 bg-gray-200 text-[9px] font-black rounded-md">{item.batch}</span>}
                            </div>
                          
                          {/* Form Content / Specs Breakdown */}
                          <div className="flex flex-wrap gap-2 ml-5">
                            {item.fieldValues?.map((fv: any, idx: number) => {
                              const v = fv.value as any;
                              let displayValue = '';
                              
                              if (v && typeof v === 'object') {
                                displayValue = String(v.main ?? v.qty ?? JSON.stringify(v));
                              } else {
                                displayValue = String(fv.value);
                              }

                              if (!displayValue || displayValue.trim() === '') return null;

                              return (
                                <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-100 rounded-lg shadow-sm">
                                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100 pr-1.5">{fv.name}</span>
                                  <span className="text-[10px] font-bold text-gray-800">{displayValue}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="text-right mr-2">
                              <span className={`text-sm font-black ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>{item.qty}</span>
                           </div>
                           <ArrowUpRight 
                             className="h-4 w-4 text-gray-300 group-hover/row:text-primary transition-colors cursor-pointer" 
                             onClick={() => window.open(`/i/${item.slug}`, '_blank')}
                           />
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

          {filteredInventory.length === 0 && (
            <div className="col-span-2 py-20 text-center">
              <Boxes className="h-16 w-16 text-gray-200 mx-auto mb-4" />
              <p className="text-xl font-bold text-gray-400 tracking-tight">No unit-tracked products found.</p>
              <p className="text-sm text-gray-400 mt-1">Try a different search term or check your custom fields.</p>
            </div>
          )}
        </div>

        {/* Inventory Pagination */}
        {invTotal > pageSize && (
          <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 mt-8">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Showing <span className="text-gray-900">{inventory.length}</span> of <span className="text-gray-900">{invTotal}</span> products
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setInvPage(prev => Math.max(1, prev - 1))}
                disabled={invPage === 1}
                className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="px-6 flex items-center justify-center bg-gray-900 text-white rounded-xl text-sm font-black">
                Page {invPage}
              </div>
              <button 
                onClick={() => setInvPage(prev => prev + 1)}
                disabled={invPage * pageSize >= invTotal}
                className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    )}

      {activeTab === 'requisition' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gray-50/30">
             <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <History className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Pull Out Request Log</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Historical record of all unit release actions</p>
                </div>
             </div>
             
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search log..."
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/5 transition-all w-48"
                />
              </div>

              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-100">
                <input 
                  type="date" 
                  value={dateRange.start}
                  onChange={e => setDateRange({...dateRange, start: e.target.value})}
                  className="bg-transparent border-none text-[10px] font-black uppercase outline-none px-2 py-1"
                />
                <span className="text-gray-300">/</span>
                <input 
                  type="date" 
                  value={dateRange.end}
                  onChange={e => setDateRange({...dateRange, end: e.target.value})}
                  className="bg-transparent border-none text-[10px] font-black uppercase outline-none px-2 py-1"
                />
              </div>

              <button 
                onClick={() => setGroupBySpecs(!groupBySpecs)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${groupBySpecs ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-100'}`}
              >
                <LayoutGrid className="h-4 w-4" /> {groupBySpecs ? 'Grouped' : 'Individual'}
              </button>

              {selectedRequestIds.length > 0 && (
                <button 
                  onClick={() => {
                    setPrintMode('individual');
                    setIsBuildingTransmittal(true);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 animate-in zoom-in-95"
                >
                  <FileText className="h-4 w-4" /> Build Transmittal ({selectedRequestIds.length})
                </button>
              )}
            </div>
          </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-5 w-12">
                   <input 
                    type="checkbox" 
                    onChange={(e) => {
                        if (e.target.checked) setSelectedRequestIds(requests.map(r => r.id));
                        else setSelectedRequestIds([]);
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                   />
                </th>
                <th className="px-4 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{groupBySpecs ? 'Assets' : 'Item & Specs'}</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Requester</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayRequests.map((req) => (
                <tr 
                  key={req.id} 
                  onDoubleClick={() => setViewingLog(req)}
                  className={`hover:bg-gray-50/50 transition-colors group cursor-pointer select-none ${selectedRequestIds.includes(req.id) ? 'bg-primary/5' : ''}`}
                  title="Double-click to view details"
                >
                  <td className="px-8 py-5">
                    <input 
                      type="checkbox" 
                      checked={selectedRequestIds.includes(req.id)}
                      onChange={() => toggleRequestSelection(req.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-5">
                    <p className="text-sm font-bold text-gray-700">{new Date(req.createdAt).toLocaleDateString()}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </td>
                  <td className="px-8 py-5">
                    {req.isGrouped ? (
                      <div className="space-y-1">
                        <p className="text-sm font-black text-gray-900">{req.item.name || 'Multiple Assets'}</p>
                        <p className="text-[10px] text-primary font-bold">{req.itemsCount} QRs • {req.slugs.slice(0,2).join(', ')}{req.slugs.length > 2 ? '...' : ''}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center">
                          {req.imageUrl ? (
                            <img src={req.imageUrl} className="w-full h-full object-cover" alt="Unit" />
                          ) : (
                            <Box className="h-4 w-4 text-gray-300" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-black text-gray-900 uppercase truncate">
                            {req.item.product?.name || req.item.name || 'Unnamed Item'}
                          </span>
                          <span className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[250px]">
                            {req.item.fieldValues && req.item.fieldValues.length > 0 ? 
                              req.item.fieldValues.map((fv: any) => {
                                const v = fv.value;
                                const val = v && typeof v === 'object' ? (v.main ?? v.qty) : v;
                                return val ? `${fv.field?.name || 'Spec'}: ${val}` : '';
                              }).filter(Boolean).join(', ')
                              : <span className="italic text-gray-400">No specifications</span>
                            }
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-mono font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">QR: {req.item.slug}</span>
                            {(req.attachmentUrl || (req.additionalImages && req.additionalImages.length > 0)) && (
                               <span className="text-[8px] font-black text-orange-600 uppercase flex items-center gap-1">
                                 <ImageIcon className="h-2 w-2" /> Has Attachments
                               </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-gray-900">{req.user.username}</p>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <p className="text-sm font-black text-gray-900">{req.isGrouped ? req.totalQty : req.qty}</p>
                    {req.isGrouped && <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Aggregated</p>}
                  </td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                      req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {req.status === 'PENDING' && (
                        <>
                          <button 
                            disabled={processingId === req.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(req.id);
                            }}
                            className="p-2 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-xl transition-all disabled:opacity-50"
                            title="Approve Pull-Out"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button 
                            disabled={processingId === req.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReject(req.id);
                            }}
                            className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all disabled:opacity-50"
                            title="Reject Request"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLog(req.id);
                        }}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Delete Log Entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <History className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-sm font-bold text-gray-400">No requests recorded yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )}

      {/* Transmittal Builder Overlay */}
      {isBuildingTransmittal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">
                    {printMode === 'health_report' ? 'Report Transmittal Builder' : 'Transmittal Builder'}
                  </h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {printMode === 'health_report' 
                      ? `Consolidating movement for ${productSummary.filter(p => p.outToday > 0).length} products`
                      : `Configure transmittal details for ${selectedRequestIds.length} items`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsBuildingTransmittal(false)}
                className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-10">
              {/* Header Config */}
              <div className="md:col-span-1 space-y-6">
                <h3 className="text-[10px] font-black text-primary uppercase tracking-widest">Transmittal Header</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Transmittal No</label>
                    <input 
                        type="text" 
                        value={transmittalHeader.transmittalNo}
                        onChange={e => setTransmittalHeader({...transmittalHeader, transmittalNo: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                      {printMode === 'health_report' ? 'Date Covered' : 'Date'}
                    </label>
                    {printMode === 'health_report' ? (
                      <div className="w-full px-4 py-3 bg-gray-100/50 border border-transparent rounded-xl text-sm font-black text-primary uppercase tracking-tighter">
                        {stockHealthRange.start === stockHealthRange.end 
                          ? new Date(stockHealthRange.start).toLocaleDateString(undefined, { dateStyle: 'long' })
                          : `${new Date(stockHealthRange.start).toLocaleDateString()} - ${new Date(stockHealthRange.end).toLocaleDateString()}`}
                      </div>
                    ) : (
                      <input 
                          type="date" 
                          value={transmittalHeader.date}
                          onChange={e => setTransmittalHeader({...transmittalHeader, date: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Department</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Operations - Logistics"
                        value={transmittalHeader.department}
                        onChange={e => setTransmittalHeader({...transmittalHeader, department: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Recipient / End-User</label>
                    <input 
                        type="text" 
                        placeholder="Name of recipient"
                        value={transmittalHeader.recipient}
                        onChange={e => setTransmittalHeader({...transmittalHeader, recipient: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-50 space-y-4">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-widest">Signatories</h3>
                  {['preparedBy', 'checkedBy', 'receivedBy', 'approvedBy'].map(field => (
                    <div key={field} className="group relative">
                        <div className="flex items-center justify-between mb-1.5 ml-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{field.endsWith('By') ? field.slice(0, -2) + ' By' : field}</label>
                          <input 
                            type="checkbox"
                            checked={(enabledSignatories as any)[field]}
                            onChange={e => setEnabledSignatories({...enabledSignatories, [field]: e.target.checked})}
                            className="h-3 w-3 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            title={`Enable/Disable ${field}`}
                          />
                        </div>
                        <input 
                            type="text" 
                            disabled={!(enabledSignatories as any)[field]}
                            placeholder={field === 'checkedBy' ? 'Optional' : 'Name'}
                            value={(transmittalHeader as any)[field]}
                            onChange={e => setTransmittalHeader({...transmittalHeader, [field]: e.target.value})}
                            className={`w-full px-4 py-2 border rounded-xl text-xs font-bold transition-all outline-none ${
                              (enabledSignatories as any)[field] 
                                ? 'bg-gray-50 border-gray-100 text-gray-900 focus:bg-white focus:ring-4 focus:ring-primary/5' 
                                : 'bg-gray-100/50 border-transparent text-gray-400 cursor-not-allowed opacity-50'
                            }`}
                        />
                    </div>
                  ))}

                  <div className="pt-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Remarks</label>
                    <textarea 
                        placeholder="Additional notes..."
                        value={transmittalHeader.remarks}
                        onChange={e => setTransmittalHeader({...transmittalHeader, remarks: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none h-20 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Items Preview */}
              <div className="md:col-span-2 space-y-6">
                <h3 className="text-[10px] font-black text-primary uppercase tracking-widest">Selected Items Breakdown</h3>
                <div className="border border-gray-100 rounded-3xl overflow-hidden bg-gray-50/30">
                  <table className="w-full text-left">
                    <thead className="bg-white border-b border-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">No.</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Asset ID</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Qty</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {printMode === 'individual' ? (
                        requests.filter(r => selectedRequestIds.includes(r.id)).map((req, idx) => (
                          <tr key={req.id}>
                            <td className="px-6 py-4 text-xs font-bold text-gray-400">{idx + 1}</td>
                            <td className="px-6 py-4 text-xs font-mono font-bold text-gray-900">{req.item.slug}</td>
                            <td className="px-6 py-4 text-xs font-black text-gray-900">{req.qty}</td>
                            <td className="px-6 py-4">
                              <span className="text-[9px] font-black uppercase text-gray-400">{req.status}</span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        productSummary.filter(p => p.outToday > 0).map((p, idx) => (
                          <tr key={p.name}>
                            <td className="px-6 py-4 text-xs font-bold text-gray-400">{idx + 1}</td>
                            <td className="px-6 py-4 text-xs font-bold text-gray-900 uppercase">{p.name}</td>
                            <td className="px-6 py-4 text-xs font-black text-gray-900">{p.outToday}</td>
                            <td className="px-6 py-4">
                              <span className="text-[9px] font-black uppercase text-orange-600">Report Consolidation</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                <div className="pt-6 flex justify-end gap-3">
                    <button 
                        onClick={() => {
                          setSelectedRequestIds([]);
                          if (printMode === 'health_report') setIsBuildingTransmittal(false);
                        }}
                        className="px-6 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all"
                    >
                        {printMode === 'health_report' ? 'Cancel' : 'Clear Selection'}
                    </button>
                    <button 
                        onClick={printMode === 'health_report' ? handleExportExcel : handlePrintTransmittal}
                        className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl transition-all flex items-center gap-2 ${
                          printMode === 'health_report' 
                            ? 'bg-green-600 text-white shadow-green-600/20 hover:bg-green-700' 
                            : 'bg-gray-900 text-white shadow-gray-900/20 hover:bg-primary'
                        }`}
                    >
                        {printMode === 'health_report' ? (
                          <>
                            <FileSpreadsheet className="h-4 w-4" /> Export to Excel
                          </>
                        ) : (
                          <>
                            <Printer className="h-4 w-4" /> Print Transmittal
                          </>
                        )}
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print View (Visible only during print) */}
      <div className="hidden print:block bg-white p-12 text-gray-900 h-screen">
        <div className="flex justify-between items-start border-b-4 border-gray-900 pb-8 mb-12">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 mb-1">Material Transmittal</h1>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Unit Tracking & Release Authorization</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black text-gray-400 uppercase mb-1">Transmittal No.</div>
            <div className="text-2xl font-black font-mono">{transmittalHeader.transmittalNo}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-12">
          <div className="space-y-4">
            <div><div className="text-[10px] font-black text-gray-400 uppercase mb-1">Department:</div><div className="text-lg font-bold border-b-2 border-gray-100 pb-1">{transmittalHeader.department || '____________________'}</div></div>
            <div><div className="text-[10px] font-black text-gray-400 uppercase mb-1">Recipient - End-User:</div><div className="text-lg font-bold border-b-2 border-gray-100 pb-1">{transmittalHeader.recipient || '____________________'}</div></div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-[10px] font-black text-gray-400 uppercase mb-1">Date:</div>
              <div className="text-lg font-bold border-b-2 border-gray-100 pb-1">
                {printMode === 'health_report' 
                  ? (stockHealthRange.start === stockHealthRange.end 
                      ? new Date(stockHealthRange.start).toLocaleDateString(undefined, { dateStyle: 'long' })
                      : `${new Date(stockHealthRange.start).toLocaleDateString()} - ${new Date(stockHealthRange.end).toLocaleDateString()}`)
                  : new Date(transmittalHeader.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </div>
            </div>
            <div><div className="text-[10px] font-black text-gray-400 uppercase mb-1">Prepared By:</div><div className="text-lg font-bold border-b-2 border-gray-100 pb-1">{transmittalHeader.preparedBy}</div></div>
          </div>
        </div>

        <table className="w-full border-collapse mb-12">
          <thead>
            <tr className="border-y-4 border-gray-900 bg-gray-50">
              <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest w-12">No.</th>
              <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest">{printMode === 'individual' ? 'Asset ID / Description' : 'Product / Reference'}</th>
              <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest w-32">Quantity</th>
              <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-gray-100">
            {printMode === 'individual' ? (
              requests.filter(r => selectedRequestIds.includes(r.id)).map((req, idx) => (
                <tr key={req.id}>
                  <td className="py-4 px-4 text-xs font-bold text-gray-400">{idx + 1}</td>
                  <td className="py-4 px-4 text-xs font-bold uppercase">{req.item.slug}</td>
                  <td className="py-4 px-4 text-xs font-black">{req.qty}</td>
                  <td className="py-4 px-4 text-xs italic text-gray-400">Authorized Release</td>
                </tr>
              ))
            ) : (
              productSummary.filter(p => p.outToday > 0 || p.totalInStock > 0).map((p, idx) => (
                <tr key={p.name} className="border-b border-gray-100">
                  <td className="py-4 px-4 text-[11px] font-black text-gray-900 uppercase">{p.name}</td>
                  <td className="py-4 px-4 align-top">
                    <div className="space-y-2">
                       <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest border-b border-gray-50 pb-1">Available Specs:</div>
                       <div className="flex flex-wrap gap-1">
                          {Array.from(p.specs).map((s: any, i) => (
                            <span key={i} className={`text-[8px] px-1.5 py-0.5 rounded ${p.outSpecs.has(s) ? 'bg-orange-100 text-orange-600 font-black' : 'bg-gray-50 text-gray-400 font-bold'}`}>
                               {s}
                            </span>
                          ))}
                       </div>
                       
                       {p.outToday > 0 && (
                          <div className="mt-3 pt-2 border-t border-dashed border-gray-100">
                             <div className="text-[9px] text-orange-600 font-black uppercase tracking-widest mb-1">Detailed Movement Breakdown:</div>
                             <div className="space-y-1">
                                {Object.entries(p.movementBreakdown).map(([specs, qty]: [string, any], i) => (
                                   <div key={i} className="flex justify-between items-center text-[10px] bg-orange-50/50 p-2 rounded-lg border border-orange-100/50">
                                      <span className="font-bold text-gray-700">{specs}</span>
                                      <span className="font-black text-orange-600">-{qty} units</span>
                                   </div>
                                ))}
                             </div>
                          </div>
                       )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center font-bold text-gray-500">{p.totalInStock + p.outToday}</td>
                  <td className="py-4 px-4 text-center">
                    <div className="text-sm font-black text-orange-600">-{p.outToday}</div>
                    <div className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">Consolidated</div>
                  </td>
                  <td className="py-4 px-4 text-center font-black text-gray-900">{p.totalInStock}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {transmittalHeader.remarks && (
          <div className="mb-12">
            <div className="text-[10px] font-black text-gray-400 uppercase mb-1">Remarks:</div>
            <div className="text-sm font-medium text-gray-700 whitespace-pre-wrap border-l-4 border-gray-100 pl-4 py-1">
              {transmittalHeader.remarks}
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-x-12 gap-y-16 pt-12 border-t-2 border-gray-50">
          {['preparedBy', 'checkedBy', 'receivedBy', 'approvedBy'].filter(f => (enabledSignatories as any)[f]).map(field => (
            <div key={field} className="min-w-[200px] space-y-8 flex-1">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{field.endsWith('By') ? field.slice(0, -2) + ' By' : field}:</div>
              <div className="border-b-2 border-gray-900 text-center pb-2">
                <span className="text-sm font-black uppercase">{(transmittalHeader as any)[field] || '____________________'}</span>
              </div>
              <div className="text-center text-[8px] font-bold text-gray-400 uppercase italic tracking-tighter">Signature - Date</div>
            </div>
          ))}
        </div>

        <div className="mt-20 pt-12 border-t border-dashed border-gray-200">
            <p className="text-[9px] font-medium text-gray-400 text-center uppercase tracking-widest italic">
                This material transmittal is generated automatically by the Smart Tracking System.
            </p>
        </div>
      </div>

      {/* Log Detail Modal */}
      {viewingLog && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-gray-900/20">
                  <History className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Request Details</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Historical Entry Reference</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingLog(null)}
                className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Date & Time</p>
                  <p className="text-sm font-bold text-gray-900">{new Date(viewingLog.createdAt).toLocaleDateString()}</p>
                  <p className="text-[10px] text-gray-400 font-medium">{new Date(viewingLog.createdAt).toLocaleTimeString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    viewingLog.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                    viewingLog.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {viewingLog.status}
                  </span>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-50">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Asset Information</p>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black text-gray-400 uppercase">Asset ID:</span>
                    <span className="text-sm font-mono font-bold text-primary">{viewingLog.item.slug}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black text-gray-400 uppercase">Product:</span>
                    <span className="text-sm font-bold text-gray-900 text-right">{viewingLog.item.name || viewingLog.item.product?.name || 'Unnamed Asset'}</span>
                  </div>
                  {viewingLog.item.fieldValues && viewingLog.item.fieldValues.length > 0 && (
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black text-gray-400 uppercase mt-0.5">Specs:</span>
                      <span className="text-xs font-bold text-gray-600 text-right max-w-[200px]">
                        {viewingLog.item.fieldValues.map((fv: any) => {
                          const v = fv.value;
                          const val = v && typeof v === 'object' ? (v.main ?? v.qty) : v;
                          return val ? `${fv.field?.name || 'Spec'}: ${val}` : '';
                        }).filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black text-gray-400 uppercase">Release Qty:</span>
                    <span className="text-sm font-black text-gray-900">{viewingLog.qty}</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-50">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Involved Parties</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase">Requester</p>
                      <p className="text-sm font-bold text-gray-900">{viewingLog.user.username}</p>
                    </div>
                  </div>
                </div>
              </div>

              {viewingLog.remarks && (
                <div className="pt-6 border-t border-gray-50">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">System Remarks</p>
                  <p className="text-sm text-gray-600 bg-orange-50/50 p-4 rounded-2xl italic font-medium">
                    "{viewingLog.remarks}"
                  </p>
                </div>
              )}

              {viewingLog.attachmentUrl && (
                <div className="pt-6 border-t border-gray-50">
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">Signed Approval Form</p>
                  <div className="rounded-3xl overflow-hidden border-2 border-orange-100 shadow-sm bg-orange-50/20">
                    <img 
                      src={viewingLog.attachmentUrl} 
                      alt="Signed Form" 
                      className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500 cursor-zoom-in"
                      onClick={() => window.open(viewingLog.attachmentUrl, '_blank')}
                    />
                  </div>
                  <p className="mt-2 text-[10px] text-gray-400 font-bold italic text-center uppercase tracking-tighter">Click image to enlarge verification document</p>
                </div>
              )}

              {(viewingLog.imageUrl || (viewingLog.additionalImages && viewingLog.additionalImages.length > 0)) && (
                <div className="pt-6 border-t border-gray-50">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Evidence & Reference Photos</p>
                  <div className="grid grid-cols-2 gap-3">
                    {viewingLog.imageUrl && (
                      <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm aspect-square bg-gray-50">
                        <img 
                          src={viewingLog.imageUrl} 
                          alt="Evidence" 
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-500 cursor-zoom-in"
                          onClick={() => window.open(viewingLog.imageUrl, '_blank')}
                        />
                      </div>
                    )}
                    {viewingLog.additionalImages?.map((img: string, i: number) => (
                      <div key={i} className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm aspect-square bg-gray-50">
                        <img 
                          src={img} 
                          alt={`Reference ${i + 1}`} 
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-500 cursor-zoom-in"
                          onClick={() => window.open(img, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-6">
                <button 
                  onClick={() => window.open(`/i/${viewingLog.item.slug}`, '_blank')}
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-gray-900/10 hover:bg-primary transition-all active:scale-95"
                >
                  View Digital Twin Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}




      {/* Stock Movement Detail Modal */}
      {viewingStockDetail && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-600/20">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">{viewingStockDetail.name}</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Movement Details for {stockHealthRange.start === stockHealthRange.end ? new Date(stockHealthRange.start).toLocaleDateString() : `${new Date(stockHealthRange.start).toLocaleDateString()} - ${new Date(stockHealthRange.end).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setViewingStockDetail(null)}
                className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
              {(() => {
                const start = new Date(stockHealthRange.start);
                const end = new Date(stockHealthRange.end);
                end.setHours(23, 59, 59, 999);

                const relevantRequests = requests.filter(r => {
                  const d = new Date(r.createdAt);
                  return r.status === 'APPROVED' && 
                  (r.item.product?.name === viewingStockDetail.name || r.item.name === viewingStockDetail.name) &&
                  d >= start && d <= end;
                });

                if (relevantRequests.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <History className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                      <p className="text-sm font-bold text-gray-400 italic">No specific movements found for this item on this date.</p>
                    </div>
                  );
                }

                // Group by specs
                const breakdown: Record<string, { specs: string[], total: number }> = {};
                relevantRequests.forEach(r => {
                  const specString = r.item.fieldValues?.map((fv: any) => {
                    const v = fv.value;
                    const val = v && typeof v === 'object' ? (v.main ?? v.qty) : v;
                    return val ? `${fv.field?.name || 'Spec'}: ${val}` : '';
                  }).filter(Boolean).join(', ') || 'No Specs';
                  
                  if (!breakdown[specString]) {
                    breakdown[specString] = { specs: specString.split(', '), total: 0 };
                  }
                  breakdown[specString].total += r.qty;
                });

                return (
                  <div className="space-y-4">
                    {Object.entries(breakdown).map(([key, data], idx) => (
                      <div key={idx} className="flex items-center justify-between p-5 bg-gray-50 rounded-3xl border border-gray-100 group hover:border-orange-200 transition-all">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Variation Breakdown</p>
                          <div className="flex flex-wrap gap-1.5">
                            {data.specs.map((s, i) => (
                              <span key={i} className="px-2 py-0.5 bg-white border border-gray-200 text-[9px] font-bold text-gray-600 rounded-md">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Moved Qty</p>
                          <p className="text-2xl font-black text-gray-900">-{data.total}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            
            <div className="p-8 border-t border-gray-100 bg-gray-50/30 flex justify-end">
              <button 
                onClick={() => setViewingStockDetail(null)}
                className="px-8 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-gray-900/10 hover:bg-orange-600 transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
