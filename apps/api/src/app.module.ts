import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validate } from './common/config/env.validation';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { ImportsModule } from './modules/imports/imports.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { NeighborhoodsModule } from './modules/neighborhoods/neighborhoods.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate,
    }),
    HealthModule,
    AuthModule,
    IntegrationsModule,
    AuditModule,
    ImportsModule,
    CustomersModule,
    DashboardModule,
    NeighborhoodsModule,
  ],
})
export class AppModule {}
