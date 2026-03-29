# CI Guards

## Amaç

CRM Analiz projesi **native systemd deployment** standardını benimsemiştir. Docker/container teknolojileri production ortamından ve aktif koddan tamamen kaldırılmıştır. Bu dokümantasyon, Docker referanslarının geri gelmesini engelleyen CI guard mekanizmasını açıklar.

## Docker Zero-Trace Guard

### Ne Yapar?

`scripts/check-docker-refs.sh` script'i aktif operasyonel dosyalarda Docker/container terminolojisi arar. Bulunursa CI pipeline fail eder ve değişiklik merge edilemez.

### Kontrol Edilen Aktif Path'ler

- `apps/` - Tüm uygulama kodu (web, api)
- `packages/` - Shared packages ve components
- `scripts/*.sh` - Deployment ve operational script'ler
- `compose.*.yaml` - Compose dosyaları (artık olmamalı)
- `Dockerfile*` - Dockerfile'lar (artık olmamalı)
- `.github/` - CI/CD workflows
- `docs/DEPLOYMENT.md` - Production deployment guide
- `docs/LOCAL_SETUP.md` - Local development setup
- `docs/ARCHITECTURE.md` - Architecture documentation
- `docs/ENVIRONMENT.md` - Environment setup guide

### Ignore Edilen Path'ler (Historical)

Aşağıdaki lokasyonlar kontrol dışıdır (migration history ve vendor code):

- `node_modules/` - Vendor dependencies
- `pnpm-lock.yaml` - Dependency lock file
- `docs/audits/` - Migration audit trails
- `docs/releases/` - Historical release reports
- `task_dash.md` - Project task dashboard (historical references)
- `*.bundle` - Git bundle files

### Aranan Terimler

Word-boundary regex kullanılır (false positive önleme):

- `docker` - Docker CLI, engine
- `containerd` - Container runtime
- `compose` - Docker Compose
- `dockerd` - Docker daemon
- `docker-compose` - Legacy compose command
- `dockerfile` - Dockerfile keyword
- `podman` - Alternative container tool
- `runc` - Container runtime
- `buildkit` - Docker build engine

**Not:** Word-boundary matching (`\b`) sayesinde `truncate` gibi kelimeler `runc` ile eşleşmez.

## Local Kullanım

### Manuel Test

```bash
# Root dizinden çalıştır
pnpm check:docker

# Veya direkt script'i çalıştır
bash scripts/check-docker-refs.sh
```

### Başarılı Output

```
🔍 CI Regression Guard: Checking for Docker references...

✅ PASS: No Docker references in active files

Checked paths:
  - apps/
  - packages/
  - scripts/*.sh
  - compose.*.yaml
  - Dockerfile*
  - .github/
  - docs/DEPLOYMENT.md
  - docs/LOCAL_SETUP.md
  - docs/ARCHITECTURE.md
  - docs/ENVIRONMENT.md

Ignored paths (archival/vendor allowed):
  - node_modules/
  - pnpm-lock.yaml
  - docs/audits/
  - docs/releases/
  - task_dash.md
  - *.bundle
```

### Fail Output Örneği

```
🔍 CI Regression Guard: Checking for Docker references...

❌ REGRESSION DETECTED: Docker references found in active files!

Offending files and lines:
-------------------------
apps/api/src/config/database.ts:45:  image: 'postgres:15'
apps/web/README.md:12:Run with `docker-compose up`

This project uses NATIVE SYSTEMD services, not Docker.
Docker/container references are not allowed in active operational code.

If these are legitimate (e.g., documentation about migration),
move them to docs/audits/ or docs/releases/ directories.
```

## CI Integration

### GitHub Actions Workflow

Guard, `.github/workflows/ci.yml` içinde **ilk job** olarak çalışır:

```yaml
jobs:
  docker-guard:
    name: Docker Zero-Trace Guard
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Check Docker references
        run: bash scripts/check-docker-refs.sh
```

### Job Dependencies

Diğer tüm CI job'ları `docker-guard` job'ına bağımlıdır:

- `quality` (lint, typecheck, format) - `needs: docker-guard`
- `test` - `needs: docker-guard`
- `build` - `needs: docker-guard`

Docker referansı tespit edilirse **tüm pipeline durur** ve sonraki job'lar çalışmaz.

### Fail Stratejisi

