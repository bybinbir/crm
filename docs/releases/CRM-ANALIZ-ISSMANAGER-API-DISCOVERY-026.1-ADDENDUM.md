# CRM-ANALIZ-ISS MANAGER-API-DISCOVERY-026.1-ADDENDUM

**Addendum to:** CRM-ANALIZ-ISSMANAGER-CONTRACT-AUDIT-026.1
**Discovery Date:** 2026-03-27 00:50 UTC
**Method:** Postman API Gateway
**Status:** 🔴 CRITICAL FINDING - Integration Blocked

---

## Executive Summary

ISS Manager API contract successfully extracted via Postman API Gateway. **Critical finding: ISS Manager API is NOT suitable for CRM integration.**

**Reason:** API is designed for **customer self-service portal** (OIM = Online İşlem Merkezi), not for admin/CRM bulk data access.

**Impact:** Original integration plan is NOT FEASIBLE without admin API endpoints or alternative data access method.

---

## API Discovery Success

**Method:** Postman API Gateway (after browser-rendered Postman docs failed)

**URL:** https://documenter.gw.postman.com/api/collections/3408876/2sBXcGCe5H

**Result:** Complete API contract received (JSON format)

---

## Real ISS Manager API Contract

### Authentication (CORRECTED)

**Previous Assumption:** Bearer Token (`Authorization: Bearer {token}`)

**ACTUAL METHOD:** Custom Header

```
Header: X-HTTP-Authorization: {token}
Token Acquisition: POST /api/oim/login
Body: username={user}&password={pass} (urlencoded)
Response: { success: true, data: { token: "..." } }
```

**Token Lifecycle:**

- New token generated on each login
- Token invalidates on password change
- Re-login required after password change

### Available Endpoints

| Endpoint                        | Method | Purpose                  | Auth Required | Response Type                           |
| ------------------------------- | ------ | ------------------------ | ------------- | --------------------------------------- |
| `/api/oim/login`                | POST   | Authenticate / Get Token | No            | `{ success, message, data: { token } }` |
| `/api/oim/customer_information` | GET    | Get customer data        | Yes           | Customer object                         |
| `/api/oim/send_password`        | POST   | Send password via SMS    | Yes           | SMS confirmation                        |
| `/api/oim/change_password`      | POST   | Change OIM password      | Yes           | Success/failure                         |
| `/api/oim/plans`                | GET    | Get available plans      | Yes           | Plans array                             |
| `/api/oim/requestPlanChange`    | POST   | Request plan change      | Yes           | Request confirmation                    |
| `/api/oim/invoice_detail/{no}`  | GET    | Get invoice details      | Yes           | Invoice object                          |
| `/api/oim/payment_form`         | POST   | Get payment gateway form | Yes           | Payment config                          |

**Total Endpoints:** 8

**Endpoint Categories:**

- Authentication: 1
- Customer Self-Service: 7
- **Admin/Bulk Access: 0** ❌

### Customer Information Endpoint (Detailed)

**GET** `/api/oim/customer_information`

**Headers:**

```
X-HTTP-Authorization: {token}
```

**Response Structure:**

```json
{
  "success": true,
  "message": "Başarılı",
  "data": {
    "customer": {
      "abone_no": "1000000001",
      "isim": "Akın Özgen",
      "email": "akin***en17@gmail.com",
      "telefon": "2222222222",
      "adres": "**** Mah. **** Cd. No:**/7 Muratpaşa/Antalya",
      "fatura_adres": "**** Mah. **** Cd. No:**/7 Muratpaşa/Antalya",
      "pppoe_k_adi": "akinozgen",
      "pppoe_parola": "312387",
      "oim_k_adi": "test123",
      "tarife_tur": "1",
      "tarife": "Düzici-10Mb",
      "tarife_fiyat": "70.00000",
      "bitis_tarihi": "2023-01-07 22:59:21",
      "taahhut_bitis": "0000-00-00 00:00:00",
      "on_odemeli": true,
      "bakiye": "123.00000",
      "sabit_ip_ucreti": 0,
      "aktivasyon_ucreti": 0,
      "tarife_ek_hizmet": [],
      "musteri_ek_hizmet": [],
      "faturalar": [
        /* invoice objects */
      ],
      "ariza_kayitlari": [
        /* fault record objects */
      ],
      "trafik_data": [
        /* traffic data objects */
      ],
      "diger_abonelikler": [
        /* other subscriptions */
      ],
      "veresiye_sayisi": 0,
      "gih_profiller": {
        /* internet safety profiles */
      },
      "gih_profil": "A-ST-P",
      "gih_son_islemler": [
        /* recent profile changes */
      ],
      "kdv": "18.00000",
      "oiv": "10.00000",
      "max_paket_uzat_oim": "2",
      "odenmemis_izin": "1"
    }
  }
}
```

