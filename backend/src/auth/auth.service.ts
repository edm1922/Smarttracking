import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { LogsService } from '../logs/logs.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private logsService: LogsService,
  ) {}

  async login(username: string, pass: string) {
    const cleanUsername = username.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { username: cleanUsername } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { sub: user.id, username: user.username, role: user.role };
    
    await this.logsService.create({
      userId: user.id,
      action: 'LOGIN',
      changes: { username: user.username }
    });

    return {
      access_token: await this.jwtService.signAsync(payload),
      role: user.role,
      userId: user.id,
    };
  }

  async logout(userId: string) {
    await this.logsService.create({
      userId,
      action: 'LOGOUT',
    });
    return { success: true };
  }
}
