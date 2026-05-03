import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    let query = supabase
      .from('Item')
      .select(`
        id,
        slug,
        name,
        createdAt,
        locked,
        fieldValues:ItemFieldValue(
          fieldId,
          value
        )
      `)
      .order('createdAt', { ascending: false });

    if (batchId) {
      query = query.eq('batchId', batchId);
    }

    const { data: items, error } = await query;

    if (error) {
      console.error('Items API error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedItems = items?.map(item => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      createdAt: item.createdAt,
      locked: item.locked,
      fieldValues: item.fieldValues?.map((fv: any) => ({
        fieldId: fv.fieldId,
        value: fv.value
      })) || []
    })) || [];

    return NextResponse.json(formattedItems);
  } catch (err: any) {
    console.error('Items API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