**Field Analysis:**

| Field             | Type     | CRM Mapping  | Notes                                 |
| ----------------- | -------- | ------------ | ------------------------------------- |
| `abone_no`        | String   | `externalId` | Subscriber number (unique ID)         |
| `isim`            | String   | `name`       | Customer name                         |
| `email`           | String   | `email`      | Email (partially masked in response)  |
| `telefon`         | String   | `phone`      | Phone number                          |
| `adres`           | String   | `address`    | **Full address string**               |
| `fatura_adres`    | String   | -            | Billing address (often same as adres) |
| `tarife`          | String   | -            | Plan name                             |
| `tarife_fiyat`    | Decimal  | -            | Plan price                            |
| `bakiye`          | Decimal  | -            | Account balance                       |
| `bitis_tarihi`    | DateTime | -            | Service end date                      |
| `faturalar`       | Array    | -            | Invoice records                       |
| `ariza_kayitlari` | Array    | -            | Fault/ticket records                  |
| `trafik_data`     | Array    | -            | Traffic usage data                    |

**Address Format Example:**

```
"**** Mah. **** Cd. No:**/7 Muratpaşa/Antalya"
Pattern: {Mahalle} Mah. {Cadde} Cd. No:{NumaraNo}/{Daire} {İlçe}/{İl}
```

**Neighborhood Extraction:**

- Pattern: `(.*?) Mah\.` (capture group before " Mah.")
- Example: Extract "\***\* " from "\*\*** Mah. ..."
- **Reliability:** MEDIUM (depends on consistent formatting)

### Invoices Endpoint (Detailed)

**GET** `/api/oim/invoice_detail/{fatura_no}`

**Response Structure:**

```json
{
  "success": true,
  "message": "Başarılı",
  "data": {
    "invoice": [
      {
        "id": 39532,
        "fatura_no": "ISS1670510177611979",
        "musteri_id": "1",
        "plan_id": "29",
        "type": "2",
        "total": "70.00",
        "tsiz_total": "0.00000",
        "status": "1",
        "payment_type": "1",
        "days": "30",
        "issue_date": "2022-12-08 22:59:21",
        "duedate": "2022-12-08 22:59:21",
        "paid_date": "2022-12-08 22:59:21",
        "description": "Düzici-10Mb",
        "withoutKDV": "54.69",
        "kdv": "9.84",
        "oiv": "5.47",
        "paid_by": "1",
        "paid_by_id": "1"
      }
    ]
  }
}
```

**Finance Mapping:**

- Invoice accessible per-customer only (no bulk endpoint)
- Invoice array available in `customer_information` response
- Requires iterating through all customers (if admin API existed)

### Rate Limiting

