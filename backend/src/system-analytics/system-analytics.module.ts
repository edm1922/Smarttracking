import { Module } from '@nestjs/common';
import { SystemAnalyticsController } from './system-analytics.controller';
import { SystemAnalyticsService } from './system-analytics.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SystemAnalyticsController],
  providers: [SystemAnalyticsService],
})
export class SystemAnalyticsModule {}
