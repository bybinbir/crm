# CRM Analiz Platform

[![CI](https://github.com/YOUR_ORG/crmanaliz/workflows/CI/badge.svg)](https://github.com/YOUR_ORG/crmanaliz/actions)
[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-proprietary-red.svg)]()

ISSmanager CRM Analytics & Decision Support Platform - Mahalle bazlı müşteri kalite analizi, personel verimliliği ve yönetici karar destek sistemi.

## 🎯 Proje Amacı

CRM Analiz, ISSmanager'ın üzerine oturan bir **analitik ve karar destek katmanıdır**. ISSmanager'ın yerini almaz; ondan veri çeker, normalize eder, skorlar ve raporlar.

### Temel Özellikler

- 📍 **Mahalle Bazlı Müşteri Kalite Skoru** - Coğrafi segmentasyon ve kalite analizi
- 👥 **Personel Verimliliği** - Performans izleme ve metrikler
- 📊 **Yönetici Karar Destek** - Analitik ve öngörüler
- 💰 **Finansal Raporlama** - Gelir, maliyet ve kar analizi
- 🔄 **ISSmanager Entegrasyonu** - Dashboard üzerinden yapılandırılabilir

## 🚀 Hızlı Başlangıç

### Gereksinimler

- Node.js >=20.0.0
- pnpm >=9.0.0
- PostgreSQL 16+
- Redis 7+

### Kurulum

1. **Depoyu klonlayın**

```bash
git clone https://github.com/YOUR_ORG/crmanaliz.git
cd crmanaliz
```

2. **Bağımlılıkları yükleyin**

```bash
pnpm install
```

3. **Ortam değişkenlerini ayarlayın**

```bash
cp .env.example .env.local
# .env.local dosyasını gerçek değerlerle düzenleyin
```

4. **PostgreSQL ve Redis'i başlatın**

```bash
# Ubuntu/Debian
sudo systemctl start postgresql
sudo systemctl start redis-server

# Veya geliştirme için
sudo apt install postgresql-16 redis-server
```

5. **Veritabanını hazırlayın**

```bash
# PostgreSQL kullanıcısı ve veritabanı oluştur
sudo -u postgres psql -c "CREATE USER crmanaliz WITH PASSWORD 'dev_password';"
sudo -u postgres psql -c "CREATE DATABASE crmanaliz OWNER crmanaliz;"

# Migrations çalıştır
cd apps/api
pnpm run migration:run
cd ../..
```

6. **Geliştirme sunucularını başlatın**

```bash
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1

## 📁 Proje Yapısı

```
crmanaliz/
├── apps/
│   ├── web/              # Next.js 15 web uygulaması
│   └── api/              # NestJS API sunucusu
├── packages/
│   ├── types/            # Paylaşılan TypeScript tipleri
│   ├── ui/               # Paylaşılan UI bileşenleri
│   └── config/           # Paylaşılan yapılandırmalar
├── docs/                 # Proje dokümantasyonu
├── scripts/              # Yardımcı scriptler
└── .github/workflows/    # CI/CD pipeline'ları
```

## 🛠️ Komutlar

### Geliştirme

```bash
pnpm dev          # Tüm uygulamaları geliştirme modunda çalıştır
pnpm build        # Tüm uygulamaları derle
pnpm lint         # Kod kalitesi kontrolü
pnpm typecheck    # TypeScript tip kontrolü
pnpm test         # Testleri çalıştır
pnpm format       # Kod formatla
pnpm clean        # Build çıktılarını temizle
```

### Sadece Web App

```bash
cd apps/web
pnpm dev          # Next.js dev server
pnpm build        # Production build
pnpm start        # Production server
```

### Sadece API

```bash
cd apps/api
pnpm dev          # NestJS dev server
pnpm build        # Production build
pnpm start        # Production server
```

## 🏗️ Teknoloji Stack

| Katman     | Teknoloji            | Versiyon     |
| ---------- | -------------------- | ------------ |
| Monorepo   | Turborepo + pnpm     | 2.3+ / 9.15+ |
| Web        | Next.js (App Router) | 15.1+        |
| API        | NestJS               | 10.4+        |
| Dil        | TypeScript           | 5.7+         |
| Stil       | Tailwind CSS         | 3.4+         |
| Veritabanı | PostgreSQL           | 16+          |
| Önbellek   | Redis                | 7+           |
| Test       | Jest                 | 29+          |
| CI/CD      | GitHub Actions       | -            |
| Deployment | systemd              | -            |

Detaylı bilgi için: [docs/STACK.md](docs/STACK.md)

## 📚 Dokümantasyon

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Sistem mimarisi
- [STACK.md](docs/STACK.md) - Teknoloji stack detayları
- [GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md) - Git iş akışı ve branch stratejisi
- [SECURITY.md](docs/SECURITY.md) - Güvenlik kuralları
- [ENVIRONMENT.md](docs/ENVIRONMENT.md) - Ortam kurulumu
- [DECISIONS.md](docs/DECISIONS.md) - Mimari kararlar (ADR)
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Native systemd deployment guide
- [CLAUDE.md](CLAUDE.md) - Proje anayasası
- [task_dash.md](task_dash.md) - Görev panosu

## 🔐 Güvenlik

- ❌ Gerçek credential'lar repository'de bulunmaz
- ✅ Tüm sırlar ortam değişkenleri ile yönetilir
- ✅ Dashboard üzerinden güvenli yapılandırma
- ✅ Denetim logları tüm hassas işlemler için
- ✅ Şifrelenmiş depolama

Detaylar: [docs/SECURITY.md](docs/SECURITY.md)

## 🧪 Testler

```bash
# Tüm testleri çalıştır
pnpm test

# Coverage raporu
pnpm test:cov

# Watch mode
pnpm test:watch
```

## 🌳 Git İş Akışı

### Branch Stratejisi

- `main` - Production
- `develop` - Integration
- `feature/*` - Yeni özellikler
- `fix/*` - Hata düzeltmeleri
- `refactor/*` - Kod iyileştirmeleri
- `chore/*` - Bakım işleri

### Commit Kuralı

Conventional Commits kullanılır:

```
feat(scope): add new feature
fix(scope): resolve bug
docs(scope): update documentation
```

Detaylar: [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md)

## 📦 Versiyonlama

Semantic Versioning (SemVer) kullanılır:

```bash
# Changeset oluştur
pnpm changeset

# Versiyon güncelle
pnpm version

# Yayınla (build + publish)
pnpm release
```

Değişiklikler: [CHANGELOG.md](CHANGELOG.md)

## 🤝 Katkıda Bulunma

1. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
2. Değişikliklerinizi commit edin (`git commit -m 'feat: add amazing feature'`)
3. Branch'i push edin (`git push origin feature/amazing-feature`)
4. Pull Request açın

## 📄 Lisans

Proprietary - Tüm hakları saklıdır

## 👥 Ekip

Internal Development Team

## 📞 İletişim

Sorularınız için: dev@crmanaliz.local

## 🚀 Production Deployment

Production sunucuya deployment için:

```bash
# Nginx konfigürasyonu
sudo cp deployment/nginx/crmanaliz.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/crmanaliz.conf /etc/nginx/sites-enabled/

# SSL sertifikası
sudo certbot --nginx -d analiz.binbirnet.com.tr

# Smoke test
./deployment/smoke-test.sh https://analiz.binbirnet.com.tr
```

Detaylı rehber: [deployment/DEPLOYMENT.md](deployment/DEPLOYMENT.md)

---

**Not:** Production deployment için güvenlik hardening tamamlandı.
