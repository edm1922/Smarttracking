import { Controller, Get, Post, Body, Delete, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Request() req: any) {
    // Only admins can see the full user list
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can view users');
    }
    return this.usersService.findAll();
  }

  @Post()
  create(@Request() req: any, @Body() data: { username: string; role: 'admin' | 'inventory' }) {
    // Only admins can create new users
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can create users');
    }
    return this.usersService.create(data);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    // Only admins can delete users
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can delete users');
    }
    return this.usersService.remove(id);
  }
}
