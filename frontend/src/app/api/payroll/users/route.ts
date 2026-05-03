import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials missing (URL or Service Key)');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    // Fetch all users with 'staff' role in metadata
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000
    });
    
    if (error) throw error;
    const users = data?.users || [];

    const staffUsers = users.filter((user: any) => user.user_metadata?.role === 'staff');

    // Fetch run associations for these users
    const sysIds = staffUsers.map((u: any) => u.user_metadata?.sys_id).filter(Boolean);
    const { data: entries } = await supabaseAdmin
      .from('payroll_entries')
      .select('sys_id, payroll_run_id')
      .in('sys_id', sysIds);

    const userRunMap = new Map();
    entries?.forEach((e: any) => {
      if (!userRunMap.has(e.sys_id)) userRunMap.set(e.sys_id, new Set());
      userRunMap.get(e.sys_id).add(e.payroll_run_id);
    });

    return NextResponse.json(staffUsers.map((user: any) => {
      const sysId = user.user_metadata?.sys_id;
      return {
        id: user.id,
        email: user.email,
        username: user.email?.split('@')[0],
        fullName: user.user_metadata?.full_name,
        sys_id: sysId,
        password: user.user_metadata?.temp_password || sysId,
        run_ids: Array.from(userRunMap.get(sysId) || []),
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at
      };
    }));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials missing (URL or Service Key)');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    const { id } = await req.json();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
