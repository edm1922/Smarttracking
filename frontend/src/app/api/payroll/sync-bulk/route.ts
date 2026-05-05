import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Split by lines and filter empty ones
    const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    
    let count = 0;
    const results = [];

    for (const line of lines) {
      // Regex to match "ID Name" pattern (e.g. CSC-1001 Juan Dela Cruz)
      // Matches CSC- followed by digits, then a space, then everything else as the name
      const match = line.match(/^(CSC-\d+)\s+(.+)$/i);
      
      if (match) {
        const sys_id = match[1].toUpperCase();
        const fullName = match[2].trim();
        
        // Generate a standard username and password
        const username = sys_id.toLowerCase().replace(/[^a-z0-9]/g, '');
        const password = `Welcome${sys_id.split('-')[1] || '2026'}!`;

        await prisma.user.upsert({
          where: { sys_id },
          update: { fullName },
          create: {
            sys_id,
            fullName,
            username,
            password,
            role: 'EMPLOYEE'
          }
        });
        
        count++;
      }
    }

    return NextResponse.json({
      success: true,
      count,
      message: `Successfully provisioned ${count} employee accounts.`
    });

  } catch (error: any) {
    console.error('Bulk Sync Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
