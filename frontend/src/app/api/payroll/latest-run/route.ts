import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const batch = await prisma.storageBatch.findFirst({
      orderBy: {
        created_at: 'desc'
      }
    });

    return NextResponse.json(batch || null);
  } catch (error: any) {
    console.error('Fetch Latest Batch Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
