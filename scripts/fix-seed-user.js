const crypto = require('crypto');
const { Pool } = require('pg');

const SALT_LENGTH = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function fixSeedUser() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://crmadmin:n1kU9b0d3MxZMHgl8H0VbvhZqbM5jv@localhost:5432/crmanaliz'
  });

  try {
    console.log('=== Fixing Seed User Password Hash ===\n');

    // Generate proper hash for 'admin' password
    const passwordHash = hashPassword('admin');
    console.log('✓ Generated hash for password: admin');
    console.log(`  Hash format: salt:hash (${passwordHash.length} chars)\n`);

    // Update admin@test.com
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2 RETURNING email, role',
      [passwordHash, 'admin@test.com']
    );

    if (result.rowCount > 0) {
      console.log('✓ Updated user:', result.rows[0].email, `(${result.rows[0].role})`);
      console.log('\n=== ✅ SEED USER FIXED ===');
    } else {
      console.error('❌ User admin@test.com not found');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixSeedUser();
