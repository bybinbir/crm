# M6 Backlog — Reporting + E2E + Live Verification

**Önceki teslim:** v0.5.0 (M5 operational hardening engineering closure)
**Branch (önerilen):** `feature/m6-reporting-e2e`
**Hedef:** PDF/Excel raporlama, Playwright e2e smoke ve canlı production
deploy + ISS Manager pull doğrulamasını tamamlamak.

## Madde Sırası

### 1. PDF / Excel Export (P2, orta — 1 PR)

**Amaç:** M3'te eklenen CSV export'unun PDF ve Excel varyantlarını ekle.
Operatör mali raporları farklı kanallara (e-posta, arşiv) iletebilsin.

**Karar:**
- PDF: `pdfkit` (server-side, küçük) — server route handler
- Excel: `exceljs` (server-side, formula desteği) — server route handler

**Değişecek dosyalar:**
- `lib/export/pdf.ts` (yeni)
- `lib/export/excel.ts` (yeni)
- `app/api/export/odenmemis/route.ts` — `?format=pdf|excel|csv` query
  param desteği, default csv (M3 davranışı korunur)
- `package.json` — `pdfkit`, `exceljs` dependency'leri

**Test:**
- `tests/export.pdf.test.ts` — PDF byte stream, header/footer, sayfa sayısı
- `tests/export.excel.test.ts` — workbook, sheet, formula, tr-TR locale

