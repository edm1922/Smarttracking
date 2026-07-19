import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BudgetRequestsController } from './budget-requests.controller';
import { BudgetRequestsService } from './budget-requests.service';

@Module({
  imports: [PrismaModule],
  controllers: [BudgetRequestsController],
  providers: [BudgetRequestsService],
})
export class BudgetRequestsModule {}
