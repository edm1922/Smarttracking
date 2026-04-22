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

  async create(data: { username: string; role: 'admin' | 'inventory' }) {
    const existing = await this.prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existing) {
      throw new ConflictException('Username already exists');
    }

    // Generate a simple, easy-to-read password for mobile users
    const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4 digits
    const randomChars = Math.random().toString(36).substring(2, 4).toUpperCase(); // 2 chars
    const plainPassword = `${data.role === 'admin' ? 'ADM' : 'INV'}-${randomChars}${randomDigits}`;
    
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        username: data.username,
        password: hashedPassword,
        role: data.role,
      },
    });

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      plainPassword, // Return the plain password ONCE so the admin can give it to the user
    };
  }

  async remove(id: string) {
    // Prevent deleting the last admin if necessary, but for now just basic delete
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
