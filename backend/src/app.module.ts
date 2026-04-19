import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ItemsModule } from './items/items.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { LogsModule } from './logs/logs.module';
import { ManagementModule } from './management.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ItemsModule,
    CustomFieldsModule,
    LogsModule,
    ManagementModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
