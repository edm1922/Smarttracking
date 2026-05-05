import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase credentials missing');
  }
  return createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
};

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('client_formats')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Formats GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { client_name, mapping, header_row_index } = await req.json();
    
    if (!client_name || !mapping) {
      return NextResponse.json({ error: 'Client name and mapping are required' }, { status: 400 });
    }

    const supabase = getSupabase();
    
    // Check if client name already exists
    const { data: existing } = await supabase
      .from('client_formats')
      .select('id')
      .eq('client_name', client_name)
      .single();

    let result;
    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('client_formats')
        .update({ mapping, header_row_index, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from('client_formats')
        .insert({ client_name, mapping, header_row_index })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Formats POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const supabase = getSupabase();
    const { error } = await supabase.from('client_formats').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Formats DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
