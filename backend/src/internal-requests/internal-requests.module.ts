import { Module } from '@nestjs/common';
import { InternalRequestsController } from './internal-requests.controller';
import { InternalRequestsService } from './internal-requests.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InternalRequestsController],
  providers: [InternalRequestsService],
})
export class InternalRequestsModule {}
