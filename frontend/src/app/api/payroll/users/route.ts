import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
      role: user.role,
      run_ids: user.documents.map(d => d.batch_id),
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
