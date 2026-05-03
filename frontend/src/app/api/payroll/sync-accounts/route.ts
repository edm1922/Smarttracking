import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, 
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    const { runId } = await req.json();

    if (!runId) {
      return NextResponse.json({ error: 'Missing runId' }, { status: 400 });
    }

    // 1. Fetch entries for this run
    const { data: entries, error: entriesError } = await supabaseAdmin
      .from('payroll_entries')
      .select('sys_id, raw_data')
      .eq('payroll_run_id', runId);

    if (entriesError) throw entriesError;
    if (!entries || entries.length === 0) {
      return NextResponse.json({ message: 'No entries found for this run' });
    }

    // 2. Identify unique employees
    const uniqueEmployees = new Map();
    entries.forEach(entry => {
      if (!uniqueEmployees.has(entry.sys_id)) {
        const fullName = entry.raw_data?.full_name || '';
        let username = entry.sys_id; // Fallback
        
        if (fullName.includes(',')) {
          const [last, first] = fullName.split(',').map((s: string) => s.trim().toLowerCase());
          username = `${last}_${first.substring(0, 2)}`;
        } else {
          const parts = fullName.split(' ').filter(Boolean).map((s: string) => s.toLowerCase());
          if (parts.length >= 2) {
            const last = parts[parts.length - 1];
            const first = parts[0];
            username = `${last}_${first.substring(0, 2)}`;
          }
        }

        // Generate a random 8-character password
        const generatedPassword = Math.random().toString(36).substring(2, 10).toUpperCase();

        uniqueEmployees.set(entry.sys_id, {
          email: `${username}@gaisano.com`,
          password: generatedPassword,
          fullName: fullName || 'Staff'
        });
      }
    });

    const results = { created: 0, updated: 0, failed: 0 };
    let firstError = null;

    // 3. Provision accounts
    for (const [sysId, emp] of uniqueEmployees.entries()) {
      try {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: emp.email,
          password: emp.password,
          email_confirm: true,
          user_metadata: { 
            full_name: emp.fullName, 
            sys_id: sysId, 
            role: 'staff',
            temp_password: emp.password
          }
        });

        if (createError) {
          console.error(`Provisioning failed for ${sysId} (${emp.email}):`, createError.message);
          if (createError.message.toLowerCase().includes('already registered')) {
            results.updated++;
          } else {
            if (!firstError) firstError = createError.message;
            results.failed++;
          }
        } else {
          results.created++;
        }
      } catch (e: any) {
        console.error(`Unexpected error for ${sysId}:`, e.message);
        if (!firstError) firstError = e.message;
        results.failed++;
      }
    }

    return NextResponse.json({
      success: results.failed === 0,
      summary: `Provisioning complete: ${results.created} new accounts, ${results.updated} existing, ${results.failed} failed.`,
      error: firstError || (results.failed > 0 ? 'Unknown error during provisioning' : null)
    });

  } catch (error: any) {
    console.error('Provisioning Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
