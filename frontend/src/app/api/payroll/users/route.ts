import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: 'EMPLOYEE'
      },
      include: {
        documents: {
          select: {
            batch_id: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(users.map(user => ({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      sys_id: user.sys_id,
      password: user.password,
      run_ids: user.documents.map(d => d.batch_id), // Map documents to "runs" for frontend compatibility
      createdAt: user.createdAt,
    })));
  } catch (error: any) {
    console.error('Fetch Users Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });

    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete User Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
