import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    console.log('--- START BULK SYNC ---');
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    console.log(`Processing ${lines.length} lines`);
    
    let count = 0;
    const errors = [];

    for (const line of lines) {
      const match = line.match(/^(CSC-[\d-]+)\s+(.+)$/i);
      
      if (match) {
        const sys_id = match[1].toUpperCase();
        const fullName = match[2].trim();
        
        const nameParts = fullName.split(',').map((p: string) => p.trim());
        const lastName = nameParts[0] || '';
        const firstName = nameParts[1] || '';
        const cleanLast = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanFirstTwo = firstName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 2);
        
        const username = `${cleanLast}${cleanFirstTwo}`;
        const password = sys_id;

        try {
          // --- 1. UPSERT USER (Main Portal Auth) ---
          await prisma.user.upsert({
            where: { sys_id },
            update: { 
              fullName, 
              username, 
              password
            },
            create: {
              sys_id,
              fullName,
              username,
              password,
              role: 'EMPLOYEE'
            }
          });

          // --- 2. UPSERT PROFILE (Graceful failure) ---
          try {
            await prisma.profiles.upsert({
              where: { sys_id },
              update: { 
                full_name: fullName
              },
              create: {
                id: randomUUID(),
                sys_id,
                full_name: fullName,
                // Omitting role to avoid check constraint "profiles_role_check" 
                // which seems to reject 'employee' in some environments
              }
            });
          } catch (profileErr: any) {
            console.warn(`Profile sync failed for ${sys_id} (non-critical):`, profileErr.message);
          }
          
          count++;
        } catch (err: any) {
          console.error(`Error syncing user ${sys_id}:`, err.message);
          errors.push(`${sys_id}: ${err.message}`);
        }
      }
    }

    console.log(`--- BULK SYNC COMPLETE. Success: ${count}, Errors: ${errors.length} ---`);
    return NextResponse.json({
      success: true,
      count,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully provisioned ${count} accounts.`
    });

  } catch (error: any) {
    console.error('CRITICAL Bulk Sync Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
