import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
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
    const cleanUsername = data.username.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { username: cleanUsername },
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
          username: cleanUsername,
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

  async verifyAdminPassword(userId: string, password: string): Promise<{ success: boolean }> {
    const [currentUser, superAdmin] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.user.findFirst({ where: { role: 'super_admin', username: 'admin' } }),
    ]);

    if (!currentUser) throw new BadRequestException('User not found');
    
    // Check current user's password
    const isMatchCurrent = await bcrypt.compare(password, currentUser.password);
    if (isMatchCurrent) return { success: true };

    // If that fails, check against super admin (if different)
    if (superAdmin && superAdmin.id !== currentUser.id) {
      const isMatchSuper = await bcrypt.compare(password, superAdmin.password);
      if (isMatchSuper) return { success: true };
    }

    return { success: false };
  }
}
