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
import { BudgetRequestsModule } from './budget-requests/budget-requests.module';
import { InternalRequestsModule } from './internal-requests/internal-requests.module';
import { UsersModule } from './users/users.module';
import { PullOutRequestsModule } from './pull-out-requests/pull-out-requests.module';
import { StaffInventoryModule } from './staff-inventory/staff-inventory.module';
import { RsqModule } from './rsq/rsq.module';
import { StockNotificationsModule } from './stock-notifications/stock-notifications.module';
import { TransmittalsModule } from './transmittals/transmittals.module';

import { ReportsModule } from './reports/reports.module';
import { SystemAnalyticsModule } from './system-analytics/system-analytics.module';
import { PayrollModule } from './payroll/payroll.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TrafficInterceptor } from './common/interceptors/traffic.interceptor';


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
    BudgetRequestsModule,
    InternalRequestsModule,
    UsersModule,
    PullOutRequestsModule,
    StaffInventoryModule,
    RsqModule,
    StockNotificationsModule,
    TransmittalsModule,

    ReportsModule,
    SystemAnalyticsModule,
    PayrollModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TrafficInterceptor,
    },
  ],
})
export class AppModule {}
