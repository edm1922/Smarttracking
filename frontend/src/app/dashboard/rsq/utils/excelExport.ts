import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Helper to normalize tailor nickname
const getTailorNickname = (tailorName: string) => {
  if (!tailorName) return 'MAUNLAD';
  let nickname = tailorName.replace(/tailoring|inc|cooperative|services/gi, '').trim().toUpperCase();
  if (!nickname || nickname === 'UNASSIGNED' || nickname === 'UNASSIGNED TAILOR') {
    nickname = 'MAUNLAD';
  }
  return nickname;
};

// Helper to style borders
const thinBorder = {
  style: 'thin' as const,
  color: { argb: 'FF94A3B8' } // Slate 300
};

const allThinBorders = {
  top: thinBorder,
  left: thinBorder,
  bottom: thinBorder,
  right: thinBorder
};

/**
 * Generates an Excel workbook with 4 copies stacked vertically on ONE worksheet.
 * Disables Excel scaling and uses 100% native portrait size to print perfectly on continuous statement size (8.5" x 5.5") sheets.
 */
export async function exportRSQToExcel(rsq: any) {
  if (!rsq) return;

  const workbook = new ExcelJS.Workbook();
  const tailorName = rsq.tailor?.name || 'TAILOR';
  const tailorNickname = getTailorNickname(tailorName);
  const formattedDate = rsq.orderDate ? new Date(rsq.orderDate).toLocaleDateString() : new Date().toLocaleDateString();

  const rawRemarks = rsq.remarks || '';
  const isImportedProduct = rawRemarks.toLowerCase().startsWith('imported product:');
  const displayParticulars = isImportedProduct
    ? rawRemarks.replace(/imported product:\s*/i, '').trim()
    : (rawRemarks || `${rsq.fabric?.name || 'N/A'} Style`);

  // Definition of the 4 copies
  const copies = [
    { title: `(${tailorNickname} COPY)`, type: 'CUTTING' as const },
    { title: '(TAILORING COPY)', type: 'TAILORING' as const },
    { title: `${tailorNickname} -> MAIN OFFICE`, type: 'CUTTING' as const },
    { title: 'TAILORING -> MAIN OFFICE', type: 'TAILORING' as const }
  ];

  const ws = workbook.addWorksheet('RSQ Slips', {
    views: [{ showGridLines: false }]
  });

  // Page Setup: portrait mode with absolute scaling disabled
  ws.pageSetup = {
    paperSize: 6 as any, // Statement / Half Letter
    orientation: 'portrait',
    fitToPage: false, // Prevent Excel from shrinking/scaling down content
    scale: 100, // Forces absolute 100% layout scaling
    margins: {
      left: 0.15,
      right: 0.15,
      top: 0.15,
      bottom: 0.15,
      header: 0,
      footer: 0
    },
    horizontalCentered: true,
    verticalCentered: false
  };

  // Safe columns (Total width: 82 characters) to fit exactly inside the 8.5" Statement width at 100% scale
  ws.columns = [
    { key: 'sno', width: 5 },
    { key: 'particulars', width: 22 },
    { key: 'req_qty', width: 6 },
    { key: 'req_unit', width: 6 },
    { key: 'spacer', width: 4 },
    { key: 'out_qty', width: 14 },
    { key: 'price', width: 25 }
  ];

  // Stack all 4 copies vertically on a single sheet
  for (let copyIndex = 0; copyIndex < copies.length; copyIndex++) {
    const copy = copies[copyIndex];
    const isCutting = copy.type === 'CUTTING';
    
    // Each copy block occupies exactly 22 rows
    const startRow = (copyIndex * 22) + 1;

    // Helper row calculator
    const r = (offset: number) => startRow + offset;
    const cell = (col: string, offset: number) => ws.getCell(`${col}${r(offset)}`);
    
    // Helper merger
    const merge = (col1: string, offset1: number, col2: string, offset2: number) => {
      ws.mergeCells(`${col1}${r(offset1)}:${col2}${r(offset2)}`);
    };

    // 1. Header Information Block (Centro Services)
    merge('A', 0, 'D', 0);
    const cellA1 = cell('A', 0);
    cellA1.value = 'CENTRO SERVICES COOPERATIVE';
    cellA1.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FF0F172A' } };
    cellA1.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(r(0)).height = 34;

    merge('A', 1, 'D', 1);
    const cellA2 = cell('A', 1);
    cellA2.value = 'Purok Camachile, Brgy. Tambler, General Santos City';
    cellA2.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF64748B' } };
    ws.getRow(r(1)).height = 18;

    // Outer bordered Box for "Uniform Request Slip" (F0:G1)
    merge('F', 0, 'G', 1);
    const cellF1 = cell('F', 0);
    cellF1.value = 'Uniform Request Slip';
    cellF1.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF0F172A' } };
    cellF1.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let cRow = 0; cRow <= 1; cRow++) {
      for (let cCol = 5; cCol <= 6; cCol++) {
        const colLetter = String.fromCharCode(65 + cCol);
        cell(colLetter, cRow).border = allThinBorders;
      }
    }

    // Row 2 spacer
    ws.getRow(r(2)).height = 10;

    // Row 3: Date & RQ No.
    // Date: 4/27/2026
    merge('A', 3, 'D', 3);
    const cellA3 = cell('A', 3);
    cellA3.value = `Date:    ${formattedDate}`;
    cellA3.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    cellA3.alignment = { horizontal: 'left', vertical: 'middle' };

    // RQ No. RSQ-00564
    merge('F', 3, 'G', 3);
    const cellF3 = cell('F', 3);
    cellF3.value = {
      richText: [
        { text: 'RQ No.:    ', font: { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF0F172A' } } },
        { text: rsq.rsqNo, font: { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFDC2626' } } }
      ]
    };
    cellF3.alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getRow(r(3)).height = 26;

    // 2. Left Table Headers (Row 4 & 5)
    ws.getRow(r(4)).height = 24;
    ws.getRow(r(5)).height = 20;

    merge('A', 4, 'A', 5);
    cell('A', 4).value = 'S. No.';
    
    merge('B', 4, 'B', 5);
    cell('B', 4).value = 'Particulars';

    merge('C', 4, 'D', 4);
    cell('C', 4).value = 'Request';
    cell('C', 5).value = 'Qty';
    cell('D', 5).value = 'Unit';

    const leftHeaderCells = [
      { col: 'A', row: 4 }, { col: 'A', row: 5 },
      { col: 'B', row: 4 }, { col: 'B', row: 5 },
      { col: 'C', row: 4 }, { col: 'C', row: 5 },
      { col: 'D', row: 4 }, { col: 'D', row: 5 }
    ];
    leftHeaderCells.forEach(o => {
      const c = cell(o.col, o.row);
      c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF475569' } };
      c.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' }
      };
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c.border = allThinBorders;
    });

    // 3. Right Table Headers (Row 4, 5, 6)
    // Row 4: Yellow copy title bar
    merge('F', 4, 'G', 4);
    const cellF4 = cell('F', 4);
    cellF4.value = copy.title;
    cellF4.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1E293B' } };
    cellF4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF08A' } }; // Yellow
    cellF4.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let cCol = 5; cCol <= 6; cCol++) {
      cell(String.fromCharCode(65 + cCol), 4).border = allThinBorders;
    }

    // Row 5: Output (Cutting / Tailoring) header
    merge('F', 5, 'G', 5);
    const cellF5 = cell('F', 5);
    cellF5.value = isCutting ? 'Output (Cutting)' : 'Output (Tailoring)';
    cellF5.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF334155' } };
    cellF5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // Light Slate
    cellF5.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let cCol = 5; cCol <= 6; cCol++) {
      cell(String.fromCharCode(65 + cCol), 5).border = allThinBorders;
    }

    // Row 6: Column headers Qty, Price
    ws.getRow(r(6)).height = 22;
    const rightHeaderCols = ['F', 'G'];
    rightHeaderCols.forEach(col => {
      const c = cell(col, 6);
      c.value = col === 'F' ? 'Qty' : 'Price';
      c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF475569' } };
      c.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' }
      };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = allThinBorders;
    });

    // 4. Data Rows (Row 6 & 7)
    // Left side merged vertically across Row 6 & 7
    ws.getRow(r(7)).height = 68;
    const leftDataCols = ['A', 'B', 'C', 'D'];
    leftDataCols.forEach(col => {
      merge(col, 6, col, 7);
      const c = cell(col, 6);
      c.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1E293B' } };
      
      // Values
      if (col === 'A') c.value = 1;
      if (col === 'B') c.value = displayParticulars;
      if (col === 'C') c.value = Number(rsq.quantityOrdered) || 0;
      if (col === 'D') c.value = (rsq.unit || 'pcs').toUpperCase();

      // Alignments & Borders
      for (let offset = 6; offset <= 7; offset++) {
        cell(col, offset).border = allThinBorders;
      }
      if (col === 'B') {
        c.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      } else {
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });

    // Right side data row (Row 7)
    const rightDataCols = ['F', 'G'];
    rightDataCols.forEach(col => {
      const c = cell(col, 7);
      c.border = allThinBorders;
      c.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1E293B' } };
      if (col === 'F') {
        c.value = rsq.quantityReceived ? Number(rsq.quantityReceived) : '';
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        c.value = rsq.fabric?.unitPrice ? Number(rsq.fabric.unitPrice) : 0;
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.numFmt = '₱#,##0.00';
      }
    });

    // 5. Received by Footer (Row 8)
    ws.getRow(r(8)).height = 34;
    merge('A', 8, 'D', 8);
    const cellRecL = cell('A', 8);
    cellRecL.value = 'Received by: __________________________';
    cellRecL.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF475569' } };
    cellRecL.alignment = { horizontal: 'left', vertical: 'middle' };

    merge('F', 8, 'G', 8);
    const cellRecR = cell('F', 8);
    cellRecR.value = 'Received by: __________________________';
    cellRecR.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF475569' } };
    cellRecR.alignment = { horizontal: 'left', vertical: 'middle' };

    // Spacer row 9
    ws.getRow(r(9)).height = 14;

    // 6. BOTTOM SIGNATORIES BLOCK (3-column layout)
    ws.getRow(r(10)).height = 22;
    ws.getRow(r(11)).height = 45; // Signature writing line height
    ws.getRow(r(12)).height = 14;

    const sigHeaders = [
      { colStart: 'A', colEnd: 'B', text: 'Requested by:' },
      { colStart: 'C', colEnd: 'E', text: 'Verified by:' },
      { colStart: 'F', colEnd: 'G', text: 'Approved by:' }
    ];

    sigHeaders.forEach(sig => {
      merge(sig.colStart, 10, sig.colEnd, 10);
      const c = cell(sig.colStart, 10);
      c.value = sig.text;
      c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF64748B' } };
      c.alignment = { horizontal: 'left', vertical: 'middle' };

      merge(sig.colStart, 11, sig.colEnd, 11);
      const cSig = cell(sig.colStart, 11);
      cSig.border = { bottom: thinBorder };
    });

    // Footer timestamp
    merge('A', 13, 'G', 13);
    const cellFoot = cell('A', 13);
    cellFoot.value = `Smart Tracking System • RSQ Ref: ${rsq.id} • Printed: ${new Date().toLocaleString()} • Statement Size (8.5" x 5.5")`;
    cellFoot.font = { name: 'Segoe UI', size: 8, italic: true, color: { argb: 'FF94A3B8' } };
    cellFoot.alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getRow(r(13)).height = 20;

    // Remaining filler rows to complete 22-row block spacing per copy
    for (let fillOffset = 14; fillOffset < 22; fillOffset++) {
      ws.getRow(r(fillOffset)).height = 2;
    }

    // Add a horizontal page break below the very last row of this copy block
    if (copyIndex < 3) {
      ws.getRow(r(21)).addPageBreak();
    }
  }

  // Export workbook
  const buffer = await workbook.xlsx.writeBuffer();
  const fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const blob = new Blob([buffer], { type: fileType });
  saveAs(blob, `RSQ_SLIPS_${rsq.rsqNo}.xlsx`);
}

