import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: batches, error } = await supabase
      .from('Batch')
      .select(`
        id,
        batchCode,
        description,
        createdAt,
        items:Item(count)
      `)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Batches API error detail:', JSON.stringify(error, null, 2));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedBatches = batches?.map(b => ({
      id: b.id,
      batchCode: b.batchCode,
      description: b.description,
      createdAt: b.createdAt,
      _count: { items: b.items?.[0]?.count || 0 }
    })) || [];

    return NextResponse.json(formattedBatches);
  } catch (err: any) {
    console.error('Batches API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await request.json();
    
    const { data, error } = await supabase
      .from('batches')
      .insert([{ batch_code: body.batchCode, description: body.description }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
