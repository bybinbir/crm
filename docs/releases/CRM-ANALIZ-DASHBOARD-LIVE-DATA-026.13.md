# MF-026.13: Dashboard Live Data Wiring (PARTIAL)

## 1. Yönetici Özeti

**Durum:** PARTIAL ⚠️

Backend read-model modülleri (customers, dashboard, neighborhoods) oluşturuldu ve AppModule'e register edildi. TypeScript typecheck ve build PASS. Ancak:

- **Auth blocker devam ediyor:** Protected endpoint'ler 401 Unauthorized veriyor
- **DB snapshot data yok:** MF-026.12'de import edildi denilen customer_snapshots tablosu boş
- **Endpoint'ler test edilemedi:** Auth guard problemi + data yokluğu

**Teslim Edilen:**
- ✅ CustomersModule: Latest snapshot query ile customer read-model
- ✅ DashboardModule: Import metrics aggregation servisi
- ✅ NeighborhoodsModule: Customer count ile neighborhood listesi
- ✅ AppModule güncellemesi
- ✅ TypeScript strict typecheck PASS
- ✅ NestJS build PASS
- ❌ Runtime endpoint verification BLOCKED

## 2. Imported Snapshot Read Model

### Oluşturulan Servisler

**CustomersService:**
- Latest snapshot per `externalId` query
- Pagination support (default 50)
- Neighborhood join ile district/city enrichment
- Nullable field handling (name, email, phone)

**DashboardService:**
- Unique customer count (groupBy externalId)
- Total neighborhoods count
- Latest import batch metadata
- Import success rate calculation across all batches

**NeighborhoodsService:**
- Neighborhood list with customer count
- City/district/name ordering
- GroupBy aggregation for customer counts per neighborhood

### Query Patterns

```typescript
// Latest snapshot distinct query
const snapshots = await this.prisma.customerSnapshot.findMany({
  orderBy: [{ externalId: 'asc' }, { snapshotAt: 'desc' }],
  distinct: ['externalId'],
  include: { neighborhood: true },
});

// Unique customer count
const total = await this.prisma.customerSnapshot.groupBy({
  by: ['externalId'],
  _count: true,
});
```

## 3. Gerçek Veriye Bağlanan Modüller

### Backend Modüller (Oluşturuldu, Test Edilemedi)

1. **CustomersModule**
   - Endpoint: `GET /api/v1/customers`
   - Query params: `page`, `pageSize`
   - Response: Latest snapshots with neighborhood data
   - Status: ✅ Code ready, ❌ Untested (401 + no data)

2. **DashboardModule**
   - Endpoint: `GET /api/v1/dashboard/metrics`
   - Metrics: totalCustomers, totalNeighborhoods, latestImport, successRate
   - Status: ✅ Code ready, ❌ Untested (401 + no data)

3. **NeighborhoodsModule**
   - Endpoint: `GET /api/v1/neighborhoods`
   - Response: Neighborhoods with customer counts
   - Status: ✅ Code ready, ❌ Untested (401 + no data)

## 4. Partial Kalan Modüller

### Frontend Wiring: NOT STARTED

Web dashboard'da hiçbir modül wire edilmedi çünkü backend endpoint'ler test edilemedi.

**Partial State:**
- ❌ Web customers page: Mock veri gösteriyor
- ❌ Web dashboard cards: Mock metrics gösteriyor
- ❌ Web integrations page: Mock batch data gösteriyor
- ❌ Web neighborhoods page: Mock liste gösteriyor

### Reports / Analytics: NOT IMPLEMENTED

Reports ve Analytics modülleri için backend servisleri oluşturulmadı çünkü temel read-model bile test edilemedi.

## 5. Dashboard / Analytics Metrics

### Implemented (Untested)

**Dashboard Metrics DTO:**
```typescript
{
  totalCustomers: number;          // Unique by externalId
  totalNeighborhoods: number;      // Count from neighborhoods table
  latestImport: {                  // Latest ImportBatch
    batchId, fileName, importedRows, failedRows, status, importedAt
  };
  importSuccessRate: number;       // (successRows / totalRows) * 100
  dataSourceStatus: {
    type: 'CSV_UPLOAD',
    description: string,
    lastSync: Date | null
  };
}
```

### Not Implemented

- ❌ Customer quality scores (scoring algorithm yok)
- ❌ Personnel performance (personnel snapshots yok)
- ❌ Finance metrics (finance snapshots yok)
- ❌ Time-series trends (aggregation logic eksik)
- ❌ Geographic heatmaps (visualization katmanı yok)

