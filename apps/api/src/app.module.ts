import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validate } from './common/config/env.validation';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { AutomationModule } from './modules/automation/automation.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { ImportsModule } from './modules/imports/imports.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { NeighborhoodsModule } from './modules/neighborhoods/neighborhoods.module';
// import { UsersModule } from './modules/users/users.module'; // Not in production yet

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate,
    }),
    AuthModule,
    HealthModule,
    IntegrationsModule,
    AuditModule,
    ImportsModule,
    CustomersModule,
    DashboardModule,
    NeighborhoodsModule,
    AutomationModule,
    // UsersModule, // Not in production yet
  ],
})
export class AppModule {}
