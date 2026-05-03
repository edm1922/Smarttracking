import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { data: latestRun, error } = await supabase
      .from('payroll_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;

    return NextResponse.json(latestRun);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
