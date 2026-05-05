import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    let targetSheetName = '';
    let allRows: any[][] = [];
    let headerRowIndex = -1;

    // Scan sheets for a row that has multiple filled columns, typical of a header
    // We try to find a row that looks like a header (e.g. contains 'ID', 'Name', 'Basic')
    for (const name of workbook.SheetNames) {
      const worksheet = workbook.Sheets[name];
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;
        
        const rowString = row.filter((cell: any) => cell !== null && cell !== undefined).join('|').toLowerCase();
        
        // Typical keywords to identify a payroll header row
        if (
          rowString.includes('sys id') || 
          rowString.includes('employee no') ||
          (rowString.includes('name') && rowString.includes('basic')) ||
          (rowString.includes('emp') && rowString.includes('pay')) ||
          rowString.includes('net pay')
        ) {
          targetSheetName = name;
          allRows = rows;
          headerRowIndex = i;
          break;
        }
      }
      if (targetSheetName) break;
    }

    if (!targetSheetName) {
      return NextResponse.json({ error: 'Could not identify a header row in any sheet. Ensure the file contains typical payroll headers like "Sys ID", "Basic Pay", or "Name".' }, { status: 400 });
    }

    // Extract headers
    // Data rows to scan for pattern matching
    const dataRows = allRows.slice(headerRowIndex + 1, headerRowIndex + 51);

    // 2. Map system fields autonomously
    const mapping: Record<string, number> = {};
    const headers = allRows[headerRowIndex].map((h: any, i: number) => ({ name: String(h || `Column ${i}`).trim(), index: i }));

    const rules: Record<string, string[]> = {
      sys_id: ['sys id', 'employee id', 'id', 'emp id', 'employee no'],
      full_name: ['full name', 'employee name', 'emp name', 'name'],
      basic_pay: ['basic pay', 'monthly rate', 'daily rate'],
      gross_pay: ['gross pay', 'total earnings'],
      overtime_pay: ['overtime', 'ot pay', 'total ot'],
      allowance: ['allowance', 'total allowance'],
      sss: ['sss contribution', 'sss'],
      phic: ['philhealth', 'phic'],
      hdmf: ['pag-ibig', 'hdmf', 'pagibig'],
      loans: ['total loans', 'loans'],
      total_deductions: ['total deductions', 'total deduction'],
      net_pay: ['net pay', 'take home pay']
    };

    headers.forEach(h => {
      const name = h.name.toLowerCase();
      if (name.includes('bank') || name.includes('account')) return;

      Object.entries(rules).forEach(([key, keywords]) => {
        if (mapping[key] !== undefined) return;

        // Try exact match first
        if (keywords.includes(name)) {
          mapping[key] = h.index;
          return;
        }

        // Try fuzzy match
        if (keywords.some(k => name.includes(k))) {
          // Verify with data scan if it's a numeric field
          if (['basic_pay', 'gross_pay', 'net_pay', 'total_deductions'].includes(key)) {
            const hasNumbers = dataRows.some(row => {
              const val = String(row[h.index] || '');
              return val && !isNaN(parseFloat(val.replace(/,/g, '')));
            });
            if (hasNumbers) mapping[key] = h.index;
          } else if (key === 'sys_id') {
             // Look for CSC- or similar patterns in data
             const hasIdPattern = dataRows.some(row => String(row[h.index] || '').includes('CSC-'));
             if (hasIdPattern) mapping[key] = h.index;
          } else {
            mapping[key] = h.index;
          }
        }
      });
    });

    // Final fallback: if sys_id not found, look for any column with CSC- in data
    if (mapping.sys_id === undefined) {
      for (let i = 0; i < headers.length; i++) {
        if (dataRows.some(row => String(row[i] || '').includes('CSC-'))) {
          mapping.sys_id = i;
          break;
        }
      }
    }

    return NextResponse.json({
      headers,
      mapping, // Suggested mapping
      headerRowIndex,
      sheetName: targetSheetName,
      success: true
    });

  } catch (error: any) {
    console.error('Parse Headers Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
