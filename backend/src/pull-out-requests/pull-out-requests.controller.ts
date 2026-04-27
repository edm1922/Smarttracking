import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req, Delete, Query } from '@nestjs/common';
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

  @Get()
  async findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
  ) {
    return this.pullOutRequestsService.findAll({
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 20,
      search,
    });
  }

  @Get('mine')
  async findMine(
    @Req() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
  ) {
    return this.pullOutRequestsService.findByUser(req.user.sub, {
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 20,
      search,
    });
  }

  @Get('pending')
  async findAllPending(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
  ) {
    return this.pullOutRequestsService.findAllPending({
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 20,
      search,
    });
  }

  @Patch(':id/approve')
  async approve(@Param('id') id: string, @Req() req: any) {
    return this.pullOutRequestsService.approve(id, req.user.sub);
  }

  @Patch(':id/reject')
  async reject(@Param('id') id: string, @Req() req: any) {
    return this.pullOutRequestsService.reject(id, req.user.sub);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.pullOutRequestsService.remove(id);
  }
}
