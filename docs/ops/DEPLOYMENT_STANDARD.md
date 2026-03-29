# CRM Analiz Deployment Standard

## Deployment Process

### Pre-Deployment Checklist

- [ ] All tests passing locally
- [ ] Code reviewed and approved
- [ ] Branch up to date with main
- [ ] Database migrations tested
- [ ] Backup verified (within last 24h)

### Standard Deployment

```bash
cd /var/www/crmanaliz
sudo -u deploy bash scripts/deploy-production.sh
```

### Post-Deployment Verification

```bash
# Health check
sudo bash scripts/health-check-production.sh

# Verify services
systemctl status crm-analiz-api crm-analiz-web

# Check logs
journalctl -u crm-analiz-api -u crm-analiz-web -n 50
```

### Rollback Criteria

Rollback immediately if:

- Health check fails
- API returning 5xx errors
- Database migrations failed
- Critical functionality broken

```bash
sudo bash scripts/rollback-production.sh
```

## Release Workflow

1. **Development** → feature branch
2. **Testing** → merge to feature/core-implementation
3. **Staging** → test deployment
4. **Production** → run deploy script
5. **Verification** → health check + smoke test
6. **Monitor** → watch logs for 15 minutes

---

**Last Updated:** 2026-03-29
