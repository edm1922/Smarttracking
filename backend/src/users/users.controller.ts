import { Controller, Get, Post, Body, Delete, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Request() req: any) {
    // Only super_admins can see the full user list
    if (req.user.role !== 'super_admin') {
      throw new ForbiddenException('Only system admins can view users');
    }
    return this.usersService.findAll();
  }

  @Post()
  create(@Request() req: any, @Body() data: { username: string; role: 'admin' | 'inventory' | 'super_admin' }) {
    // Only super_admins can create new users
    if (req.user.role !== 'super_admin') {
      throw new ForbiddenException('Only system admins can create users');
    }
    return this.usersService.create(data);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    // Only super_admins can delete users
    if (req.user.role !== 'super_admin') {
      throw new ForbiddenException('Only system admins can delete users');
    }
    return this.usersService.remove(id);
  }
  
  @Post('reveal/:id')
  revealCredential(@Request() req: any, @Param('id') id: string, @Body('adminPassword') adminPassword: string) {
    return this.usersService.revealCredential(id, adminPassword, req.user.sub);
  }
  

  @Get('chat-partners')
  findChatPartners(@Request() req: any) {
    const userRole = req.user.role;
    // System admins see all admins, admins see all staff, staff see all admins
    if (userRole === 'super_admin') {
        return this.usersService.findAll();
    }
    const targetRole = userRole === 'admin' ? 'inventory' : 'admin';
    return this.usersService.findByRole(targetRole);
  }
}
