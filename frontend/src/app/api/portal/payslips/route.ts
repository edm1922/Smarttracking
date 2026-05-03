import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const sysId = user.user_metadata?.sys_id;
    if (!sysId) {
      return NextResponse.json({ error: 'User sys_id not found' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: entries, error: dbError } = await supabaseAdmin
      .from('payroll_entries')
      .select(`
        id,
        sys_id,
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
        raw_data,
        created_at,
        payroll_runs (
          period_start,
          period_end,
          payroll_date
        )
      `)
      .eq('sys_id', sysId)
      .order('created_at', { ascending: false });

    if (dbError) {
      console.error('API - Database error:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ entries });
  } catch (err: any) {
    console.error('API - Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
