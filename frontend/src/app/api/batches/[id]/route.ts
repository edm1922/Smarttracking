import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    const { error } = await supabase
      .from('Batch')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete batch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete batch error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
