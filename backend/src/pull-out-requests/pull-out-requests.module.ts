import { Module } from '@nestjs/common';
import { PullOutRequestsService } from './pull-out-requests.service';
import { PullOutRequestsController } from './pull-out-requests.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ItemsModule } from '../items/items.module';

@Module({
  imports: [PrismaModule, ItemsModule],
  providers: [PullOutRequestsService],
  controllers: [PullOutRequestsController],
  exports: [PullOutRequestsService],
})
export class PullOutRequestsModule {}