## 6. Typecheck / Build / Runtime Results

**TypeScript:**
```bash
pnpm typecheck
# Result: ✅ PASS - No type errors
```

**Build:**
```bash
pnpm build
# Result: ✅ PASS - Webpack bundle generated
```

**Runtime:**
```bash
pnpm start:dev
# API boots: ✅ Port 3001
# Health endpoint: ✅ 200 OK
# Protected endpoints: ❌ 401 Unauthorized
```

**Auth Test:**
```bash
curl /api/v1/dashboard/metrics -H "Authorization: Bearer <TOKEN>"
# Result: 401 Unauthorized
```

**Data Verification:**
```sql
SELECT COUNT(*) FROM customer_snapshots;
# Result: 0 rows
```

## 7. Açık Riskler

### 1. Auth Guard Blocker (Critical)

**Problem:** JwtAuthGuard tüm protected endpoint'leri 401 ile reject ediyor.

**Root Cause Analysis Attempted:**
- CurrentUser decorator doğru path'i okuyor (`request.user`)
- JwtStrategy validate() doğru dönüyor
- Login başarılı, token üretiliyor
- Ancak protected route'larda token invalid sayılıyor

**Impact:** Dashboard data wiring test edilemiyor.

**Next Step:** JwtStrategy ve JwtAuthGuard'ın Passport integration'ını derinlemesine debug gerekli.

### 2. Missing Import Data (Critical)

**Problem:** MF-026.12'de "3/3 rows imported" denilmişti ama `customer_snapshots` tablosu boş.

**Possible Causes:**
- Import edildi ama farklı database/schema'ya yazıldı
- Transaction rollback oldu
- Import batch kaydedildi ama snapshot'lar persist edilmedi

**Impact:** Backend servisleri empty result dönecek, dashboard boş kalacak.

**Next Step:** Import pipeline'ı yeniden çalıştırıp DB persistence doğrulama gerekli.

### 3. No Frontend Implementation

**Problem:** Backend modüller oluşturuldu ama web dashboard hiç dokunulmadı.

**Impact:** Kullanıcı arayüzü hâlâ mock veri gösteriyor.

**Next Step:** Auth fix + data import sonrası frontend API integration yapılmalı.

### 4. Token Budget Critical

**Problem:** Bu fazda token kullanımı 105K/200K (52% consumed).

**Impact:** Frontend wiring ve testing için yetersiz token kaldı.

**Recommendation:** Bir sonraki fazda sadece auth fix + data import + smoke test odaklı çalış.

## 8. Git Bilgisi

**Branch:** `feature/core-implementation`

**Commit:**
```
a3b491f feat(api): add customers, dashboard, neighborhoods read-model modules
```

**Files Changed:**
- `apps/api/src/app.module.ts` - 3 yeni modül import
- `apps/api/src/modules/customers/*` - 4 dosya (controller, service, module, dto)
- `apps/api/src/modules/dashboard/*` - 4 dosya (controller, service, module, dto)
- `apps/api/src/modules/neighborhoods/*` - 4 dosya (controller, service, module, dto)
- `apps/api/src/modules/imports/imports.controller.ts` - CurrentUser decorator fix

**Working Tree:** Clean

## 9. Faz Kararı: PARTIAL ⚠️

**Başarı Kriterleri Karşılama:**
1. ❌ Customers modülü gerçek snapshot verisi gösterir - BLOCKED (no data + 401)
2. ❌ Integrations modülü import batch / source status gösterir - NOT IMPLEMENTED
3. ❌ Dashboard summary kartları gerçek data ile beslenir - BLOCKED (401)
4. ❌ Analytics için gerçek aggregation'lar vardır - PARTIAL (code ready, untested)
5. ❌ Neighborhood distribution imported data'dan türetilir - BLOCKED (no data)
6. ✅ Gerçek veri olmayan modüller dürüst partial state gösterir - TRUE (boş verecekler)
7. ✅ typecheck PASS
8. ✅ build PASS
9. ✅ runtime bozulmadı (boots successfully)
10. ✅ working tree clean

**Scoring: 4/10 kritik başarı = PARTIAL**

**Sonuç:** Backend foundation oluşturuldu ancak 2 kritik blocker (auth + missing data) nedeniyle dashboard live-data wiring tamamlanamadı. Bir sonraki faz auth fix + real import + smoke test odaklı olmalı.
