import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ItemsModule } from './items/items.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { LogsModule } from './logs/logs.module';
import { ManagementModule } from './management.module';
import { LocationsModule } from './locations/locations.module';
import { ProductsModule } from './products/products.module';
import { PurchaseRequestsModule } from './purchase-requests/purchase-requests.module';
import { InternalRequestsModule } from './internal-requests/internal-requests.module';
import { UsersModule } from './users/users.module';
import { PullOutRequestsModule } from './pull-out-requests/pull-out-requests.module';
import { StaffInventoryModule } from './staff-inventory/staff-inventory.module';
import { ChatModule } from './chat/chat.module';
import { ReportsModule } from './reports/reports.module';


@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 60,
    }),
    PrismaModule,
    AuthModule,
    ItemsModule,
    CustomFieldsModule,
    LogsModule,
    ManagementModule,
    LocationsModule,
    ProductsModule,
    PurchaseRequestsModule,
    InternalRequestsModule,
    UsersModule,
    PullOutRequestsModule,
    StaffInventoryModule,
    ChatModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
