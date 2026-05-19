import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { StockNotificationsService } from './stock-notifications.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('stock-notifications')
@UseGuards(AuthGuard)
export class StockNotificationsController {
  constructor(private readonly stockNotificationsService: StockNotificationsService) {}

  @Post()
  async create(@Body() body: any, @Req() req: any) {
    return this.stockNotificationsService.create({
      ...body,
      createdBy: req.user.sub,
    });
  }

  @Get('active')
  async findActive() {
    return this.stockNotificationsService.findActive();
  }

  @Patch(':id/dismiss')
  async dismiss(@Param('id') id: string) {
    return this.stockNotificationsService.dismiss(id);
  }
}
