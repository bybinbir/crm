-- Add admin@admin.com user with password 'admin'
-- Password hash generated using encryption.util.ts hashPassword function

-- First, delete any existing admin@admin.com user
DELETE FROM "User" WHERE email = 'admin@admin.com';

-- Insert the new admin user
-- Note: Replace PASSWORD_HASH_HERE with actual hash from test-password.js
INSERT INTO "User" (
  id,
  email,
  name,
  "passwordHash",
  role,
  "isActive",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'admin@admin.com',
  'Admin User',
  '9b55a17674f8d574dd417abec1809f2c686408c81f977dae28ae87a5fcd427ea24ae01aa5442a3e5b8f331b4f145bace30d6e1c01e1ec44737e6cb085ce3d0b6:a9cced7024ce021f0511aae5ce451dff0a43750c3829c48a932146fbed663c6e484f34bad6e4272bce900ca4b8172f2444a66a6a5525303a3c920aa5acdc7aba',
  'SUPER_ADMIN',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  "isActive" = true,
  "updatedAt" = NOW();
