# CRM Analiz - Remote Deployment Execution Steps

## Infrastructure Setup Complete ✅

You've successfully run:

- System packages installed
- Docker installed
- pnpm installed
- Deploy user created
- Directories created
- Firewall configured

---

## Next: Deploy Application

### Step 1: Transfer Repository

**On your local machine (Git Bash):**

```bash
cd /f/crmanaliz
tar --exclude='node_modules' --exclude='.next' --exclude='dist' --exclude='.git' --exclude='coverage' -czf /tmp/crm-deploy.tar.gz .

# Transfer to server
scp /tmp/crm-deploy.tar.gz root@194.15.45.47:/tmp/
```

**On server:**

```bash
cd /opt/crm-analiz/app
tar -xzf /tmp/crm-deploy.tar.gz
chown -R deploy:deploy /opt/crm-analiz
```

### Step 2: Generate Environment Secrets

```bash
# Generate random secrets
JWT_ACCESS=$(openssl rand -base64 32)
JWT_REFRESH=$(openssl rand -base64 32)
ENCRYPT_KEY=$(openssl rand -base64 32)
DB_PASS=$(openssl rand -base64 16 | tr -d '/+=' | head -c 16)
REDIS_PASS=$(openssl rand -base64 16 | tr -d '/+=' | head -c 16)

# Display (save these!)
echo "=== Generated Secrets (SAVE SECURELY) ==="
echo "JWT_ACCESS_SECRET=$JWT_ACCESS"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH"
echo "ENCRYPTION_KEY=$ENCRYPT_KEY"
echo "DB_PASSWORD=$DB_PASS"
echo "REDIS_PASSWORD=$REDIS_PASS"
```

### Step 3: Create Environment File

```bash
cat > /opt/crm-analiz/env/.env << EOF
# Application
NODE_ENV=production
PORT=4000

# Web
NEXT_PUBLIC_API_URL=http://analiz.binbirnet.com.tr:4000/api/v1

# Database
DATABASE_URL=postgresql://crmanaliz:${DB_PASS}@postgres:5432/crmanaliz
POSTGRES_DB=crmanaliz
POSTGRES_USER=crmanaliz
POSTGRES_PASSWORD=${DB_PASS}

# Redis
REDIS_URL=redis://:${REDIS_PASS}@redis:6379
REDIS_PASSWORD=${REDIS_PASS}

# JWT
JWT_ACCESS_SECRET=${JWT_ACCESS}
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=${JWT_REFRESH}
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=${ENCRYPT_KEY}

# Admin
DEFAULT_ADMIN_EMAIL=admin@bullvar.com
DEFAULT_ADMIN_PASSWORD=Admin2025!Bullvar

# ISSmanager
ISSMANAGER_DEFAULT_TIMEOUT_MS=30000

# CORS
CORS_ORIGIN=http://analiz.binbirnet.com.tr,https://analiz.binbirnet.com.tr

# Logging
LOG_LEVEL=info

# Features
ENABLE_SWAGGER=false
ENABLE_METRICS=true

# URLs
APP_URL=http://analiz.binbirnet.com.tr
API_URL=http://analiz.binbirnet.com.tr:4000/api
EOF

# Link env files
ln -sf /opt/crm-analiz/env/.env /opt/crm-analiz/app/.env
ln -sf /opt/crm-analiz/env/.env /opt/crm-analiz/app/apps/api/.env

# Secure permissions
chmod 600 /opt/crm-analiz/env/.env
chown deploy:deploy /opt/crm-analiz/env/.env
```

### Step 4: Update compose.yaml for Production

```bash
cd /opt/crm-analiz/app

# Update compose.yaml to use .env file
cat > compose.yaml << 'COMPOSE_EOF'
services:
  postgres:
    image: postgres:16-alpine
    container_name: crmanaliz-postgres
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U crmanaliz']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: crmanaliz-redis
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', '--pass', '${REDIS_PASSWORD}', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    container_name: crmanaliz-api
    environment:
      NODE_ENV: production
      PORT: 4000
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    ports:
      - '4000:4000'
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  web:
    build:
      context: .
      dockerfile: Dockerfile.web
    container_name: crmanaliz-web
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    ports:
      - '3000:3000'
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
COMPOSE_EOF
```

### Step 5: Create Dockerfiles

**API Dockerfile:**

```bash
cat > /opt/crm-analiz/app/Dockerfile.api << 'API_DOCKERFILE'
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/*/package.json ./packages/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @crmanaliz/api build

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/main.js"]
API_DOCKERFILE

# Web Dockerfile
cat > /opt/crm-analiz/app/Dockerfile.web << 'WEB_DOCKERFILE'
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/*/package.json ./packages/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @crmanaliz/web build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/

WORKDIR /app/apps/web
EXPOSE 3000
CMD ["pnpm", "start"]
WEB_DOCKERFILE
```

