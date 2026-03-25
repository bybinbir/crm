# Local Development Setup

## Prerequisites

- Node.js >=20.0.0
- pnpm >=9.0.0
- PostgreSQL 16+ (via Docker or local installation)
- Redis 7+ (via Docker or local installation)

## Option 1: Docker Compose (Recommended)

### 1. Start Services

```bash
# Start PostgreSQL and Redis only
docker compose up -d postgres redis

# Or start all services including API and Web
docker compose up -d
```

### 2. Verify Services

```bash
# Check services are running
docker compose ps

# Check PostgreSQL
docker exec -it crmanaliz-postgres psql -U crmanaliz -d crmanaliz -c "SELECT 1;"

# Check Redis
docker exec -it crmanaliz-redis redis-cli ping
```

### 3. Run Migrations

```bash
cd apps/api
npx prisma migrate dev
```

### 4. Seed Database

```bash
cd apps/api
npx prisma db seed
```

Default admin credentials:

- Email: `admin@crmanaliz.local`
- Password: `Admin123!`

### 5. Start Development Servers

```bash
# From project root
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

### 6. Access Applications

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1
- API Health: http://localhost:4000/api/v1/health

## Option 2: Manual PostgreSQL/Redis Setup

If you have PostgreSQL and Redis installed locally without Docker:

### 1. Create Database

```bash
createdb crmanaliz
createuser crmanaliz
psql -c "ALTER USER crmanaliz WITH PASSWORD 'dev_password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE crmanaliz TO crmanaliz;"
```

### 2. Configure Environment

Ensure `apps/api/.env` has correct DATABASE_URL:

```env
DATABASE_URL=postgresql://crmanaliz:dev_password@localhost:5432/crmanaliz
```

### 3. Start Redis

```bash
redis-server
```

Or with password:

```bash
redis-server --requirepass dev_password_change_in_production
```

### 4. Follow steps 3-6 from Option 1

## Prisma Commands

```bash
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

## Troubleshooting

### Docker Compose Issues

**Error: "docker: command not found"**

- Install Docker Desktop for Windows/Mac
- Ensure Docker service is running

**Error: "port already allocated"**

- Check if PostgreSQL/Redis already running locally
- Stop local instances or change ports in compose.yaml

### Migration Issues

**Error: "Can't reach database server"**

- Verify DATABASE_URL is correct
- Check PostgreSQL is running: `docker compose ps` or `psql -h localhost -U crmanaliz`

**Error: "relation does not exist"**

- Run migrations: `npx prisma migrate dev`
- Or reset: `npx prisma migrate reset` (DELETES DATA)

### Seed Issues

**Error: "Cannot find module"**

- Ensure dependencies installed: `pnpm install`
- Check prisma client generated: `npx prisma generate`

**Error: "Admin user already exists"**

- This is expected if seed already ran
- To recreate, reset database first: `npx prisma migrate reset`

### Build Issues

**Error: "ENCRYPTION_KEY environment variable is not set"**

- Add to `apps/api/.env`:
  ```env
  ENCRYPTION_KEY=development-encryption-key-min-32-chars-for-testing-purposes
  ```

**Error: "JWT secrets not set"**

- Add to `apps/api/.env`:
  ```env
  JWT_ACCESS_SECRET=development-jwt-access-secret-change-in-production-min-32
  JWT_REFRESH_SECRET=development-jwt-refresh-secret-change-in-production-min-32
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
DEFAULT_ADMIN_EMAIL=admin@crmanaliz.local
DEFAULT_ADMIN_PASSWORD=Admin123!
```

### Required for Web

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

## Verification Checklist

After setup, verify everything works:

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` succeeds
- [ ] PostgreSQL accessible (psql or Docker)
- [ ] Redis accessible (redis-cli or Docker)
- [ ] Migrations applied (`npx prisma migrate status`)
- [ ] Admin user seeded (check with Prisma Studio)
- [ ] API starts without errors (`pnpm --filter @crmanaliz/api dev`)
- [ ] Web starts without errors (`pnpm --filter @crmanaliz/web dev`)
- [ ] Login page loads (http://localhost:3000/login)
- [ ] Can login with admin credentials
- [ ] Dashboard loads after login
- [ ] Audit logs visible
- [ ] Integration config page accessible

## Clean Reset

To completely reset local environment:

```bash
# Stop all services
docker compose down -v

# Clean build artifacts
pnpm clean

# Reinstall dependencies
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install

# Start fresh
docker compose up -d postgres redis
cd apps/api
npx prisma migrate dev
npx prisma db seed
cd ../..
pnpm dev
```
