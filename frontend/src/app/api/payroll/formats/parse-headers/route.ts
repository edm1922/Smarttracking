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
    
    // Scan sheets for a row that has multiple filled columns, typical of a header
    // 1. Scan ALL sheets to find the most complete payroll data
    let bestSheet = { name: '', rows: [] as any[][], headerIndex: -1, score: 0 };
    const keywords = ['sys id', 'employee id', 'emp name', 'full name', 'basic pay', 'net pay', 'gross pay', 'sss', 'phic', 'hdmf'];

    for (const name of workbook.SheetNames) {
      const worksheet = workbook.Sheets[name];
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      for (let i = 0; i < Math.min(rows.length, 50); i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;
        
        const rowString = row.join('|').toLowerCase();
        // Count how many keywords this row contains
        let score = keywords.reduce((acc, k) => acc + (rowString.includes(k) ? 1 : 0), 0);
        
        // Massive bonus if the sheet name contains "payroll"
        if (name.toLowerCase().includes('payroll')) {
          score += 20;
        }
        
        // If this row/sheet is better than anything we've seen, remember it
        if (score > bestSheet.score) {
          bestSheet = { name, rows, headerIndex: i, score };
        }
      }
    }

    if (bestSheet.score === 0 || !bestSheet.name) {
      return NextResponse.json({ error: 'Could not find a sheet with recognizable payroll data. Please ensure the file contains columns like "Sys ID", "Basic Pay", or "Net Pay".' }, { status: 400 });
    }

    const allRows = bestSheet.rows;
    const headerRowIndex = bestSheet.headerIndex;
    const targetSheetName = bestSheet.name;

    // Extract headers
    // Data rows to scan for pattern matching
    const dataRows = allRows.slice(headerRowIndex + 1, headerRowIndex + 51);

    // 2. Map system fields autonomously
    const mapping: Record<string, number> = {};
    const rawHeaders = allRows[headerRowIndex] || [];
    const headers: { name: string; index: number }[] = rawHeaders
      .map((h: any, i: number) => (h != null ? { name: String(h).trim(), index: i } : null))
      .filter((h: any): h is { name: string; index: number } => h !== null);

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
