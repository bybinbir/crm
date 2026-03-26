import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validate } from './common/config/env.validation';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';

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
  ],
})
export class AppModule {}
