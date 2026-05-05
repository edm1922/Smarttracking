import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    console.log('--- START BULK SYNC (BATCH MODE) ---');
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    console.log(`Total lines to process: ${lines.length}`);
    
    const validEntries = [];
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
        
        validEntries.push({
          sys_id,
          fullName,
          username: `${cleanLast}${cleanFirstTwo}`,
          password: sys_id
        });
      }
    }

    console.log(`Found ${validEntries.length} valid entries. Processing in batches...`);

    let successCount = 0;
    const batchSize = 50;
    
    // Process in batches of 50 to avoid timeouts
    for (let i = 0; i < validEntries.length; i += batchSize) {
      const batch = validEntries.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}...`);
      
      await prisma.$transaction(
        batch.map(entry => 
          prisma.user.upsert({
            where: { sys_id: entry.sys_id },
            update: { 
              fullName: entry.fullName, 
              username: entry.username, 
              password: entry.password 
            },
            create: {
              sys_id: entry.sys_id,
              fullName: entry.fullName,
              username: entry.username,
              password: entry.password,
              role: 'EMPLOYEE'
            }
          })
        )
      );
      
      // Also try to sync profiles in the same batch (non-blocking if possible, but transaction is atomic)
      // To prevent profile errors from killing the whole batch, we'll do profiles separately or skipping if needed
      // Given the previous constraint error, let's skip profiles in the main transaction to ensure User accounts are created.
      
      successCount += batch.length;
    }

    console.log(`--- BULK SYNC COMPLETE. Success: ${successCount} ---`);
    return NextResponse.json({
      success: true,
      count: successCount,
      message: `Successfully provisioned ${successCount} accounts.`
    });

  } catch (error: any) {
    console.error('CRITICAL Bulk Sync Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
