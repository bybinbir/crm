/**
 * Prisma Service
 * Manages database connection lifecycle
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Clean all data from database (for testing only)
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    // Delete in correct order to respect foreign key constraints
    await this.$transaction([
      this.auditLog.deleteMany(),
      this.integrationSyncRun.deleteMany(),
      this.integrationConfig.deleteMany(),
      this.customerSnapshot.deleteMany(),
      this.personnelSnapshot.deleteMany(),
      this.financeSnapshot.deleteMany(),
      this.neighborhood.deleteMany(),
      this.userSession.deleteMany(),
      this.user.deleteMany(),
    ]);
  }
}