### Step 6: Build and Deploy

```bash
# Switch to deploy user
su - deploy
cd /opt/crm-analiz/app

# Install dependencies
pnpm install --frozen-lockfile

# Build locally first (faster than in Docker)
pnpm build

# Start infrastructure
docker compose up -d postgres redis

# Wait for health checks
echo "Waiting for databases to be healthy..."
sleep 20

# Verify infrastructure
docker compose ps
docker exec crmanaliz-postgres pg_isready -U crmanaliz
docker exec crmanaliz-redis redis-cli --pass "${REDIS_PASSWORD}" ping
```

### Step 7: Run Migrations and Seed

```bash
cd /opt/crm-analiz/app/apps/api

# Generate Prisma Client
npx prisma generate

# Apply migrations
npx prisma migrate deploy

# Seed database
npx prisma db seed

# Verify
docker exec crmanaliz-postgres psql -U crmanaliz -d crmanaliz -c "\dt"
docker exec crmanaliz-postgres psql -U crmanaliz -d crmanaliz -c "SELECT email, role FROM users;"
```

### Step 8: Start Application

```bash
cd /opt/crm-analiz/app

# Build and start API and Web
docker compose up -d --build api web

# Wait for startup
sleep 15

# Check all containers
docker compose ps

# Check logs
docker compose logs api --tail=50
docker compose logs web --tail=50
```

### Step 9: Validation

```bash
# API Health
curl http://localhost:4000/api/v1/health

# Login Test
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bullvar.com","password":"Admin2025!Bullvar"}'

# Save access token from response
export TOKEN="<paste-access-token-here>"

# Test protected endpoint
curl http://localhost:4000/api/v1/audit-logs \
  -H "Authorization: Bearer $TOKEN"

# Web app
curl -I http://localhost:3000/
```

### Step 10: Configure External Access (Optional)

**Install Nginx:**

```bash
apt-get install -y nginx

cat > /etc/nginx/sites-available/crmanaliz << 'NGINX_EOF'
server {
    listen 80;
    server_name analiz.binbirnet.com.tr;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api {
        proxy_pass http://localhost:4000/api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/crmanaliz /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

**Install SSL (Optional):**

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d analiz.binbirnet.com.tr --non-interactive --agree-tos -m admin@bullvar.com
```

---

## Quick Reference

**Start all services:**

```bash
docker compose up -d
```

**Stop all services:**

```bash
docker compose stop
```

**View logs:**

```bash
docker compose logs -f
docker compose logs api -f
docker compose logs web -f
```

**Restart a service:**

```bash
docker compose restart api
docker compose restart web
```

**Check status:**

```bash
docker compose ps
```

**Database backup:**

```bash
docker exec crmanaliz-postgres pg_dump -U crmanaliz crmanaliz > /opt/crm-analiz/backups/backup-$(date +%Y%m%d-%H%M%S).sql
```

---

## Access Information

**After successful deployment:**

- **Web:** http://analiz.binbirnet.com.tr (or http://194.15.45.47:3000)
- **API:** http://analiz.binbirnet.com.tr:4000/api/v1
- **Admin Login:** admin@bullvar.com / Admin2025!Bullvar

**With Nginx configured:**

- **Web:** http://analiz.binbirnet.com.tr
- **API:** http://analiz.binbirnet.com.tr/api/v1

---

## Troubleshooting

**Container won't start:**

```bash
docker compose logs [service]
docker compose restart [service]
docker compose up -d --build [service]
```

**Permission denied:**

```bash
chown -R deploy:deploy /opt/crm-analiz
chmod 600 /opt/crm-analiz/env/.env
```

**Port already in use:**

```bash
lsof -i :4000
lsof -i :3000
kill -9 [PID]
```

**Database connection error:**

```bash
docker exec crmanaliz-postgres psql -U crmanaliz -d crmanaliz -c "SELECT 1;"
cat /opt/crm-analiz/env/.env | grep DATABASE_URL
```

---

## Security Checklist

- [ ] Change admin password after first login
- [ ] Secure `.env` file (chmod 600)
- [ ] Configure firewall (ufw)
- [ ] Install fail2ban
- [ ] Set up SSH keys (disable password auth)
- [ ] Install SSL certificate
- [ ] Regular database backups
- [ ] Monitor logs

---

## Status Report Template

After deployment, report:

```
✅ Infrastructure: Docker, pnpm, user created
✅ Repository: Transferred and extracted
✅ Environment: .env created with secrets
✅ Dependencies: pnpm install completed
✅ Build: pnpm build successful
✅ Containers: postgres ✅ redis ✅ api ✅ web ✅
✅ Migration: Applied successfully
✅ Seed: Admin user created
✅ API Health: OK
✅ Login: Working
✅ Web: Accessible
✅ Audit Logs: Visible

Issues: [none / list any]
```

---

**Ready to proceed with Step 1: Transfer Repository**
