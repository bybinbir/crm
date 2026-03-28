# Production Environment Requirements

## Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/crmanaliz
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=crmanaliz
DATABASE_USER=<user>
DATABASE_PASSWORD=<strong-password>

# JWT Secrets (min 32 chars)
JWT_ACCESS_SECRET=<production-secret>
JWT_REFRESH_SECRET=<production-secret>

# Encryption
ENCRYPTION_KEY=<production-key>

# Admin Bootstrap
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=<strong-password>

# CORS
CORS_ORIGIN=https://<production-domain>

# Application
NODE_ENV=production
PORT=3001
APP_URL=https://<production-domain>
API_URL=https://<production-domain>/api/v1
NEXT_PUBLIC_API_URL=https://<production-domain>
```

## Required Services

- PostgreSQL 16+
- Node.js 24+
- pnpm 9+
- nginx
- systemd

## Required systemd Units

- crmanaliz-api.service
- crmanaliz-web.service

## Disk Requirements

- Minimum 10GB free space
- Backup directory writable

## Network

- Port 80/443 for nginx
- Port 3001 for API (internal)
- Port 3000 for Web (internal)
