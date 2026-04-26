import { Module } from '@nestjs/common';
import { StaffInventoryService } from './staff-inventory.service';
import { StaffInventoryController } from './staff-inventory.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StaffInventoryController],
  providers: [StaffInventoryService],
  exports: [StaffInventoryService],
})
export class StaffInventoryModule {}