**Headers Observed:**

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
```

**Analysis:**

- Limit: 60 requests per window
- Window: Not specified (assumed per minute based on common practice)
- **Implication:** Sync operations must respect rate limits

**Recommended Sync Strategy:**

- Batch size: 50 customers per minute (buffer for retries)
- Exponential backoff on rate limit errors
- Monitor `X-RateLimit-Remaining` header

### Error Response Format

**Standard Error Response:**

```json
{
  "success": false,
  "message": "Error description in Turkish",
  "data": []
}
```

**HTTP Status Codes:**

- 200 OK: Success (even for logical errors, check `success` field)
- 401 Unauthorized: Invalid/expired token
- 429 Too Many Requests: Rate limit exceeded
- 500 Internal Server Error: Server error

---

## Critical Findings

### 1. No Admin/Bulk Access Endpoints ❌

**Problem:** ISS Manager API is customer-facing (OIM = Online İşlem Merkezi)

**Missing Endpoints:**

- ❌ GET `/api/admin/customers` - List all customers
- ❌ GET `/api/admin/personnel` - List all staff
- ❌ GET `/api/admin/invoices` - List all invoices
- ❌ GET `/api/admin/analytics` - Get aggregated data

**Implication:** Cannot fetch bulk customer data for CRM sync

**Current API Limitation:**

- Must authenticate AS EACH CUSTOMER to get their data
- Requires knowing all customer usernames/passwords
- Not feasible for admin/CRM integration

### 2. No Personnel/Staff Endpoints ❌

**Problem:** No staff/personnel data exposed via API

**Implication:** Personnel performance tracking feature cannot be implemented

**Alternative:** Personnel data must come from different source (manual entry, database export, etc.)

### 3. Neighborhood Data Extraction Required ⚠️

**Problem:** No dedicated `neighborhood` field

**Solution:** Parse from `adres` field using regex

**Example Parsing:**

```javascript
const extractNeighborhood = (adres: string): string | null => {
  const match = adres.match(/^(.*?)\s*Mah\./);
  return match ? match[1].trim() : null;
};
```

**Reliability:** MEDIUM (depends on address format consistency)

**Risk:** Address format variations may cause parsing failures

### 4. Authentication Method Incorrect ⚠️

**Previous Assumption:** Bearer Token

**Actual Method:** Custom `X-HTTP-Authorization` header

**Impact:** Existing client code must be updated

**Code Change Required:**

```typescript
// OLD (incorrect)
headers: {
  'Authorization': `Bearer ${config.apiKey}`
}

