import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// Initialize Supabase with Service Role Key for backend operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Using the key provided in .env.local
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const label = formData.get('label') as string || 'General Upload';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 0. Save file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `payroll/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('payroll-archives') // Ensure this bucket exists
      .upload(filePath, file);

    if (uploadError) {
      console.error('File Upload Error:', uploadError);
      // Continue without file storage if bucket doesn't exist, or throw error
      // throw uploadError; 
    }

    const fileUrl = uploadData?.path ? filePath : null;

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // 1. Find the correct sheet (some files have summaries on the first sheet)
    let targetSheetName = '';
    let allRows: any[][] = [];
    let headerRowIndex = -1;

    for (const name of workbook.SheetNames) {
      const worksheet = workbook.Sheets[name];
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;
        
        const rowString = row.filter(cell => cell !== null && cell !== undefined).join('|').toLowerCase();
        if (rowString.includes('sys id') || (rowString.includes('emp name') && rowString.includes('basic pay'))) {
          targetSheetName = name;
          allRows = rows;
          headerRowIndex = i;
          break;
        }
      }
      if (targetSheetName) break;
    }

    if (!targetSheetName) {
      return NextResponse.json({ error: 'Could not find a sheet with payroll data. Ensure a sheet contains "Sys ID" and "Basic Pay" columns.' }, { status: 400 });
    }

    // Extract Metadata from headers (usually Rows 2-4)
    const periodCovered = allRows[1]?.[5] || 'Unknown Period';
    const payrollDateStr = allRows[2]?.[5] || new Date().toISOString().split('T')[0];

    // Data rows start after the complex multi-row header (usually 4 rows after the header indicator)
    const dataRows = allRows.slice(headerRowIndex + 4); 

    // Robust Date Parsing for "APRIL 11 - 25, 2026"
    let periodStart = new Date().toISOString();
    let periodEnd = new Date().toISOString();
    
    try {
      const parts = periodCovered.match(/([A-Za-z]+)\s+(\d+)\s*-\s*(\d+),\s*(\d+)/);
      if (parts) {
        const [_, month, dayStart, dayEnd, year] = parts;
        periodStart = new Date(`${month} ${dayStart}, ${year}`).toISOString();
        periodEnd = new Date(`${month} ${dayEnd}, ${year}`).toISOString();
      }
    } catch (e) {
      console.error('Date parsing failed:', e);
    }

    // 1. Create a Payroll Run record with verified columns
    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .insert({
        period_start: periodStart,
        period_end: periodEnd,
        payroll_date: new Date(payrollDateStr).toISOString() || new Date().toISOString(),
        status: 'pending',
        client_name: 'GAISANO MALL OF GENSAN',
        label: label,
        file_url: fileUrl
      })
      .select()
      .single();

    if (runError) throw runError;

    // 2. Process entries with full detail
    const entries = [];
    const errors: any[] = [];

    for (const row of dataRows) {
      if (!row || row.length < 10) continue;
      
      const sysId = row[4]; // Column E: Sys ID
      if (!sysId || typeof sysId !== 'string' || !sysId.startsWith('CSC-')) continue;

      // Extract detailed fields based on EXACT indices from GAISANO Excel structure (Verified May 03, 2026)
      const basicPay = parseFloat(row[32] || 0);
      const allowance = parseFloat(row[34] || 0);
      const allowanceAdj = parseFloat(row[35] || 0);
      const payrollAdj = parseFloat(row[36] || 0);
      const otPay = parseFloat(row[23] || 0) + parseFloat(row[25] || 0) + parseFloat(row[27] || 0); // OT Regular + Rest + Hol
      
      // Calculate Gross Pay (Total Earnings)
      const calculatedGross = basicPay + allowance + allowanceAdj + payrollAdj + otPay;

      // Deductions Breakdown
      const sss = parseFloat(row[61] || 0);
      const phic = parseFloat(row[57] || 0);
      const hdmf = parseFloat(row[58] || 0);
      
      // Loans (SSS Salary/Calamity/ProvFund + HDMF Salary/Calamity)
      const loans = parseFloat(row[59] || 0) + parseFloat(row[60] || 0) + parseFloat(row[62] || 0) + parseFloat(row[63] || 0) + parseFloat(row[64] || 0);
      
      // Other Deductions (Share Capital, Insurance, CA, Boarding, etc.)
      const otherDeductions = 
        parseFloat(row[69] || 0) + // Share Capital
        parseFloat(row[70] || 0) + // Insurance
        parseFloat(row[71] || 0) + // Cash Advance
        parseFloat(row[72] || 0) + // Boarding House
        parseFloat(row[73] || 0) + // Over Draft
        parseFloat(row[74] || 0) + // Over payment
        parseFloat(row[75] || 0) + // ATM
        parseFloat(row[76] || 0) + // Voucher
        parseFloat(row[77] || 0) + // Uniform
        parseFloat(row[78] || 0);   // ID

      const totalDeductions = parseFloat(row[80] || 0);
      const netPay = parseFloat(row[81] || 0);

      entries.push({
        payroll_run_id: run.id,
        sys_id: sysId,
        basic_pay: basicPay,
        gross_pay: calculatedGross, // Use calculated gross to ensure math adds up: Gross - TotalDeductions = Net
        allowance: allowance,
        overtime_pay: otPay,
        sss: sss,
        phic: phic,
        hdmf: hdmf,
        loans: loans + otherDeductions, // Group all miscellaneous deductions into loans/other for now
        total_deductions: totalDeductions,
        net_pay: netPay,
        raw_data: {
          period: periodCovered,
          full_name: row[5],
          bank: row[3],
          account: row[2],
          adjustments: {
            allowance: allowanceAdj,
            payroll: payrollAdj
          },
          deductions_breakdown: {
            share_capital: parseFloat(row[69] || 0),
            insurance: parseFloat(row[70] || 0),
            cash_advance: parseFloat(row[71] || 0),
            boarding: parseFloat(row[72] || 0),
            voucher: parseFloat(row[76] || 0)
          }
        }
      });
    }

    // 3. Batch insert entries
    if (entries.length > 0) {
      const { error: insertError } = await supabase
        .from('payroll_entries')
        .insert(entries);

      if (insertError) {
        console.error('Final Insert Error:', insertError);
        throw insertError;
      }
    }

    return NextResponse.json({
      success: true,
      count: entries.length,
      errors: errors,
      runId: run.id
    });

  } catch (error: any) {
    console.error('Payroll Upload Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
