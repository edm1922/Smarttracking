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
    
    const sheets = workbook.SheetNames.map(name => {
      const worksheet = workbook.Sheets[name];
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Discovery: Find the best header candidate for this sheet
      const keywords = ['sys id', 'employee id', 'id', 'full name', 'name', 'basic pay', 'net pay'];
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

      // Pre-process headers with column letters for easy mapping
      const rawHeaders = rows[suggestedHeaderIndex] || [];
      const headers = rawHeaders.map((h, idx) => ({
        index: idx,
        name: String(h || `Column ${idx + 1}`).trim(),
        letter: getColLetter(idx)
      }));

      return {
        name,
        rowCount: rows.length,
        preview: rows.slice(0, 30), // First 30 rows for preview
        headers,
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

function getColLetter(index: number) {
  let letter = "";
  let i = index;
  while (i >= 0) {
    letter = String.fromCharCode((i % 26) + 65) + letter;
    i = Math.floor(i / 26) - 1;
  }
  return letter;
}
