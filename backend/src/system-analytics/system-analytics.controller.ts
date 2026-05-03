import { Controller, Get, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { SystemAnalyticsService } from './system-analytics.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('system-analytics')
@UseGuards(AuthGuard)
export class SystemAnalyticsController {
  constructor(private readonly analyticsService: SystemAnalyticsService) {}

  @Get('traffic')
  getTraffic(@Request() req: any, @Query('days') days: string) {
    if (req.user.role !== 'super_admin') {
      throw new ForbiddenException('Only system admins can access analytics');
    }
    return this.analyticsService.getTrafficStats(days ? parseInt(days) : 7);
  }

  @Get('usage')
  getUsage(@Request() req: any) {
    if (req.user.role !== 'super_admin') {
      throw new ForbiddenException('Only system admins can access analytics');
    }
    return this.analyticsService.getUsageStats();
  }
}