/**
 * Generates an Excel workbook formatted as a half-letter size (8.5" x 5.5" landscape statement) Material Transmittal Report.
 */
export async function exportTransactionToExcel(transaction: any) {
  if (!transaction) return;

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Transmittal Report', {
    views: [{ showGridLines: false }]
  });

  // Set Statement 8.5" x 5.5" landscape paper size
  ws.pageSetup = {
    paperSize: 6 as any, // Statement / Half Letter
    orientation: 'portrait',
    fitToPage: false, // Prevent Excel from shrinking/scaling down content
    scale: 100, // Forces absolute 100% layout scaling
    margins: {
      left: 0.15,
      right: 0.15,
      top: 0.15,
      bottom: 0.15,
      header: 0,
      footer: 0
    },
    horizontalCentered: true,
    verticalCentered: false
  };

  // Safe columns (Total width: 78 characters) to fit exactly inside the 8.5" Statement width at 100% scale
  ws.columns = [
    { key: 'col1', width: 4 },
    { key: 'col2', width: 25 },
    { key: 'col3', width: 5 },
    { key: 'col4', width: 5 },
    { key: 'col5', width: 6 },
    { key: 'col6', width: 6 },
    { key: 'col7', width: 13 },
    { key: 'col8', width: 14 }
  ];

  const formattedDate = transaction.date ? new Date(transaction.date).toLocaleDateString() : new Date().toLocaleDateString();
  const formattedTime = transaction.createdAt ? new Date(transaction.createdAt).toLocaleTimeString() : new Date().toLocaleTimeString();
  const isWithdrawal = transaction.type === 'WITHDRAWAL';

  // 1. Header Information Block (Maunlad)
  ws.mergeCells('A1:D1');
  const cellA1 = ws.getCell('A1');
  cellA1.value = 'MAUNLAD UNIFORM INC.';
  cellA1.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF0F172A' } };
  cellA1.alignment = { vertical: 'middle' };
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:D2');
  const cellA2 = ws.getCell('A2');
  cellA2.value = 'MATERIAL TRANSMITTAL REPORT';
  cellA2.font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: 'FF475569' } };
  ws.getRow(2).height = 16;

  // 2. Transaction metadata highlights (TRN, Date, Time)
  ws.mergeCells('E1:H1');
  const cellE1 = ws.getCell('E1');
  cellE1.value = `TRN NO: ${transaction.transactionNo}`;
  cellE1.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1E3A8A' } }; // Navy Blue
  cellE1.alignment = { horizontal: 'right', vertical: 'middle' };
  cellE1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDBEAFE' } // Blue 100
  };
  cellE1.border = allThinBorders;

  ws.mergeCells('E2:H2');
  const cellE2 = ws.getCell('E2');
  cellE2.value = `DATE: ${formattedDate} | TIME: ${formattedTime}`;
  cellE2.font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: 'FF64748B' } };
  cellE2.alignment = { horizontal: 'right', vertical: 'middle' };

  // Spacing row
  ws.getRow(3).height = 10;

  // 3. Movement and Location Card Info (Row 4)
  ws.getRow(4).height = 22;
  ws.mergeCells('A4:D4');
  const cellA4 = ws.getCell('A4');
  cellA4.value = `MOVEMENT:  [ ${transaction.type.replace('_', ' ')} ]`;
  cellA4.font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: 'FF0F172A' } };
  cellA4.alignment = { vertical: 'middle' };
  cellA4.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' }
  };
  cellA4.border = allThinBorders;

  ws.mergeCells('E4:H4');
  const cellE4 = ws.getCell('E4');
  cellE4.value = `LOCATION:  [ ${transaction.location || 'BODEGA'} ]`;
  cellE4.font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: 'FF0F172A' } };
  cellE4.alignment = { horizontal: 'right', vertical: 'middle' };
  cellE4.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' }
  };
  cellE4.border = allThinBorders;

  // Spacing
  ws.getRow(5).height = 10;

  // 4. Main Table Headers (Row 6)
  ws.getRow(6).height = 20;
  ws.getCell('A6').value = 'ITEM NO';
  ws.mergeCells('B6:E6');
  ws.getCell('B6').value = 'FABRIC / DESCRIPTION';
  ws.mergeCells('F6:G6');
  ws.getCell('F6').value = 'QUANTITY';
  ws.getCell('H6').value = 'UNIT';

  const tHeaders = ['A6', 'B6', 'C6', 'D6', 'E6', 'F6', 'G6', 'H6'];
  tHeaders.forEach(ref => {
    const c = ws.getCell(ref);
    c.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF334155' } };
    c.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' } // Slate 200
    };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = allThinBorders;
  });

  // 5. Main Table Data Rows (Row 7)
  ws.getRow(7).height = 65;
  ws.getCell('A7').value = 1;
  ws.mergeCells('B7:E7');
  ws.getCell('B7').value = transaction.fabric?.name || 'UNKNOWN FABRIC';
  ws.mergeCells('F7:G7');
  ws.getCell('F7').value = Number(transaction.quantity) || 0;
  ws.getCell('H7').value = (transaction.unit || 'pcs').toUpperCase();

  const tCols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  tCols.forEach(col => {
    const c = ws.getCell(`${col}7`);
    c.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    c.border = allThinBorders;
    if (col === 'B' || col === 'C' || col === 'D' || col === 'E') {
      c.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    } else {
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  });

  // 6. Remarks Block (Row 9-10)
  ws.getRow(8).height = 10;
  ws.getRow(9).height = 16;
  ws.getRow(10).height = 40;

  ws.mergeCells('A9:H9');
  ws.getCell('A9').value = 'REMARKS / NOTES:';
  ws.getCell('A9').font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: 'FF64748B' } };
  
  ws.mergeCells('A10:H10');
  ws.getCell('A10').value = transaction.remarks || 'None';
  ws.getCell('A10').font = { name: 'Segoe UI', size: 8, italic: true, color: { argb: 'FF475569' } };
  ws.getCell('A10').alignment = { vertical: 'top', wrapText: true };
  ws.getCell('A10').border = allThinBorders;
  ws.getCell('A10').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' }
  };

  // Spacing
  ws.getRow(11).height = 12;

  // 7. Signatories Block (3 Columns)
  ws.getRow(12).height = 16;
  ws.getRow(13).height = 26;
  ws.getRow(14).height = 12;

  // Prepared By
  ws.mergeCells('A12:B12');
  ws.getCell('A12').value = 'Prepared By:';
  ws.mergeCells('A13:B13');
  ws.getCell('A13').border = { bottom: thinBorder };
  ws.mergeCells('A14:B14');
  ws.getCell('A14').value = 'Signature over printed name';

  // Checked / Issued By
  ws.mergeCells('C12:E12');
  ws.getCell('C12').value = isWithdrawal ? 'Issued By:' : 'Checked By:';
  ws.mergeCells('C13:E13');
  ws.getCell('C13').border = { bottom: thinBorder };
  ws.mergeCells('C14:E14');
  ws.getCell('C14').value = 'Signature over printed name';

  // Received By
  ws.mergeCells('F12:H12');
  ws.getCell('F12').value = 'Received By:';
  ws.mergeCells('F13:H13');
  ws.getCell('F13').border = { bottom: thinBorder };
  ws.mergeCells('F14:H14');
  ws.getCell('F14').value = 'Signature over printed name';

  const sCols = ['A', 'C', 'F'];
  sCols.forEach(col => {
    ws.getCell(`${col}12`).font = { name: 'Segoe UI', size: 8, bold: true, color: { argb: 'FF64748B' } };
    ws.getCell(`${col}12`).alignment = { horizontal: 'center' };

    ws.getCell(`${col}14`).font = { name: 'Segoe UI', size: 7, italic: true, color: { argb: 'FF94A3B8' } };
    ws.getCell(`${col}14`).alignment = { horizontal: 'center', vertical: 'top' };
  });

  // Footer Reference
  ws.mergeCells('A15:H15');
  const cellFoot = ws.getCell('A15');
  cellFoot.value = `Smart Tracking System • TRN Ref: ${transaction.id} • Printed: ${new Date().toLocaleString()} • Statement Size (8.5" x 5.5")`;
  cellFoot.font = { name: 'Segoe UI', size: 7, italic: true, color: { argb: 'FF94A3B8' } };
  cellFoot.alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getRow(15).height = 16;

  // Export workbook
  const buffer = await workbook.xlsx.writeBuffer();
  const fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const blob = new Blob([buffer], { type: fileType });
  saveAs(blob, `MTR_${transaction.transactionNo}.xlsx`);
}
