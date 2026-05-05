import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    
    let count = 0;
    const errors = [];

    for (const line of lines) {
      // Regex to match "ID Name" pattern (e.g. CSC-2026-2268 VENTURA, CARL VENCENT DAISOG)
      const match = line.match(/^(CSC-[\d-]+)\s+(.+)$/i);
      
      if (match) {
        const sys_id = match[1].toUpperCase();
        const fullName = match[2].trim();
        
        // --- 1. GENERATE USERNAME & PASSWORD ---
        // Format: VENTURA, CARL VENCENT DAISOG -> venturaca
        const nameParts = fullName.split(',').map((p: string) => p.trim());
        const lastName = nameParts[0] || '';
        const firstName = nameParts[1] || '';
        const cleanLast = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanFirstTwo = firstName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 2);
        
        const username = `${cleanLast}${cleanFirstTwo}`;
        const email = `${username}@gaisano.com`;
        const password = sys_id; // Password is their System ID

        try {
          // --- 2. UPSERT INTO SUPABASE AUTH (Credential Management) ---
          // Check if user already exists in Auth
          const { data: { users: existingUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = existingUsers.find(u => u.email === email);

          let authId;

          if (existingUser) {
            authId = existingUser.id;
            // Update metadata and password if needed
            await supabaseAdmin.auth.admin.updateUserById(authId, {
              password: password,
              user_metadata: { 
                full_name: fullName, 
                sys_id: sys_id,
                department: 'PAYROLL' // Default or extracted
              }
            });
          } else {
            // Create new Auth user
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
              email,
              password,
              email_confirm: true,
              user_metadata: { 
                full_name: fullName, 
                sys_id: sys_id,
                department: 'PAYROLL'
              }
            });

            if (createError) throw createError;
            authId = newUser.user.id;
          }

          // --- 3. SYNC TO PUBLIC SCHEMA (Relational Management) ---
          // We use authId to link them to the Auth system
          await prisma.user.upsert({
            where: { sys_id },
            update: { 
              fullName, 
              username, 
              password, // Storing password in public.User for easy admin viewing (per user request)
              id: authId // Ensure the public ID matches the Auth ID
            },
            create: {
              id: authId,
              sys_id,
              fullName,
              username,
              password,
              role: 'EMPLOYEE'
            }
          });

          // Also update the profiles table if it exists
          await prisma.profiles.upsert({
            where: { sys_id },
            update: { 
              full_name: fullName,
              id: authId
            },
            create: {
              id: authId,
              sys_id,
              full_name: fullName,
              role: 'employee'
            }
          });
          
          count++;
        } catch (err: any) {
          console.error(`Error syncing user ${sys_id}:`, err.message);
          errors.push(`${sys_id}: ${err.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      count,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully provisioned ${count} accounts for the Payroll Portal.`
    });

  } catch (error: any) {
    console.error('Bulk Sync Global Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
