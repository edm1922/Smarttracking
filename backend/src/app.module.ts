import { Module } from '@nestjs/common';
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

@Module({
  imports: [
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
