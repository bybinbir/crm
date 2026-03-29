# Production Sync Strategy

## Overview

CRM Analiz uses a **bundle-based deployment** strategy for production synchronization. This is necessary because the production server at 194.15.45.47 is isolated and cannot directly access the Windows development environment's Git repository.

## Canonical Repository Structure

### Development Environment (Windows)

- **Working Directory:** `f:\crmanaliz\`
- **Canonical Remote:** `origin` → `f:/crm-analiz-repo.git` (bare repository)
- **Purpose:** Primary development, testing, and integration work

### Production Server (194.15.45.47)

- **Working Directory:** `/var/www/crmanaliz/`
- **Canonical Remote:** **NONE** (by design)
- **Purpose:** Production deployment only, receives updates via bundle transfer

## Deployment Method: Git Bundle Transfer

### Why Bundle-Based Transfer?

1. **Network Isolation:** Production server cannot reach Windows file system paths
2. **Security:** No persistent remote credentials or SSH keys required
3. **Auditability:** Each transfer is a discrete, verifiable artifact
4. **Simplicity:** No VPN, no port forwarding, no complex network setup

### Bundle Creation Workflow

#### Step 1: Create Bundle on Windows

```bash
# From Windows development environment
cd f:\crmanaliz

# Create bundle with new commits
git bundle create crmanaliz-deploy-$(date +%Y%m%d-%H%M%S).bundle origin/main ^production-deployed
```

#### Step 2: Transfer to Production

```bash
# SCP bundle to production /tmp
scp crmanaliz-deploy-*.bundle root@194.15.45.47:/tmp/
```

#### Step 3: Verify and Fetch on Production

```bash
# SSH to production
ssh root@194.15.45.47

# Verify bundle integrity
cd /var/www/crmanaliz
git bundle verify /tmp/crmanaliz-deploy-*.bundle

# Fetch from bundle
git fetch /tmp/crmanaliz-deploy-*.bundle feature/core-implementation:feature/core-implementation

# Merge or reset to fetched commits
git checkout feature/core-implementation
git reset --hard feature/core-implementation
```

#### Step 4: Deploy

```bash
# Execute production deployment
bash /var/www/crmanaliz/scripts/deploy-production.sh
```

#### Step 5: Cleanup

```bash
# Remove temporary bundle
rm /tmp/crmanaliz-deploy-*.bundle
```

## Important: No Permanent Remote on Production

Production repository **intentionally has NO configured remote origin**. This is correct and expected.

```bash
# On production - this is CORRECT
$ git remote -v
# (empty output - no remotes)
```

### Why No Remote?

1. **Single Direction:** Updates flow Windows → Production only
2. **No Write-Back:** Production never pushes changes upstream
3. **Prevents Drift:** Enforces that all changes originate from development environment
4. **Security:** No persistent network paths that could be exploited

## Bundle vs Traditional Remote

| Aspect          | Traditional Remote         | Bundle Transfer             |
| --------------- | -------------------------- | --------------------------- |
| **Network**     | Persistent connection      | One-time transfer           |
| **Credentials** | Stored/cached              | Not required                |
| **Direction**   | Bidirectional (fetch/push) | Unidirectional (fetch only) |
| **Audit Trail** | Git reflog                 | Physical bundle files       |
| **Isolation**   | Requires network access    | Airgap-compatible           |

## Verification Commands

### Windows Development Environment

```bash
# Verify canonical remote
cd f:\crmanaliz
git remote -v
# Expected output:
# origin	f:/crm-analiz-repo.git (fetch)
# origin	f:/crm-analiz-repo.git (push)

# Verify fetch/push work
git fetch origin
git push origin feature/core-implementation
```

### Production Server

```bash
# Verify NO remote (correct)
cd /var/www/crmanaliz
git remote -v
# Expected output: (empty)

# Verify current branch and commit
git branch
git log --oneline -5
```

## Emergency Rollback

If a bundle deployment fails:

```bash
# On production
cd /var/www/crmanaliz

# Check reflog for previous state
git reflog

# Reset to known-good commit
git reset --hard <previous-commit-sha>

# Re-deploy
bash scripts/deploy-production.sh
```

## Best Practices

1. **Bundle Naming:** Use timestamp format `crmanaliz-deploy-YYYYMMDD-HHMMSS.bundle`
2. **Verify Before Deploy:** Always run `git bundle verify` before fetching
3. **Test First:** Deploy to staging before production
4. **Backup First:** Production backup runs automatically in deploy script
5. **Document Deploy:** Record bundle SHA256 and deploy timestamp
6. **Clean Up:** Remove bundles from `/tmp` after successful deploy
7. **Never Force Push:** Production uses `--ff-only` merges for safety

## Troubleshooting

### Bundle Verification Fails

```bash
# Check bundle integrity
git bundle verify /tmp/bundle-file.bundle

# If corrupt, re-create and re-transfer
```

### Merge Conflicts During Deploy

```bash
# Production should never have local changes
# If conflicts occur:
git status

# If working tree dirty:
git reset --hard HEAD
git clean -fd

# Re-attempt fetch and merge
```

### Bundle Contains Wrong Commits

```bash
# Verify bundle contents before deploying
git bundle list-heads /tmp/bundle-file.bundle
git log /tmp/bundle-file.bundle..HEAD
```

## Related Documentation

- [Deployment Guide](./DEPLOYMENT.md) - Full production deployment procedures
- [Git Workflow](./GIT_WORKFLOW.md) - Branch strategy and commit conventions
- [Rollback Procedures](./DEPLOYMENT.md#rollback-procedures) - Emergency recovery

---

**Last Updated:** 2026-03-29
**Version:** 0.1.0
