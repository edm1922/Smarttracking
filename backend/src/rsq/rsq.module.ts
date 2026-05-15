
import { Module } from '@nestjs/common';
import { RsqService } from './rsq.service';
import { RsqController } from './rsq.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RsqController],
  providers: [RsqService],
  exports: [RsqService],
})
export class RsqModule {}
