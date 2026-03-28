# CRM Analiz - Rollback Handoff (MF-035A)

## When to Rollback

- Health checks failing > 5 minutes
- Critical functionality broken
- Error rate > 10%
- Performance degradation > 50%

## Rollback Commands

```bash
ssh $PROD_USER@$PROD_HOST
cd $PROD_APP_PATH
source $PROD_BACKUP_PATH/pre-deploy/rollback_<TIMESTAMP>.info
git checkout $ROLLBACK_COMMIT
pnpm install --frozen-lockfile
pnpm build
sudo systemctl restart crmanaliz-api crmanaliz-web
curl -f https://$PROD_DOMAIN/api/v1/health
```

## Database Rollback (if needed)

```bash
gunzip -c $BACKUP_FILE | psql -h localhost -U crmanaliz -d crmanaliz
```

## Verification

- API health: 200 OK
- Services active
- Logs clean
