/**
 * Database Seed Script
 * Creates initial super admin user for bootstrap
 * Run with: pnpm prisma db seed
 */

import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../../src/common/utils/encryption.util';

const prisma = new PrismaClient();

async function main() {
  const adminEmail =
    process.env.DEFAULT_ADMIN_EMAIL || 'admin@crmanaliz.local';
  const adminPassword =
    process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeMe123!@#';

  // Check if admin already exists
  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    // eslint-disable-next-line no-console
    console.log(` Super admin user already exists: ${adminEmail}`);
    return;
  }

  // Create super admin
  const passwordHash = hashPassword(adminPassword);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      name: 'Super Admin',
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });

  // eslint-disable-next-line no-console
  console.log(` Created super admin user: ${admin.email}`);
  // eslint-disable-next-line no-console
  console.log(`  ID: ${admin.id}`);
  // eslint-disable-next-line no-console
  console.log(`  Role: ${admin.role}`);
  // eslint-disable-next-line no-console
  console.log(
    `\n   IMPORTANT: Change the default password immediately after first login!\n`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error('Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
