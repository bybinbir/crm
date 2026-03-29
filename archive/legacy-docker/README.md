# Legacy Docker Deployment Files

**Status:** OBSOLETE - For historical reference only

## Overview

This directory contains Docker-based deployment files from the platform's initial architecture. As of March 2026, CRM Analiz production runs on **host-native systemd services** without Docker or containers.

## Reason for Archive

- **Production Reality:** Server runs native systemd services (crm-analiz-api, crm-analiz-web)
- **Maintenance Burden:** Docker files caused confusion and maintenance overhead
- **Zero Docker Footprint:** Production has zero Docker packages, binaries, or containers
- **Better Performance:** Native deployment has lower overhead and simpler operations

## Archived Files

### Compose Files

- `compose/compose.prod.yaml` - Production Docker Compose configuration
- `compose/compose.yaml` - Development Docker Compose configuration

### Documentation

- `docs/DEPLOYMENT_GUIDE.md` - Original Docker-based deployment guide
- `docs/DEPLOYMENT_DOCKER.md` - Docker deployment documentation

### Scripts

- `scripts/deploy.sh` - Docker-based deployment script
- `scripts/full-deploy.sh` - Full Docker stack deployment
- `scripts/remote-deploy.sh` - Remote Docker deployment automation

## Current Production Setup

**For active production documentation, see:**

- `docs/DEPLOYMENT.md` - Native systemd deployment guide
- `docs/ops/RUNBOOK_PRODUCTION.md` - Day-to-day operations
- `docs/ops/DEPLOYMENT_STANDARD.md` - Deployment procedures
- `docs/ops/BACKUP_AND_RECOVERY.md` - Backup and recovery

**For production deployment:**

```bash
cd /var/www/crmanaliz
./scripts/deploy-production.sh
```

## Historical Context

- **Original Architecture (2024-2025):** Docker Compose with containers for API, Web, PostgreSQL, Redis
- **Migration (March 2026):** Moved to host-native systemd services
- **Verification:** Docker completely removed, reboot-tested
- **Hardening:** Production-grade operational tooling added

## Development Note

Local development may still use Docker for convenience (developer choice). However, production deployment documentation and scripts are **systemd-native only**.

---

**Do not use these files for production deployment. They are preserved for historical reference and understanding the platform's evolution.**
