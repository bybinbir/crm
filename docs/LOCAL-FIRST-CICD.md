# Local-First CI/CD Foundation

## Overview

This document describes the Continuous Integration and Continuous Deployment (CI/CD) strategy for CRM Analiz Platform using a **local-first** approach. Unlike traditional CI/CD that relies on external services (GitHub Actions, GitLab CI, Jenkins), this strategy works entirely with local infrastructure and a local bare repository.

## Architecture

```
Developer Workstation          Local Bare Repository          Production Server
┌─────────────────┐           ┌──────────────────┐          ┌─────────────────┐
│                 │           │                  │          │                 │
│  Working Tree   │  push     │  f:/crm-analiz-  │  pull    │  Working Tree   │
│  f:\crmanaliz   │ ──────────│  repo.git        │──────────│  /opt/crmanaliz │
│                 │           │                  │          │                 │
│  git commit     │           │  post-receive    │          │  deploy script  │
│  git push       │           │  hook (optional) │          │  runs here      │
│                 │           │                  │          │                 │
└─────────────────┘           └──────────────────┘          └─────────────────┘
```

## Local Bare Repository

### Purpose

- Acts as central "origin" for the project
- Located at: `f:/crm-analiz-repo.git`
- Accessible to both development and production environments
- Provides Git workflow without external dependencies

### Setup

```bash
# Create bare repository
git init --bare f:/crm-analiz-repo.git

# Add as remote in working tree
cd f:\crmanaliz
git remote add origin f:/crm-analiz-repo.git
git push -u origin main
```

## CI/CD Modes

### Mode 1: Manual Deployment (Current)

**Approach**: Developer manually runs deployment script on production server.

**Workflow**:

1. Developer commits and pushes to local bare repo
2. Developer logs into production server
3. Developer runs: `bash scripts/deploy-production.sh`
4. Script pulls latest code, runs quality gates, deploys

**Pros**:

- Simple and explicit
- Full control over deployment timing
- Easy to understand and debug
- No additional infrastructure needed

**Cons**:

- Requires manual intervention
- Deployment consistency depends on operator discipline
- No automatic quality gate enforcement

### Mode 2: Semi-Automated Wrapper (Recommended Next Step)

**Approach**: Wrapper script on developer workstation triggers deployment after push.

**Workflow**:

1. Developer commits changes locally
2. Developer runs: `bash scripts/push-and-deploy.sh`
3. Script pushes to local bare repo
4. Script SSH's into production server
5. Script triggers remote deployment script
6. Script monitors deployment and reports status

**Pros**:

- One-command deployment
- Still explicit and controlled
- Consistent deployment process
- Works without external services

**Cons**:

- Requires SSH access from dev to production
- Network dependency (but local network)
- Still manual trigger

**Implementation**:

```bash
#!/bin/bash
# scripts/push-and-deploy.sh
set -euo pipefail

echo "🚀 Push and Deploy Workflow"

# 1. Push to local bare repo
echo "📤 Pushing to origin..."
git push origin $(git rev-parse --abbrev-ref HEAD)

# 2. SSH to production and deploy
echo "🔗 Connecting to production server..."
PROD_SERVER="${PROD_SERVER:-production.local}"
PROD_USER="${PROD_USER:-deploy}"
PROD_PATH="${PROD_PATH:-/opt/crmanaliz}"

ssh "$PROD_USER@$PROD_SERVER" <<'ENDSSH'
cd /opt/crmanaliz
bash scripts/deploy-production.sh
ENDSSH

echo "✅ Deployment complete!"
```

### Mode 3: Git Hook Automation (Advanced)

**Approach**: post-receive hook in bare repo triggers deployment automatically.

**Workflow**:

1. Developer commits and pushes to local bare repo
2. Bare repo's post-receive hook executes
3. Hook SSH's to production server
4. Hook triggers deployment script
5. Deployment runs automatically

**Pros**:

- Fully automated deployment
- Consistent process every time
- No manual steps after push

**Cons**:

- Less explicit (deployments happen "magically")
- Harder to debug when issues occur
- Requires careful hook implementation
- Can deploy broken code if quality gates not in hook

**Implementation**:

