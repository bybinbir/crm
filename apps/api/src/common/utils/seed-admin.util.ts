/**
 * Seed Admin User Utility
 * Creates or updates admin@admin.com user on bootstrap
 */

import type { PrismaClient } from '@prisma/client';

import { hashPassword } from './encryption.util';

export async function seedAdminUser(prisma: PrismaClient): Promise<void> {
  const adminEmail = 'admin@admin.com';
  const adminPassword = 'admin';

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    const passwordHash = hashPassword(adminPassword);

    if (existingUser) {
      // Update password
      await prisma.user.update({
        where: { email: adminEmail },
        data: {
          passwordHash,
          isActive: true,
        },
      });

      // console.log(`✅ Admin user updated: ${adminEmail}`);
    } else {
      // Create new admin user
      await prisma.user.create({
        data: {
          email: adminEmail,
          name: 'Admin User',
          passwordHash,
          role: 'SUPER_ADMIN',
          isActive: true,
        },
      });

      // console.log(`✅ Admin user created: ${adminEmail}`);
    }
  } catch (error) {
    console.error('❌ Failed to seed admin user:', error);
    throw error;
  }
}
