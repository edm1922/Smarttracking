import { Module } from '@nestjs/common';
import { PurchaseRequestsService } from './purchase-requests.service';
import { PurchaseRequestsController } from './purchase-requests.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  controllers: [PurchaseRequestsController],
  providers: [PurchaseRequestsService],
  imports: [PrismaModule],
})
export class PurchaseRequestsModule {}
