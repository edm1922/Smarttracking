import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: { username: string; role: 'admin' | 'inventory' | 'super_admin' | 'payroll_admin' }) {
    const existing = await this.prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existing) {
      throw new ConflictException('Username already exists');
    }

    // Generate a simple, easy-to-read password for mobile users
    const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4 digits
    const randomChars = Math.random().toString(36).substring(2, 4).toUpperCase(); // 2 chars
    
    let prefix = 'INV';
    if (data.role === 'super_admin') prefix = 'SYS';
    else if (data.role === 'admin') prefix = 'ADM';
    else if (data.role === 'payroll_admin') prefix = 'PAY';
    
    const plainPassword = `${prefix}-${randomChars}${randomDigits}`;
    
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: data.username,
          password: hashedPassword,
          role: data.role,
        },
      });

      // Automatically create a personal inventory location for inventory staff
      if (data.role === 'inventory') {
        await tx.location.create({
          data: {
            name: `Personal: ${data.username}`,
            description: `Inventory custody for staff user ${data.username}`,
            userId: user.id,
          },
        });
      }

      // If it's a payroll admin, ensure they have a profile in the payroll system
      // We use raw SQL because 'profiles' might not be in the Prisma schema yet
      if (data.role === 'payroll_admin') {
        try {
          await tx.$executeRaw`
            INSERT INTO public.profiles (id, sys_id, full_name, role)
            VALUES (${user.id}::uuid, ${data.username}, ${data.username}, 'payroll_admin')
            ON CONFLICT (id) DO NOTHING
          `;
        } catch (err) {
          console.error('Failed to provision payroll profile:', err);
        }
      }

      return {
        id: user.id,
        username: user.username,
        role: user.role,
        plainPassword,
      };
    });
  }

  async remove(id: string) {
    // Prevent deleting the last admin if necessary, but for now just basic delete
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async findByRole(role: string) {
    return this.prisma.user.findMany({
      where: { role },
      select: {
        id: true,
        username: true,
        role: true,
      },
      orderBy: { username: 'asc' },
    });
  }

  async revealCredential(id: string, adminPassword: string, requesterId: string) {
    const requester = await this.prisma.user.findUnique({ where: { id: requesterId } });
    if (!requester || requester.role !== 'super_admin') {
      throw new ConflictException('Elevated clearance required for this operation.');
    }

    const isMatch = await bcrypt.compare(adminPassword, requester.password);
    if (!isMatch) {
      throw new ConflictException('Authorization key invalid. Access denied.');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      throw new ConflictException('Target identity not found.');
    }

    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const randomChars = Math.random().toString(36).substring(2, 4).toUpperCase();
    
    let prefix = 'INV';
    if (targetUser.role === 'super_admin') prefix = 'SYS';
    else if (targetUser.role === 'admin') prefix = 'ADM';
    else if (targetUser.role === 'payroll_admin') prefix = 'PAY';
    
    const plainPassword = `${prefix}-${randomChars}${randomDigits}`;
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return {
      username: targetUser.username,
      plainPassword,
    };
  }
}
