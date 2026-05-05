import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase credentials missing (URL or Anon Key)');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const formatId = formData.get('formatId') as string;
    const label = formData.get('label') as string || 'General Upload';
    const periodStart = formData.get('periodStart') as string;
    const periodEnd = formData.get('periodEnd') as string;
    const payrollDate = formData.get('payrollDate') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!formatId) {
      return NextResponse.json({ error: 'No client format selected' }, { status: 400 });
    }

    // Fetch Client Format Mapping
    const { data: format, error: formatError } = await supabase
      .from('client_formats')
      .select('*')
      .eq('id', formatId)
      .single();

    if (formatError || !format) {
      return NextResponse.json({ error: 'Client format not found' }, { status: 400 });
    }

    const mapping = format.mapping as Record<string, number>;
    const headerRowIndex = format.header_row_index ?? 0;

    // 0. Save file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `payroll/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('payroll-archives')
      .upload(filePath, file);

    const fileUrl = uploadData?.path ? filePath : null;

    // 1. Read Excel File
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Use the first sheet or find a way to specify sheet name if needed
    // For now, let's use the sheet identified during format creation or the first sheet
    const targetSheetName = workbook.SheetNames[0]; 
    const worksheet = workbook.Sheets[targetSheetName];
    const allRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Data rows start after the header
    const dataRows = allRows.slice(headerRowIndex + 1); 

    // 2. Create a Payroll Run record
    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .insert({
        period_start: periodStart || new Date().toISOString(),
        period_end: periodEnd || new Date().toISOString(),
        payroll_date: payrollDate || new Date().toISOString(),
        status: 'pending',
        client_name: format.client_name,
        label: label,
        file_url: fileUrl
      })
      .select()
      .single();

    if (runError) throw runError;

    // 3. Process entries using mapping
    const entries = [];
    const errors: any[] = [];

    const getVal = (row: any[], key: string) => {
      const index = mapping[key];
      if (index === undefined || index === null || index === -1) return 0;
      const val = row[index];
      if (typeof val === 'number') return val;
      if (typeof val === 'string') return parseFloat(val.replace(/,/g, '')) || 0;
      return 0;
    };

    const getString = (row: any[], key: string) => {
      const index = mapping[key];
      if (index === undefined || index === null || index === -1) return '';
      return row[index] ? String(row[index]).trim() : '';
    };

    for (const row of dataRows) {
      if (!row || row.length === 0) continue;
      
      const sysId = getString(row, 'sys_id');
      if (!sysId) continue;

      // Extract fields based on mapping
      const basicPay = getVal(row, 'basic_pay');
      const grossPay = getVal(row, 'gross_pay');
      const allowance = getVal(row, 'allowance');
      const overtimePay = getVal(row, 'overtime_pay');
      const sss = getVal(row, 'sss');
      const phic = getVal(row, 'phic');
      const hdmf = getVal(row, 'hdmf');
      const loans = getVal(row, 'loans');
      const totalDeductions = getVal(row, 'total_deductions');
      const netPay = getVal(row, 'net_pay');

      // We can also store extra fields in raw_data if we want
      const rawData: Record<string, any> = {
        full_name: getString(row, 'full_name'),
      };

      // Add any mapping keys that aren't in the main columns to rawData
      Object.keys(mapping).forEach(key => {
        if (!['sys_id', 'basic_pay', 'gross_pay', 'allowance', 'overtime_pay', 'sss', 'phic', 'hdmf', 'loans', 'total_deductions', 'net_pay', 'full_name'].includes(key)) {
          rawData[key] = row[mapping[key]];
        }
      });

      entries.push({
        payroll_run_id: run.id,
        sys_id: sysId,
        basic_pay,
        gross_pay,
        allowance,
        overtime_pay,
        sss,
        phic,
        hdmf,
        loans,
        total_deductions,
        net_pay,
        raw_data: rawData
      });
    }

    // 4. Batch insert entries
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
