import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    console.log('--- START BULK SYNC (SAFE UNIQUE USERNAME) ---');
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    
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
        
        // To ensure uniqueness while keeping requested format:
        // Append the last part of the sys_id (e.g. beltranje1548)
        const idSuffix = sys_id.split('-').pop() || '';
        const username = `${cleanLast}${cleanFirstTwo}${idSuffix}`;
        
        validEntries.push({
          sys_id,
          fullName,
          username,
          password: sys_id
        });
      }
    }

    let successCount = 0;
    const batchSize = 50;
    
    for (let i = 0; i < validEntries.length; i += batchSize) {
      const batch = validEntries.slice(i, i + batchSize);
      
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
      
      successCount += batch.length;
    }

    return NextResponse.json({
      success: true,
      count: successCount,
      message: `Successfully provisioned ${successCount} accounts with unique IDs.`
    });

  } catch (error: any) {
    console.error('Bulk Sync Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
