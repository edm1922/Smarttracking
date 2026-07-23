import { Module } from '@nestjs/common';
import { TransmittalsService } from './transmittals.service';
import { TransmittalsController } from './transmittals.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  controllers: [TransmittalsController],
  providers: [TransmittalsService],
  imports: [PrismaModule],
})
export class TransmittalsModule {}
