import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { LogsService } from './logs.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  @UseGuards(AuthGuard)
  findAll() {
    return this.logsService.findAll();
  }

  @Get('item/:itemId')
  @UseGuards(AuthGuard)
  findByItem(@Param('itemId') itemId: string) {
    return this.logsService.findByItem(itemId);
  }
}
