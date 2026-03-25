/**
 * Database Seed Script
 * Creates initial admin user for development and testing
 */

import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../../src/common/utils/encryption.util';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Get credentials from environment or use defaults
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@crmanaliz.local';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!';

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log(`✅ Admin user already exists: ${adminEmail}`);
    return;
  }

  // Create admin user
  const passwordHash = hashPassword(adminPassword);

  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log(`✅ Created admin user: ${adminUser.email}`);
  console.log(`📧 Email: ${adminEmail}`);
  console.log(`🔑 Password: ${adminPassword}`);
  console.log('');
  console.log('⚠️  IMPORTANT: Change this password immediately in production!');

  console.log('');
  console.log('🌱 Database seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error during seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
