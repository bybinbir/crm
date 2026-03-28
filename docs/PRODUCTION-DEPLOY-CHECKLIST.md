# Production Deployment Checklist

## Pre-Deployment Verification

### Environment Readiness

- [ ] `.env` file exists and configured with production values
- [ ] All required environment variables set (DATABASE_URL, REDIS_URL, JWT_SECRET, etc.)
- [ ] Secrets are encrypted and not in repository
- [ ] Application version number updated in package.json

### Infrastructure Health

- [ ] Database server reachable and accepting connections
- [ ] Redis server reachable and accepting connections
- [ ] Sufficient disk space available (minimum 10GB free)
- [ ] CPU and memory within acceptable ranges (< 70% utilization)
- [ ] Network connectivity stable

### Code Quality Gates

- [ ] All tests passing (`pnpm test`)
- [ ] TypeScript type checking clean (`pnpm typecheck`)
- [ ] Linting clean (`pnpm lint`)
- [ ] Build successful (`pnpm build`)
- [ ] No console.log or debug statements in production code

### Database Safety

- [ ] Database backup completed successfully
- [ ] Backup file verified and accessible
- [ ] Migration plan reviewed and understood
- [ ] Rollback migration path identified
- [ ] No destructive migrations without explicit approval

### Git Repository

- [ ] Working tree clean (no uncommitted changes)
- [ ] All changes committed with proper messages
- [ ] Changes pushed to origin (local bare repo)
- [ ] Current branch identified and documented
- [ ] Commit hash recorded for rollback reference

## Deployment Execution

### Pre-Deployment Actions

- [ ] Notify stakeholders of deployment window
- [ ] Document current production state (.last-deploy)
- [ ] Record current commit hash
- [ ] Set maintenance mode (if applicable)

### Deployment Steps

- [ ] Run `bash scripts/deploy-production.sh`
- [ ] Monitor deployment output for errors
- [ ] Verify quality gates pass (typecheck, build)
- [ ] Verify database migrations apply successfully
- [ ] Verify services restart without errors
- [ ] Wait for services to stabilize (15-30 seconds)

### Health Check Verification

- [ ] API health endpoint responds (GET /api/v1/health)
- [ ] Web application loads without errors
- [ ] Database connections established
- [ ] Redis connections established
- [ ] No error logs in application output

## Post-Deployment Verification

### Functional Verification

- [ ] Dashboard loads and displays metrics
- [ ] Import functionality works (test with small CSV)
- [ ] Neighborhood data displays correctly
- [ ] Reports page shows real data
- [ ] Authentication flow works (login/logout)
- [ ] API endpoints respond correctly

### Performance Verification

- [ ] API response times acceptable (< 500ms for most endpoints)
- [ ] Web page load times acceptable (< 2s)
- [ ] Database query performance acceptable
- [ ] No memory leaks detected
- [ ] CPU usage stable

### Monitoring and Logging

- [ ] Application logs show no errors
- [ ] Database logs show no errors
- [ ] System metrics within normal ranges
- [ ] Error tracking configured (if applicable)
- [ ] Performance monitoring active

### Documentation

- [ ] Deployment recorded in .last-deploy file
- [ ] Release notes updated (if applicable)
- [ ] Stakeholders notified of successful deployment
- [ ] Rollback procedure documented and ready

## Rollback Preparation

### Rollback Readiness

- [ ] Previous commit hash recorded
- [ ] Previous deployment state documented
- [ ] Rollback script tested and ready (`scripts/rollback.sh`)
- [ ] Database backup verified and restorable
- [ ] Rollback decision criteria defined (response time, error rate, etc.)

### Rollback Trigger Conditions

- Application fails health checks after 5 minutes
- Critical functionality broken (auth, imports, core reports)
- Database corruption or data loss detected
- Performance degradation > 50% from baseline
- Security vulnerability discovered

## Emergency Contacts

**On-Call Engineer**: [Contact Information]
**Database Administrator**: [Contact Information]
**Infrastructure Lead**: [Contact Information]
**Product Owner**: [Contact Information]

## Post-Deployment Tasks

- [ ] Monitor application for 1 hour post-deployment
- [ ] Review logs for warnings or errors
- [ ] Update documentation with any issues encountered
- [ ] Conduct post-deployment retrospective (if issues occurred)
- [ ] Archive deployment logs and metrics

---

**Deployment Date**: **\*\***\_\_\_**\*\***
**Deployed By**: **\*\***\_\_\_**\*\***
**Commit Hash**: **\*\***\_\_\_**\*\***
**Branch**: **\*\***\_\_\_**\*\***
**Sign-off**: **\*\***\_\_\_**\*\***
