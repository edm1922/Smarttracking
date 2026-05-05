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
    const headerRow = allRows[headerRowIndex];
    const headers = headerRow.map((h, index) => ({
      index,
      name: h ? String(h).trim() : `Column ${index + 1}`
    })).filter(h => h.name !== `Column ${h.index + 1}` && h.name !== ''); // Filter out empty columns

    return NextResponse.json({
      success: true,
      headers,
      headerRowIndex,
      sheetName: targetSheetName
    });

  } catch (error: any) {
    console.error('Parse Headers Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
