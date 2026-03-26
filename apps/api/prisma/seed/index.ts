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
  // IMPORTANT: admin@bullvar.com is the canonical admin email
  // The 'admin' username is an alias that maps to this email in auth service
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@bullvar.com';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin';

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log(`✅ Admin user already exists: ${adminEmail}`);
    console.log(`ℹ️  You can login with: admin@bullvar.com / admin`);
    console.log(`ℹ️  Or use the username shortcut: admin / admin`);
    return;
  }

  // Create admin user
  const passwordHash = hashPassword(adminPassword);

  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      name: 'System Administrator',
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log(`✅ Created admin user: ${adminUser.email}`);
  console.log(`📧 Email: ${adminEmail}`);
  console.log(`🔑 Password: ${adminPassword}`);
  console.log('');
  console.log('✨ Login options:');
  console.log('   1. Email: admin@bullvar.com / Password: admin');
  console.log('   2. Username shortcut: admin / Password: admin');
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