1. Developer aktif dosyaya Docker referansı ekler
2. Commit yapar ve branch'e push eder
3. GitHub Actions trigger olur
4. `docker-guard` job fail eder
5. Pipeline durur, PR merge edilemez
6. Developer hata mesajını görür
7. İhlali düzeltir veya dosyayı `docs/audits/` altına taşır
8. Yeniden push eder
9. Guard pass eder, pipeline devam eder

## Hata Durumunda Nasıl Düzeltilir?

### Senaryo 1: Yanlışlıkla Docker Referansı Eklendi

**Sorun:** `apps/api/src/config/database.ts` içinde `docker` kelimesi kullanıldı.

**Çözüm:**

1. Dosyayı düzenle ve Docker referansını kaldır
2. Native alternatifi kullan (örn: systemd, native PostgreSQL setup)
3. Commit ve push yap

```bash
# Düzeltme sonrası test
pnpm check:docker
```

### Senaryo 2: Migration Dokümantasyonu

**Sorun:** Docker'dan systemd'ye migration sürecini anlatan bir README eklendi.

**Çözüm:**

1. Dosyayı `docs/audits/` veya `docs/releases/` altına taşı
2. Commit ve push yap

```bash
# Örnek
git mv apps/api/MIGRATION.md docs/audits/DOCKER_TO_SYSTEMD_MIGRATION.md
git commit -m "docs: move Docker migration guide to audits"
git push
```

### Senaryo 3: False Positive (Şüpheli)

**Sorun:** Guard, Docker referansı olmayan bir kelimeyi yakaladı.

**Çözüm:**

1. `scripts/check-docker-refs.sh` içindeki regex'i kontrol et
2. Word-boundary matching doğru çalışıyor mu?
3. Gerekirse script'e yorum ekle veya ignore pattern güncelle
4. Issue aç: "CI guard false positive for X term"

**Not:** Word-boundary kullanımı zaten çoğu false positive'i engelliyor.

## Script Detayları

### Bash Features

- `set -euo pipefail` - Strict error handling
- `trap` - Temporary file cleanup
- Word-boundary regex - False positive prevention
- Git grep - Only tracked files scanned

### Portability

- `#!/usr/bin/env bash` - Cross-platform shebang
- POSIX-compliant commands
- Works on Linux CI, macOS, WSL, Git Bash

### Exit Codes

- `0` - Success, no Docker references found
- `1` - Failure, Docker references detected

### Performance

- **Fast:** No dependency installation required
- **Early fail:** Runs before lint/test/build
- **Cheap:** ~5-10 seconds on average repo

## İlgili Dokümantasyon

- [PRODUCTION_SYNC.md](./PRODUCTION_SYNC.md) - Bundle-based deployment strategy
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Native systemd deployment guide
- [GIT_WORKFLOW.md](./GIT_WORKFLOW.md) - Branch strategy and commit conventions

## Historical Context

- **CRM-ANALIZ-DOCKER-ZERO-TRACE-045:** Complete Docker removal
- **CRM-ANALIZ-CLOSURE-HARDENING-046:** Zero-trace enforcement ve guard creation
- **CRM-ANALIZ-CI-ENFORCEMENT-047:** CI pipeline integration (bu doküman)

## Troubleshooting

### Guard Script Bulunamıyor

```bash
# Script'in varlığını kontrol et
ls -lh scripts/check-docker-refs.sh

# Execute permission varsa
chmod +x scripts/check-docker-refs.sh
```

### Git Grep Çalışmıyor

```bash
# Git repository içinde olduğunu doğrula
git status

# Root dizinden çalıştır
cd /path/to/crmanaliz
bash scripts/check-docker-refs.sh
```

### CI'da Pass, Local'de Fail

```bash
# Git status temiz mi?
git status

# Staged olmayan değişiklikler var mı?
git diff

# git grep yalnızca tracked files'ı tarar
git add . && pnpm check:docker
```

## Maintenance

### Quarterly Review

- Her 3 ayda bir guard script'ini gözden geçir
- Yeni container terimleri eklenmiş mi? (cri-o, kata-containers)
- False positive raporları var mı?
- Ignore pattern güncellemesi gerekiyor mu?

### Script Güncelleme

`scripts/check-docker-refs.sh` güncellenirse:

1. Local'de test et: `pnpm check:docker`
2. CI'da test et: Feature branch'e push yap
3. Başarılı olduktan sonra merge et
4. Bu dokümantasyonu güncelle

---

**Son Güncelleme:** 2026-03-29
**Versiyon:** 1.0.0
**İlgili Prompt:** CRM-ANALIZ-CI-ENFORCEMENT-047