**Kabul kriterleri:**
- 30 gün ödememiş listesinden PDF + Excel + CSV üretilebilsin
- Türkçe karakter ve TL formatlama doğru
- RBAC: `export:csv` capability'si üç format için de geçerli
- Bundle boyutu artışı kabul edilebilir (PDF/Excel server-side, client'a inmez)

### 2. Playwright E2E Smoke (P1, büyük — 1-2 PR)

**Amaç:** Kritik kullanıcı akışlarını sunucu + DB ile uçtan uca test et;
M5 birim testlerinin yakalayamadığı entegrasyon regresyonlarını yakala.

**Değişecek dosyalar:**
- `playwright.config.ts` (yeni)
- `e2e/login.spec.ts` (yeni) — invalid → error, valid → /
- `e2e/dashboard.spec.ts` (yeni) — KPI'lar görünür, çıkış çalışır
- `e2e/odenmemis.spec.ts` (yeni) — 30 gün listesi, CSV indir
- `e2e/rbac.spec.ts` (yeni) — viewer admin sayfasını göremez
- `e2e/audit.spec.ts` (yeni) — operator denetim sayfasını görür,
  analyst/viewer 403 alır
- `package.json` — `@playwright/test` devDependency
- `.github/workflows/ci.yml` — ek job: `e2e` (postgres:16 testcontainer
  + Playwright)
- `docker-compose.e2e.yml` (yeni) — postgres:16 + crmanaliz next start

**Test verisi:** Anonimleştirilmiş fixture, gerçek müşteri verisi yasak.
Seed scripti `scripts/seed-e2e.ts` ile minimum 5 abone, 30 fatura, 10
audit event üretsin.

**Kabul kriterleri:**
- 5 spec dosyası, en az 15 senaryo
- CI'da postgres testcontainer içinde geçer
- Playwright trace + screenshot CI artifact olarak yüklenir
- Build + e2e toplam süre < 10 dk

### 3. Canlı Deploy + ISS Pull + systemd Timer Verification (P0, koordinasyon)

**Amaç:** v0.5.0'ı (engineering closure) production'a açmak. Bu madde
mühendislik değil deploy + smoke koordinasyonu.

**Ön şartlar (dış bağımlılıklar — bunlar gelmeden başlamayın):**
- [ ] Sunucu erişimi (SSH + sudo)
- [ ] DATABASE_URL prod TLS bağlantısı
- [ ] PII_MASTER_KEY 32-byte üretildi, secret manager'da
- [ ] SESSION_SIGNING_KEY 32-byte üretildi (PII'den AYRI), secret manager'da
- [ ] ISS Manager v2 prod `client_id` + `client_secret`
  (http://192.168.106.118/api-sistem/v2/ekle)

**Sıralı checklist:**

```
[ ]  /etc/crmanaliz/env oluştur, chmod 600, sahibi crmanaliz:crmanaliz
[ ]  içine: NODE_ENV=production, LOG_LEVEL=info, ISSMANAGER_BASE_URL,
     ISSMANAGER_CLIENT_ID, ISSMANAGER_CLIENT_SECRET, DATABASE_URL (TLS),
     PII_MASTER_KEY, SESSION_SIGNING_KEY
[ ]  /opt/crmanaliz/releases/v0.5.0 → release symlink → /opt/crmanaliz/current
[ ]  pnpm install --frozen-lockfile (offline mirror veya tarball deploy)
[ ]  pnpm db:migrate
[ ]  pnpm seed:user (admin/operatör seed)
[ ]  /var/log/crmanaliz dizinini oluştur, crmanaliz:crmanaliz sahip

[ ]  Pull-day smoke (network/DB'siz):
     sudo -u crmanaliz pnpm smoke:pull-day
     ⇒ exit 0, JSON dry-run summary

[ ]  Pull-day live (gerçek 1 günlük pull):
     sudo -u crmanaliz pnpm pull:day -- --date=$(date -d yesterday +%Y-%m-%d)
     ⇒ exit 0, pull_runs satırı status=succeeded
     ⇒ faturalar tablosunda yeni satırlar (idempotent: tekrar çalıştırınca
       inserted=0 olabilir, status=succeeded korunur)

[ ]  systemd timer kurulum:
     sudo cp deploy/systemd/crmanaliz-daily-pull.{service,timer} /etc/systemd/system/
     sudo systemctl daemon-reload
     sudo systemctl enable --now crmanaliz-daily-pull.timer

[ ]  Timer doğrulama:
     systemctl list-timers crmanaliz-daily-pull.timer
     systemctl status crmanaliz-daily-pull.timer
     ⇒ Active: active (waiting), Trigger: tomorrow 02:30:00 ±15min

[ ]  Manuel timer fire:
     sudo systemctl start crmanaliz-daily-pull.service
     journalctl -u crmanaliz-daily-pull.service -n 200 --no-pager
     ⇒ exit code 0 + JSON summary log'da

[ ]  Web app smoke:
     curl -fsS https://<domain>/giris  ⇒ HTML 200
     login as operator
     /yonetim/denetim sayfasına git ⇒ son 10 dk audit event'leri görünsün
     /odenmemis sayfasında CSV indir ⇒ UTF-8 BOM, Türkçe karakter doğru

[ ]  Reverse proxy / TLS:
     curl -I https://<domain>/  ⇒ 200, Strict-Transport-Security header

[ ]  24 saat sonra:
     - Timer otomatik tetiklendi mi? `journalctl -u crmanaliz-daily-pull` kontrol
     - pull_runs tablosunda yeni başarılı satır
     - Audit log UI yeni event'leri gösteriyor
```

**Rollback:**
```
sudo systemctl disable --now crmanaliz-daily-pull.timer
ln -sfn /opt/crmanaliz/releases/<previous> /opt/crmanaliz/current
sudo systemctl restart crmanaliz   # (eğer next-server systemd unit'i varsa)
```

Code rollback (geliştirici tarafı): `git revert` veya `git reset --hard
v0.4.0` (geri kayıt branch'inde).

## Çıkış Kriterleri (M6)

M6 ancak şu şartlarla kapanır:
- PDF/Excel export PR merged, Türkçe locale + RBAC test'i yeşil
- Playwright e2e CI job'u 5+ spec dosyası ile yeşil
- Canlı deploy checklist'i tamamlandı, 24h timer fire kanıtı var
- `M6_FINAL_REPORT.md` kapanış raporu
- `v0.6.0` annotated tag

## P-Sınıflandırma Özeti

| Madde | P-class | Tahmini iş |
|---|---|---|
| 1. PDF/Excel export | P2 | 1 PR, ~6 saat |
| 2. Playwright e2e | P1 | 1-2 PR, ~1 gün |
| 3. Canlı deploy | P0 | koordinasyon, dış bağımlılığa bağlı |