```bash
#!/bin/bash
# f:/crm-analiz-repo.git/hooks/post-receive

# Read branch from stdin
while read oldrev newrev refname; do
  BRANCH=$(git rev-parse --symbolic --abbrev-ref $refname)

  # Only deploy on main branch
  if [ "$BRANCH" == "main" ]; then
    echo "🚀 Triggering deployment for main branch..."

    PROD_SERVER="production.local"
    PROD_USER="deploy"
    PROD_PATH="/opt/crmanaliz"

    ssh "$PROD_USER@$PROD_SERVER" "cd $PROD_PATH && bash scripts/deploy-production.sh"
  fi
done
```

## Quality Gates

### Pre-Push Quality Gates (Developer Workstation)

Run before pushing to origin to catch issues early.

```bash
# scripts/pre-push-checks.sh
#!/bin/bash
set -e

echo "🔍 Running pre-push quality gates..."

# Lint
echo "  • Linting..."
pnpm lint || { echo "❌ Lint failed"; exit 1; }

# Typecheck
echo "  • Type checking..."
pnpm typecheck || { echo "❌ Typecheck failed"; exit 1; }

# Tests
echo "  • Running tests..."
pnpm test || { echo "❌ Tests failed"; exit 1; }

# Build
echo "  • Building..."
pnpm build || { echo "❌ Build failed"; exit 1; }

echo "✅ Pre-push quality gates passed"
```

### Pre-Deploy Quality Gates (Production Server)

Run by deployment script before actually deploying.

**Already implemented in `deploy-production.sh`**:

- Typecheck (`pnpm typecheck`)
- Build verification (`pnpm build`)

**Future additions**:

- Integration tests against staging database
- Security scan (npm audit, Snyk)
- Performance benchmarks
- Database migration dry-run

## Deployment Stages

### Stage 1: Validation (Quality Gates)

- Lint check
- Type check
- Unit tests
- Build verification
- Migration validation

### Stage 2: Backup

- Database backup
- Configuration backup
- Previous deployment state saved

### Stage 3: Preparation

- Pull latest code
- Install dependencies
- Build applications
- Generate assets

### Stage 4: Database Migration

- Check migration status
- Deploy migrations
- Verify migration success

### Stage 5: Service Update

- Stop current services
- Deploy new version
- Start services
- Wait for stabilization

### Stage 6: Verification

- Health checks
- Smoke tests
- Performance checks
- Log verification

### Stage 7: Completion

- Update deployment metadata
- Send notifications
- Archive logs

## Rollback Strategy

### Automatic Rollback Triggers

- Health check fails after 5 minutes
- Error rate > 10% in first 10 minutes
- Critical endpoint returning 5xx
- Database connection failures

### Manual Rollback

```bash
# Simple rollback to previous commit
bash scripts/rollback.sh

# Rollback to specific commit
ROLLBACK_COMMIT=abc1234 bash scripts/rollback.sh
```

### Rollback Verification

- Same health checks as deployment
- Verify previous functionality restored
- Check data integrity
- Review rollback logs

## Monitoring & Observability

### Deployment Metrics

- Deployment duration (target: < 5 minutes)
- Deployment frequency (track over time)
- Deployment success rate (target: > 95%)
- Rollback frequency (track and minimize)

### Health Metrics

- API response time (target: < 500ms p95)
- Error rate (target: < 1%)
- Database query time (monitor for regressions)
- Memory usage (watch for leaks)

### Log Aggregation

```bash
# Deployment logs location
logs/deployments/deploy_YYYYMMDD_HHMMSS.log

# Application logs
logs/api/api_YYYYMMDD.log
logs/web/web_YYYYMMDD.log

# System logs
/var/log/syslog (systemd services)
docker logs crmanaliz-api (Docker mode)
```

## Notification System

### Deployment Notifications

**Success**:

```
✅ Deployment Successful
Commit: abc1234
Branch: main
Duration: 3m 24s
Time: 2026-03-28 14:30:00
```

**Failure**:

```
❌ Deployment Failed
Commit: abc1234
Branch: main
Stage: Migration
Error: Migration XYZ failed
Action: Review logs, manual rollback if needed
```

### Notification Channels (Future)