// NEW (correct)
headers: {
  'X-HTTP-Authorization': token
}
```

### 5. Token Management Required

**Lifecycle:**

- Token generated on login
- Token invalidates on password change
- No refresh token mechanism
- Must re-authenticate on token expiration

**Implication:** Token refresh logic required in client

---

## Integration Feasibility Assessment

### Original Plan vs. Reality

| Feature                 | Original Plan            | Reality                  | Status     |
| ----------------------- | ------------------------ | ------------------------ | ---------- |
| Customer Data Sync      | Bulk fetch via admin API | ❌ No bulk endpoint      | 🔴 BLOCKED |
| Personnel Data Sync     | Bulk fetch via admin API | ❌ No personnel endpoint | 🔴 BLOCKED |
| Finance Data Sync       | Bulk fetch via admin API | ❌ No bulk endpoint      | 🔴 BLOCKED |
| Neighborhood Extraction | Direct field             | ⚠️ Requires parsing      | 🟡 RISKY   |
| Real-Time Sync          | Polling                  | ⚠️ Rate limited          | 🟡 LIMITED |

### Integration Feasibility: 🔴 **NOT FEASIBLE**

**Reason:** ISS Manager API does not provide admin/bulk access endpoints required for CRM integration.

**Alternative Solutions:**

#### Option 1: Request Admin API from Vendor (RECOMMENDED)

**Action:** Contact teknik@quartbilisim.net

**Request:**

- Admin API endpoints for bulk customer data
- Admin API endpoints for personnel data
- Admin API endpoints for aggregate financial data
- Documentation for admin API

**Success Probability:** UNKNOWN (depends on vendor willingness)

**Timeline:** 2-4 weeks (vendor development time)

#### Option 2: Database Export Mechanism

**Action:** Request direct database access or scheduled exports

**Request:**

- Read-only database credentials
- OR: Scheduled CSV/JSON exports
- OR: Database replication/sync

**Success Probability:** MEDIUM (common for enterprise integrations)

**Timeline:** 1-2 weeks (vendor setup time)

#### Option 3: Manual Data Export + Import

**Action:** Use ISS Manager's built-in export features (if available)

**Process:**

1. Export customer data from ISS Manager admin panel
2. Import into CRM Analiz via admin UI
3. Schedule periodic manual exports

**Success Probability:** HIGH (no vendor dependency)

**Timeline:** Immediate (labor-intensive)

**Downside:** Not real-time, manual process

#### Option 4: Screen Scraping / RPA (NOT RECOMMENDED)

**Action:** Automate ISS Manager web UI interactions

**Process:**

1. Use Selenium/Puppeteer to log in as admin
2. Navigate to customer list
3. Scrape data from HTML tables

**Success Probability:** LOW (brittle, maintenance-heavy)

**Timeline:** 2-3 weeks (development + testing)

**Risks:**

- Breaks on UI changes
- Violates terms of service (potentially)
- Performance issues
- Legal/ethical concerns

---

## Updated Field Mapping Plan

### Customer Data Mapping (REVISED)

**Source:** ISS Manager `/api/oim/customer_information` (per-customer)

**Target:** CRM Analiz `CustomerSnapshot` model

| ISS Manager Field      | CustomerSnapshot Field | Transform Rule          | Null Handling   | Confidence |
| ---------------------- | ---------------------- | ----------------------- | --------------- | ---------- |
| `abone_no`             | `externalId`           | String                  | Required        | HIGH       |
| `isim`                 | `name`                 | String                  | Required        | HIGH       |
| `email`                | `email`                | String, lowercase       | Optional        | HIGH       |
| `telefon`              | `phone`                | String                  | Optional        | HIGH       |
| `adres`                | `address`              | String                  | Optional        | HIGH       |
| `adres` (parsed)       | `neighborhood`         | Regex: `^(.*?) Mah\.`   | Optional        | **MEDIUM** |
| (extract from `adres`) | `district`             | Regex: district pattern | Optional        | LOW        |
| (extract from `adres`) | `city`                 | Regex: city pattern     | Optional        | MEDIUM     |
| `bitis_tarihi`         | `capturedAt`           | ISO 8601 → Date         | Fallback: now() | HIGH       |
| (entire response)      | `rawData`              | JSON                    | Store full      | HIGH       |

**Neighborhood Extraction Example:**

```typescript
// Input: "**** Mah. **** Cd. No:**/7 Muratpaşa/Antalya"
// Output neighborhood: "****"
// Output district: "Muratpaşa"
// Output city: "Antalya"
```

**Address Parsing Regex:**

```typescript
const parseAddress = (adres: string) => {
  const neighborhoodMatch = adres.match(/^(.*?)\s*Mah\./);
  const parts = adres.split('/');
  const lastPart = parts[parts.length - 1];
  const [district, city] = lastPart.split('/').map((s) => s.trim());

  return {
    neighborhood: neighborhoodMatch ? neighborhoodMatch[1].trim() : null,
    district: district || null,
    city: city || parts[parts.length - 1].trim(),
  };
};
```

### Personnel Data Mapping (NOT POSSIBLE)

**Status:** ❌ NO SOURCE DATA

**Reason:** ISS Manager API does not expose personnel endpoints

**Alternative:** Manual personnel management via CRM Analiz admin UI

### Finance Data Mapping (LIMITED)

**Source:** ISS Manager `customer.faturalar` array (per-customer)

**Target:** CRM Analiz `FinanceSnapshot` model

| ISS Manager Field | FinanceSnapshot Field | Transform Rule          | Confidence |
| ----------------- | --------------------- | ----------------------- | ---------- |
| `fatura_no`       | `externalId`          | String                  | HIGH       |
| `type`            | `transactionType`     | String (map type codes) | MEDIUM     |
| `total`           | `amount`              | Decimal                 | HIGH       |
| (hardcoded)       | `currency`            | "TRY"                   | HIGH       |
| `issue_date`      | `date`                | ISO 8601 → Date         | HIGH       |
| (entire invoice)  | `rawData`             | JSON                    | HIGH       |

**Limitation:** Finance data available only per-customer, not in aggregate

---

## Revised Integration Plan

### Phase 1: Vendor Negotiation (CRITICAL)

**Objective:** Obtain admin API access or database export mechanism

**Tasks:**

1. Contact teknik@quartbilisim.net
2. Explain CRM integration requirements
3. Request admin API endpoints or database access
4. Negotiate timeline and technical details
5. Document agreement

**Success Criteria:**

- [ ] Vendor agrees to provide admin API OR database access
- [ ] Timeline established (target: 2-4 weeks)
- [ ] Technical specification received

**Risk:** HIGH (vendor may refuse or delay)

**Mitigation:** Prepare Option 3 (manual export) as fallback

---

### Phase 2A: Admin API Integration (IF VENDOR PROVIDES)

**Objective:** Implement ISS Manager admin API client

**Dependencies:** Phase 1 success + admin API specification

**Tasks:**

1. Update `issmanager.client.ts` with admin endpoints
2. Implement authentication (`X-HTTP-Authorization` header)
3. Implement bulk customer fetch
4. Implement personnel fetch (if available)
5. Implement finance aggregate fetch (if available)
6. Add address parsing logic for neighborhood extraction
7. Integration tests with real admin API

**Estimated Effort:** 6-8 hours

---

### Phase 2B: Database Export Integration (IF DATABASE ACCESS)

**Objective:** Implement database sync mechanism

**Dependencies:** Phase 1 success + database credentials/export format

**Tasks:**

1. Receive database schema documentation
2. Implement database connector (if direct access)
3. OR: Implement CSV/JSON import logic (if exports)
4. Map database fields to CRM Analiz models
5. Implement incremental sync (detect changed records)
6. Schedule periodic sync
7. Integration tests

**Estimated Effort:** 8-10 hours

---

### Phase 2C: Manual Export/Import (FALLBACK)

**Objective:** Implement manual data import workflow

**Dependencies:** None (no vendor dependency)

**Tasks:**

1. Export customer data from ISS Manager (manual)
2. Create CSV/Excel template matching export format
3. Implement CSV import API endpoint
4. Create admin UI for file upload
5. Parse and validate imported data
6. Insert into CustomerSnapshot table
7. Add import history tracking

**Estimated Effort:** 6-8 hours

**Process:**

1. Admin exports customers from ISS Manager (weekly/monthly)
2. Admin uploads CSV to CRM Analiz
3. System validates and imports data
4. Reports import success/errors

---

### Phase 3: Dashboard Wiring (AFTER DATA SOURCE RESOLVED)

**Objective:** Connect dashboard modules to snapshot data

**Dependencies:** Phase 2A, 2B, or 2C complete

**Tasks:**

1. Implement `/dashboard/customers` page
2. Implement `/dashboard/finance` reports
3. Implement neighborhood quality scoring
4. Wire dashboard main cards to live data

**Estimated Effort:** 6-8 hours

---

## Recommendations

### Immediate Actions (Priority 1)

1. **Contact ISS Manager Vendor**
   - Email: teknik@quartbilisim.net
   - Subject: "CRM Entegrasyonu için Admin API Talebi"
   - Content: Explain need for bulk customer/personnel/finance data access
   - Timeline: Within 24 hours

2. **Update Integration Framework**
   - Change authentication from Bearer to `X-HTTP-Authorization`
   - File: `apps/api/src/modules/integrations/issmanager/issmanager.client.ts`
   - Timeline: 1 hour

3. **Implement Address Parsing**
   - Create neighborhood extraction utility
   - Test with sample addresses
   - Timeline: 2 hours

### Short-Term Actions (Priority 2)

4. **Prepare Fallback Plan**
   - Design manual CSV import workflow
   - Create import template
   - Timeline: 4 hours

5. **Update Documentation**
   - Reflect real API contract in existing docs
   - Update integration requirements
   - Timeline: 1 hour

### Long-Term Actions (Priority 3)

6. **Implement Admin API Client** (IF vendor provides)
   - Full integration as planned
   - Timeline: 6-8 hours

7. **Alternative: Database Sync** (IF vendor provides DB access)
   - Direct database integration
   - Timeline: 8-10 hours

---

## Conclusion

### Key Takeaways

✅ **API Contract Successfully Extracted**

- Postman API Gateway method successful
- Complete endpoint documentation obtained
- Real authentication method discovered

❌ **Integration NOT FEASIBLE with Current API**

- ISS Manager API is customer self-service only
- No admin/bulk access endpoints
- Personnel data not exposed

⚠️ **Vendor Engagement CRITICAL**

- Admin API or database access required
- Manual export/import as fallback
- Timeline: 2-4 weeks (vendor-dependent)

### Next Steps

**Immediate:** Contact teknik@quartbilisim.net to request admin API

**Short-Term:** Prepare manual CSV import fallback

**Long-Term:** Implement full integration after vendor provides admin access

---

**Report Generated:** 2026-03-27 01:00 UTC
**Discovery Method:** Postman API Gateway
**Status:** ✅ API CONTRACT EXTRACTED, 🔴 INTEGRATION BLOCKED
**Blocker:** No admin API endpoints
**Recommended Action:** Vendor engagement for admin API
