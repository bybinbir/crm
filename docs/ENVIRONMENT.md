# Environment Setup

## Prerequisites

### Required Software

| Software | Minimum Version | Recommended Version | Purpose                     |
| -------- | --------------- | ------------------- | --------------------------- |
| Node.js  | 20.0.0          | 20.11+ (LTS)        | Runtime                     |
| pnpm     | 9.0.0           | 9.15+               | Package manager             |
| Git      | 2.30+           | Latest              | Version control             |
| Docker   | 20.10+          | Latest              | Containerization (optional) |
| VS Code  | Latest          | Latest              | IDE (recommended)           |

### Installation Links

- **Node.js:** https://nodejs.org/ (Install LTS version)
- **pnpm:** `npm install -g pnpm` or https://pnpm.io/installation
- **Git:** https://git-scm.com/downloads
- **Docker:** https://docs.docker.com/get-docker/
- **VS Code:** https://code.visualstudio.com/

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_ORG/crmanaliz.git
cd crmanaliz
```

### 2. Install pnpm (if not installed)

```bash
npm install -g pnpm
```

Verify installation:

```bash
pnpm --version
# Should output 9.15.4 or higher
```

### 3. Install Dependencies

```bash
pnpm install
```

This will:

- Install all dependencies for all workspaces
- Set up Husky git hooks
- Prepare the development environment

### 4. Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```bash
# Required for local development
NODE_ENV=development
PORT=4000

# Web App
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

# Database (if using Docker)
DATABASE_URL=postgresql://crmanaliz:dev_password@localhost:5432/crmanaliz

# Redis (if using Docker)
REDIS_URL=redis://localhost:6379

# JWT Secrets (generate random strings)
JWT_SECRET=your-secret-min-32-chars-random-string
JWT_REFRESH_SECRET=another-secret-min-32-chars-random

# ISSmanager Integration (placeholder for now)
ISSMANAGER_API_URL=https://your-issmanager-url/api
ISSMANAGER_API_KEY=your-api-key-when-available

# CORS
CORS_ORIGIN=http://localhost:3000
```

**Generate secrets:**

```bash
# Node.js method
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL method
openssl rand -hex 32
```

### 5. Start Services

#### Option A: Docker (Recommended)

Start PostgreSQL and Redis:

```bash
docker compose up -d postgres redis
```

Check services are running:

```bash
docker compose ps
```

#### Option B: Local Installation

Install PostgreSQL and Redis locally:

**macOS (Homebrew):**

```bash
brew install postgresql@16 redis
brew services start postgresql@16
brew services start redis
```

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install postgresql-16 redis-server
sudo systemctl start postgresql
sudo systemctl start redis
```

**Windows:**

- PostgreSQL: https://www.postgresql.org/download/windows/
- Redis: https://github.com/microsoftarchive/redis/releases

Create database:

```bash
createdb crmanaliz
```

### 6. Start Development Servers

Start all applications:

```bash
pnpm dev
```

This starts:

- Web app: http://localhost:3000
- API server: http://localhost:4000

Or start individually:

```bash
# Web only
cd apps/web
pnpm dev

# API only
cd apps/api
pnpm dev
```

## Development Workflow

### Daily Workflow

```bash
# 1. Pull latest changes
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/my-feature

# 3. Start development
pnpm dev

# 4. Make changes, commit regularly
git add .
git commit -m "feat(scope): description"

# 5. Push to remote
git push origin feature/my-feature

# 6. Create pull request on GitHub
```

### Running Commands

```bash
# Development
pnpm dev          # Start all apps in dev mode
pnpm build        # Build all apps
pnpm lint         # Lint all code
pnpm typecheck    # Type check all code
pnpm test         # Run all tests
pnpm format       # Format all code
pnpm clean        # Clean build outputs

# Individual packages
cd apps/web && pnpm dev
cd apps/api && pnpm dev
```

### Git Hooks

Husky is configured to run:

**pre-commit:**

- Lint staged files
- Format staged files

**commit-msg:**

- Validate commit message format

If hooks fail, fix issues before committing.

## Environment Variables Reference

### Required Variables

| Variable       | Description           | Example                                    |
| -------------- | --------------------- | ------------------------------------------ |
| `NODE_ENV`     | Environment           | `development`                              |
| `PORT`         | API server port       | `4000`                                     |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@localhost:5432/db` |
| `REDIS_URL`    | Redis connection      | `redis://localhost:6379`                   |
| `JWT_SECRET`   | JWT signing secret    | Random 32+ char string                     |
| `CORS_ORIGIN`  | Allowed CORS origin   | `http://localhost:3000`                    |

