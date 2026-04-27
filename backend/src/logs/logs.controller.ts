import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { LogsService } from './logs.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  @UseGuards(AuthGuard)
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
  ) {
    return this.logsService.findAll({
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 20,
      search,
    });
  }

  @Get('item/:itemId')
  @UseGuards(AuthGuard)
  findByItem(
    @Param('itemId') itemId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
  ) {
    return this.logsService.findByItem(itemId, {
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 20,
      search,
    });
  }
}
