# Automated Regression & Security Gate (MF-037)

## Critical Regression Surface

- Health: /api/v1/health
- Auth: login + protected access
- Customers: /api/v1/customers
- Neighborhoods: /api/v1/neighborhoods
- Reports: /api/v1/dashboard/reports

## Automated Pack

✅ scripts/run-regression.sh

- 7 API smoke tests
- Auth flow: login → protected access
- Data endpoints: customers, neighborhoods, reports

## Security Gate

✅ scripts/security-audit.sh

- pnpm audit integration
- Policy: 0 critical, max 5 high
- Fail-fast on threshold breach

## CI/CD Integration

Add to pre-push/deploy chain:

```bash
bash scripts/run-regression.sh
bash scripts/security-audit.sh
```

## Data Preconditions

Tests use existing imported customer/neighborhood snapshots.

## Status

Foundation complete. Regression suite operational.
