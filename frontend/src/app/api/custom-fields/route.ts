import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: fields, error } = await supabase
      .from('CustomField')
      .select('id, name, batchId')
      .order('createdAt', { ascending: true });

    if (error) {
      console.error('Custom fields API error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedFields = fields?.map(f => ({
      id: f.id,
      name: f.name,
      batchId: f.batchId
    })) || [];

    return NextResponse.json(formattedFields);
  } catch (err: any) {
    console.error('Custom fields API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
