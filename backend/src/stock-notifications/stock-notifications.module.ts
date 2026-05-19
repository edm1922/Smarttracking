import { Module } from '@nestjs/common';
import { StockNotificationsController } from './stock-notifications.controller';
import { StockNotificationsService } from './stock-notifications.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StockNotificationsController],
  providers: [StockNotificationsService],
})
export class StockNotificationsModule {}
