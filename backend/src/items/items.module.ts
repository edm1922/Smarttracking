import { Module } from '@nestjs/common';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LogsModule } from '../logs/logs.module';
import { ManagementModule } from '../management.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [PrismaModule, LogsModule, ManagementModule, ProductsModule],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService],
})
export class ItemsModule {}
