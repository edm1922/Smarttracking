import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { PullOutRequestsService } from './pull-out-requests.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('pull-out-requests')
@UseGuards(AuthGuard)
export class PullOutRequestsController {
  constructor(private readonly pullOutRequestsService: PullOutRequestsService) {}

  @Post()
  async create(@Body() data: any, @Req() req: any) {
    return this.pullOutRequestsService.create({
      ...data,
      userId: req.user.sub,
    });
  }

  @Get('pending')
  async findAllPending() {
    return this.pullOutRequestsService.findAllPending();
  }

  @Patch(':id/approve')
  async approve(@Param('id') id: string, @Req() req: any) {
    return this.pullOutRequestsService.approve(id, req.user.sub);
  }

  @Patch(':id/reject')
  async reject(@Param('id') id: string, @Req() req: any) {
    return this.pullOutRequestsService.reject(id, req.user.sub);
  }
}
