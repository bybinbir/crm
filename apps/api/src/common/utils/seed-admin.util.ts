/**
 * Seed Admin User Utility
 * Creates or updates admin user on bootstrap using env credentials
 */

import type { PrismaClient } from '@prisma/client';

import { hashPassword } from './encryption.util';

export async function seedAdminUser(prisma: PrismaClient): Promise<void> {
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

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
