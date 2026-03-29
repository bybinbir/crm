# Local Development Setup

## Prerequisites

- Node.js >=20.0.0
- pnpm >=9.0.0
- PostgreSQL 16+
- Redis 7+

## Installation

### 1. Install PostgreSQL and Redis

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install postgresql-16 redis-server
sudo systemctl start postgresql
sudo systemctl start redis-server
```

**macOS (Homebrew):**

```bash
brew install postgresql@16 redis
brew services start postgresql@16
brew services start redis
```

**Windows:**

- PostgreSQL: https://www.postgresql.org/download/windows/
- Redis: https://github.com/microsoftarchive/redis/releases

### 2. Create Database

```bash
# Connect as postgres user
sudo -u postgres psql

# Create user and database
CREATE USER crmanaliz WITH PASSWORD 'dev_password';
CREATE DATABASE crmanaliz OWNER crmanaliz;
\q
```

### 3. Verify Services

```bash
# Check PostgreSQL
psql -U crmanaliz -d crmanaliz -h localhost -c "SELECT 1;"

# Check Redis
redis-cli ping
# Should return PONG
```

### 4. Install Node Dependencies

```bash
# From project root
pnpm install
```

### 5. Environment Configuration

```bash
# Copy example environment file
cp .env.example .env.local

# Edit .env.local with your values
# Ensure DATABASE_URL and REDIS_URL point to your local services
```

Example `.env.local`:

```bash
NODE_ENV=development
PORT=4000

# Database
DATABASE_URL=postgresql://crmanaliz:dev_password@localhost:5432/crmanaliz

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-min-32-chars-random-string
JWT_REFRESH_SECRET=another-secret-min-32-chars-random
ENCRYPTION_KEY=development-encryption-key-min-32-chars-for-testing-purposes
```

### 6. Run Database Migrations

```bash
cd apps/api
npx prisma migrate dev
cd ../..
```

### 7. Seed Database

```bash
cd apps/api
npx prisma db seed
cd ../..
```

Default admin credentials:

- Email: admin@bullvar.com
- Password: Admin2025!Bullvar

### 8. Start Development Servers

```bash
# Start all apps
pnpm dev
```

Or start individually:

```bash
# Terminal 1 - API
cd apps/api
pnpm dev

# Terminal 2 - Web
cd apps/web
pnpm dev
```

Access:

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1
- API Docs: http://localhost:4000/api/docs

## Troubleshooting

### Database Connection Error

```bash
# Check PostgreSQL is running
# Linux
sudo systemctl status postgresql

# macOS
brew services list | grep postgresql

# Test connection
psql -U crmanaliz -d crmanaliz -h localhost -p 5432
```

Verify DATABASE_URL in `.env.local` is correct.

### Redis Connection Error

```bash
# Check Redis is running
# Linux
sudo systemctl status redis-server

# macOS
brew services list | grep redis

# Test connection
redis-cli ping
# Should return PONG
```

### Migration Errors

```bash
cd apps/api

# Check migration status
npx prisma migrate status

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Run migrations again
npx prisma migrate dev
```

### Port Already in Use

```bash
# Check what's using port 3000 or 4000
# Linux/macOS
lsof -i :3000
lsof -i :4000

# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :4000

# Kill the process or change port in .env.local
```

### Build Issues

**Error: "ENCRYPTION_KEY environment variable is not set"**

Add to `apps/api/.env`:

```env
ENCRYPTION_KEY=development-encryption-key-min-32-chars-for-testing-purposes
```

**Error: "JWT secrets not set"**

Add to `apps/api/.env`:

```env
JWT_ACCESS_SECRET=development-jwt-access-secret-change-in-production-min-32
JWT_REFRESH_SECRET=development-jwt-refresh-secret-change-in-production-min-32
```

## Development Commands

### Root Level

```bash
pnpm dev          # Start all apps in dev mode
pnpm build        # Build all apps
pnpm lint         # Lint all apps
pnpm typecheck    # TypeScript check all apps
pnpm test         # Run all tests
pnpm clean        # Clean build artifacts
```

### API Only

```bash
cd apps/api
pnpm dev                # Start NestJS dev server
pnpm build              # Build API
pnpm start:prod         # Start production build
```

### Web Only

```bash
cd apps/web
pnpm dev          # Start Next.js dev server
pnpm build        # Build web app
pnpm start        # Start production build
```

### Prisma Commands

```bash
cd apps/api

# Generate Prisma Client
npx prisma generate

# Create new migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database (CAUTION: deletes all data)
npx prisma migrate reset

# Seed database
npx prisma db seed

# Open Prisma Studio (database browser)
npx prisma studio
```

## Environment Variables

### Required for API

```env
DATABASE_URL=postgresql://crmanaliz:dev_password@localhost:5432/crmanaliz
ENCRYPTION_KEY=development-encryption-key-min-32-chars-for-testing-purposes
JWT_ACCESS_SECRET=development-jwt-access-secret-change-in-production-min-32
JWT_REFRESH_SECRET=development-jwt-refresh-secret-change-in-production-min-32
```

### Optional for API

```env
PORT=4000
NODE_ENV=development
REDIS_URL=redis://localhost:6379
DEFAULT_ADMIN_EMAIL=admin@bullvar.com
DEFAULT_ADMIN_PASSWORD=Admin2025!Bullvar
```

### Required for Web

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

## Verification Checklist

Before considering setup complete:

- [ ] PostgreSQL running and accessible
- [ ] Redis running and accessible
- [ ] `pnpm install` completed without errors
- [ ] Database migrations applied
- [ ] Admin user seeded
- [ ] `pnpm dev` starts all services
- [ ] Web app loads at http://localhost:3000
- [ ] API health check at http://localhost:4000/api/v1/health
- [ ] Can login with admin credentials
- [ ] Dashboard loads after login
- [ ] Audit logs visible
- [ ] Integration config page accessible
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` succeeds

## Clean Slate Reset

If you need to start completely fresh:

```bash
# Stop all services
sudo systemctl stop postgresql redis-server  # Linux
brew services stop postgresql@16 redis       # macOS

# Clean build artifacts
pnpm clean
rm -rf node_modules pnpm-lock.yaml
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules

# Drop and recreate database
sudo -u postgres psql -c "DROP DATABASE IF EXISTS crmanaliz;"
sudo -u postgres psql -c "CREATE DATABASE crmanaliz OWNER crmanaliz;"

# Start fresh
sudo systemctl start postgresql redis-server  # Linux
brew services start postgresql@16 redis       # macOS

pnpm install
cd apps/api
npx prisma migrate dev
npx prisma db seed
cd ../..
pnpm dev
```

## Next Steps

- Review [ENVIRONMENT.md](ENVIRONMENT.md) for detailed environment configuration
- Review [ARCHITECTURE.md](ARCHITECTURE.md) to understand system design
- Review [GIT_WORKFLOW.md](GIT_WORKFLOW.md) for branching strategy
- Start building features!