- Email
- Slack/Discord webhook
- SMS (for critical failures)
- Dashboard widget

## Environment-Specific Configuration

### Development Environment

```bash
# .env.development
DATABASE_URL="postgresql://dev:dev@localhost:5432/crmanaliz_dev"
REDIS_URL="redis://localhost:6379"
NODE_ENV="development"
LOG_LEVEL="debug"
```

### Production Environment

```bash
# .env.production (not in repo, server-only)
DATABASE_URL="postgresql://prod:REDACTED@localhost:5432/crmanaliz_prod"
REDIS_URL="redis://localhost:6379/0"
NODE_ENV="production"
LOG_LEVEL="info"
```

### Staging Environment (Optional)

```bash
# .env.staging
DATABASE_URL="postgresql://staging:REDACTED@localhost:5432/crmanaliz_staging"
REDIS_URL="redis://localhost:6379/1"
NODE_ENV="staging"
LOG_LEVEL="debug"
```

## Branch Strategy Integration

### Main Branch (Production)

- Protected branch
- Requires PR review (manual process)
- Deploys to production via `deploy-production.sh`
- Tag releases: `v1.0.0`, `v1.1.0`, etc.

### Develop Branch (Staging)

- Integration branch
- Automatic deployment to staging (optional)
- Pre-release testing

### Feature Branches

- No automatic deployment
- Can manually deploy to dev environment for testing
- Merge to develop via PR

## Security Considerations

### SSH Key Management

- Use dedicated deployment key
- Restrict key to deployment user only
- Rotate keys quarterly
- No password-based SSH access

### Secrets Management

- Never commit secrets to repository
- `.env` files managed separately
- Consider encryption for `.env` files
- Secrets synced manually or via secure channel

### Access Control

- Limit production server access
- Audit logs for deployment actions
- Two-factor authentication for production access
- Principle of least privilege

## Disaster Recovery

### Production Server Failure

1. Provision new production server
2. Clone repo from local bare repository
3. Restore database from latest backup
4. Run deployment script
5. Verify functionality
6. Update network configuration

### Local Bare Repository Corruption

1. Local bare repo can be recreated from any working tree
2. Push from development workstation: `git push --mirror origin`
3. Alternatively, restore bare repo from periodic filesystem backup

### Network Partition (Dev ↔ Prod)

1. Production continues running current version
2. Deployment temporarily unavailable
3. Queue changes locally until network restored
4. Deploy once connectivity returns

## CI/CD Roadmap

### Phase 1: Manual (Current)

- ✅ Manual deployment script
- ✅ Quality gates in deployment
- ✅ Backup before deploy
- ✅ Health checks after deploy

### Phase 2: Semi-Automated (Recommended)

- [ ] `push-and-deploy.sh` wrapper script
- [ ] Pre-push quality gate script
- [ ] Deployment status notifications
- [ ] Deployment dashboard/widget

### Phase 3: Automated (Future)

- [ ] Git post-receive hook deployment
- [ ] Automatic rollback on failure
- [ ] Slack/email notifications
- [ ] Deployment metrics tracking

### Phase 4: Advanced (Long-term)

- [ ] Blue-green deployment
- [ ] Canary releases
- [ ] A/B testing infrastructure
- [ ] Multi-region deployment

## Migration to External CI/CD (Future)

When organization decides on external Git hosting (GitHub, GitLab, Bitbucket):

1. **Add external remote**:

   ```bash
   git remote add upstream https://github.com/org/crmanaliz.git
   git push upstream main
   ```

2. **Transition strategy**:
   - Keep local bare repo as mirror during transition
   - Set up GitHub Actions / GitLab CI
   - Gradually migrate deployment triggers
   - Maintain local-first as fallback

3. **Dual operation**:
   - External CI/CD for automated checks
   - Local bare repo for emergency deployments
   - Both remotes stay in sync

4. **Full migration**:
   - External CI/CD proven stable
   - Local bare repo becomes backup
   - Update deployment scripts to use external triggers

---

**Document Owner**: DevOps Team
**Implementation Status**: Phase 1 Complete, Phase 2 Planned
**Last Updated**: 2026-03-28
**Next Review**: 2026-04-28
