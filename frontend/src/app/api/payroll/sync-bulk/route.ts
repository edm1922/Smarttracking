import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
        const nameParts = fullName.split(',').map((p: string) => p.trim());
        const lastName = nameParts[0] || '';
        const firstName = nameParts[1] || '';
        const cleanLast = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanFirstTwo = firstName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 2);
        
        const username = `${cleanLast}${cleanFirstTwo}`;
        const password = sys_id;

        try {
          // --- 2. UPSERT INTO PUBLIC SCHEMA ONLY ---
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

          // Sync profiles for compatibility
          await prisma.profiles.upsert({
            where: { sys_id },
            update: { 
              full_name: fullName
            },
            create: {
              id: crypto.randomUUID(), // New UUID since we aren't using Auth IDs
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
      message: `Successfully provisioned ${count} accounts in the User table.`
    });

  } catch (error: any) {
    console.error('Bulk Sync Global Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