### Optional Variables

| Variable                 | Description          | Default      |
| ------------------------ | -------------------- | ------------ |
| `LOG_LEVEL`              | Logging level        | `info`       |
| `JWT_EXPIRATION`         | Access token expiry  | `7d`         |
| `JWT_REFRESH_EXPIRATION` | Refresh token expiry | `30d`        |
| `ENABLE_SWAGGER`         | Enable API docs      | `true` (dev) |

### External Services

| Variable             | Description             | When Needed |
| -------------------- | ----------------------- | ----------- |
| `ISSMANAGER_API_URL` | ISSmanager API endpoint | Phase 2     |
| `ISSMANAGER_API_KEY` | ISSmanager API key      | Phase 2     |

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
# macOS/Linux
lsof -i :3000
lsof -i :4000

# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :4000

# Kill process or change port in .env.local
```

### Database Connection Error

```bash
# Check PostgreSQL is running
# Docker
docker compose ps

# Local
# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql

# Test connection
psql -U crmanaliz -d crmanaliz -h localhost -p 5432
```

### Redis Connection Error

```bash
# Check Redis is running
# Docker
docker compose ps

# Local
# macOS
brew services list | grep redis

# Linux
sudo systemctl status redis

# Test connection
redis-cli ping
# Should return PONG
```

### pnpm Install Fails

```bash
# Clear pnpm cache
pnpm store prune

# Remove node_modules and lockfile
rm -rf node_modules pnpm-lock.yaml

# Reinstall
pnpm install
```

### TypeScript Errors

```bash
# Rebuild types
pnpm clean
pnpm build

# Restart TS server in VS Code
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

### Git Hooks Not Working

```bash
# Reinstall Husky
pnpm prepare

# Check hooks are executable
ls -la .husky/
```

## VS Code Setup

### Recommended Extensions

Open VS Code and install recommended extensions:

1. Open Command Palette (Cmd/Ctrl + Shift + P)
2. Type "Extensions: Show Recommended Extensions"
3. Install all recommended extensions

Or install via command line:

```bash
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension bradlc.vscode-tailwindcss
code --install-extension editorconfig.editorconfig
code --install-extension eamodio.gitlens
code --install-extension usernamehw.errorlens
code --install-extension ms-azuretools.vscode-docker
```

### Workspace Settings

Settings are configured in `.vscode/settings.json`. They will be applied automatically.

### TypeScript Version

VS Code should use the workspace TypeScript version:

1. Open any `.ts` file
2. Click TypeScript version in status bar
3. Select "Use Workspace Version"

## Testing Setup

### Run Tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:cov
```

### Test Database (Future)

For integration tests, use a separate test database:

```bash
# .env.test
DATABASE_URL=postgresql://crmanaliz:test_password@localhost:5432/crmanaliz_test
```

## Docker Environment

### Full Stack with Docker

Start everything with Docker:

```bash
docker compose up
```

This starts:

- PostgreSQL
- Redis
- API server (with hot reload)
- Web app (with hot reload)

### Docker Commands

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Rebuild services
docker compose build

# Remove volumes (warning: deletes data)
docker compose down -v
```

### Docker Troubleshooting

```bash
# Check running containers
docker compose ps

# Check logs
docker compose logs api
docker compose logs web
docker compose logs postgres

# Restart service
docker compose restart api

# Shell into container
docker compose exec api sh
docker compose exec postgres psql -U crmanaliz
```

## Production Build

### Local Production Build

```bash
# Build all apps
pnpm build

# Start in production mode
cd apps/web && pnpm start
cd apps/api && pnpm start:prod
```

### Docker Production Build

```bash
# Build production images
docker compose -f docker-compose.prod.yml build

# Start production stack
docker compose -f docker-compose.prod.yml up -d
```

## Next Steps

After setup:

1. ✅ Verify all services running
2. ✅ Access web app: http://localhost:3000
3. ✅ Access API health: http://localhost:4000/api/v1/health
4. 📚 Read [ARCHITECTURE.md](ARCHITECTURE.md)
5. 📚 Read [GIT_WORKFLOW.md](GIT_WORKFLOW.md)
6. 🚀 Start development!

## Getting Help

- Check documentation in `docs/`
- Review `CLAUDE.md` for project rules
- Check `task_dash.md` for current status
- Ask team members
- Create an issue on GitHub

---

**Last Updated:** 2026-03-25
**Version:** 0.1.0
