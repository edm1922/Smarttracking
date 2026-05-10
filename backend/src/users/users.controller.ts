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
    // Both super_admins and inventory admins can see users
    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      throw new ForbiddenException('Insufficient permissions to view users');
    }
    return this.usersService.findAll();
  }

  @Post()
  create(@Request() req: any, @Body() data: { username: string; role: 'admin' | 'inventory' | 'super_admin' | 'payroll_admin' | 'payroll_staff' }) {
    // Both super_admins and inventory admins can create new staff
    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      throw new ForbiddenException('Insufficient permissions to create users');
    }
    
    // Safety check: only super_admins can create other admins or super_admins
    if (req.user.role !== 'super_admin' && (data.role === 'super_admin' || data.role === 'admin' || data.role === 'payroll_admin')) {
      throw new ForbiddenException('You can only create Staff level accounts');
    }
    
    return this.usersService.create(data);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    // Only super_admins can delete users
    // Only super_admins or the owner can delete (but here it's admin management)
    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      throw new ForbiddenException('Insufficient permissions to delete users');
    }
    return this.usersService.remove(id);
  }
  
  @Post('reveal/:id')
  revealCredential(@Request() req: any, @Param('id') id: string, @Body('adminPassword') adminPassword: string) {
    return this.usersService.revealCredential(id, adminPassword, req.user.sub);
  }

  @Post('verify-password')
  verifyPassword(@Request() req: any, @Body('password') password: string) {
    return this.usersService.verifyAdminPassword(req.user.sub, password);
  }
}
