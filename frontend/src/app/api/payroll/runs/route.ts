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
    const { data: runs, error } = await supabase
      .from('payroll_runs')
      .select(`
        *,
        payroll_entries (count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(runs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing run ID' }, { status: 400 });

    const { error } = await supabase
      .from('payroll_runs')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
