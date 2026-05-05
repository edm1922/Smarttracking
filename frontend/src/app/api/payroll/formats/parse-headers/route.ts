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
    
    // Discovery: Return info about all sheets
    const sheets = workbook.SheetNames.map(name => {
      const worksheet = workbook.Sheets[name];
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Find a likely header row for this specific sheet
      const keywords = ['sys id', 'employee id', 'emp name', 'full name', 'basic pay', 'net pay', 'gross pay'];
      let suggestedHeaderIndex = 0;
      let maxScore = -1;

      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const rowString = (rows[i] || []).join('|').toLowerCase();
        const score = keywords.reduce((acc, k) => acc + (rowString.includes(k) ? 1 : 0), 0);
        if (score > maxScore) {
          maxScore = score;
          suggestedHeaderIndex = i;
        }
      }

      return {
        name,
        rowCount: rows.length,
        preview: rows.slice(0, 15), // Send first 15 rows for UI preview
        suggestedHeaderIndex
      };
    });

    return NextResponse.json({
      sheets,
      success: true
    });

  } catch (error: any) {
    console.error('Discovery Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
