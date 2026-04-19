import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
    
    // Seed default admin user
    try {
      const adminExists = await this.user.findFirst({ where: { role: 'admin' } });
      if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await this.user.create({
          data: {
            username: 'admin',
            password: hashedPassword,
            role: 'admin',
          },
        });
        console.log('Default admin user created: admin / admin123');
      }
    } catch (e) {
      console.error('Failed to seed admin user', e);
    }
  }
}
