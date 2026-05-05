import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const batches = await prisma.storageBatch.findMany({
      include: {
        _count: {
          select: { documents: true }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Transform to match the frontend expectations if needed
    const formattedBatches = batches.map(batch => ({
      ...batch,
      payroll_entries: [{ count: batch._count.documents }] // Compatibility with existing frontend
    }));

    return NextResponse.json(formattedBatches);
  } catch (error: any) {
    console.error('Fetch Batches Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing batch ID' }, { status: 400 });

    await prisma.storageBatch.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete Batch Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
