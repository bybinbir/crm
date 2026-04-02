# ISS Manager API Analysis - Task 075

**Rapor Tarihi:** 2026-04-02
**Görev ID:** CRM-ANALIZ-ISSMANAGER-DOCS-TO-LIVE-SYNC-075
**API Dokümantasyon:** https://documenter.getpostman.com/view/3408876/2sBXcGCe5H

---

## Yönetici Özeti

ISS Manager API dokümantasyonu başarıyla analiz edildi. **Quart Bilişim OIM (Online İşlem Merkezi)** API'si, internet servis sağlayıcısı müşteri yönetim sisteminin dış entegrasyon katmanıdır.

### Kritik Bulgular

1. **Base URL:** Dokümantasyonda açık base URL yok (müşteriye özel domain kullanılacak)
2. **Authentication:** Two-step token-based authentication (username/password → JWT token)
3. **Token Header:** `X-HTTP-Authorization` (not standard `Authorization`)
4. **Customer Data Endpoint:** `GET /api/oim/customer_information` (32 field içerir)
5. **Response Format:** JSON with `{success, message, data}` structure
6. **Content-Type:** `application/x-www-form-urlencoded` (login için)

### Mevcut Durum

**Placeholder Config (Production DB):**

```
base_url: https://iss-manager.example.com/api  ← INVALID
status: PENDING
last_test_at: NULL
```

**Gerekli Güncellemeler:**

- Real base URL (müşteriden alınacak)
- Real username/password (encrypted in DB)
- Auth flow implementation (login → token → subsequent requests)
- Customer data parsing (32 field mapping)

---

## API Teknik Spesifikasyonu

### 1. Base URL

**Pattern:**

```
https://<customer-issmanager-domain>/api/oim/*
```

**Örnekler:**

```
https://issmanager.example.com/api/oim/login
https://issmanager.example.com/api/oim/customer_information
```

**Not:** Gerçek domain müşteri tarafından sağlanmalıdır.

### 2. Authentication Flow

#### Step 1: Login (Get Token)

**Request:**

```http
POST /api/oim/login
Content-Type: application/x-www-form-urlencoded

username=your_username&password=your_password
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Giriş Başarılı.",
  "data": {
    "token": "eyJpdiI6IjVObTZzRXZYZzVxb0lTSWNvSmZJTkE9PSIsInZhbH..."
  }
}
```

#### Step 2: Use Token in Subsequent Requests

**Headers:**

```http
X-HTTP-Authorization: eyJpdiI6IjVObTZzRXZYZzVxb0lTSWNvSmZJTkE9PSIsInZhbH...
```

**Not:** Token her login'de yenilenir. Token lifespan bilinmiyor (test edilecek).

### 3. Customer Data Endpoint

**Request:**

```http
GET /api/oim/customer_information
X-HTTP-Authorization: <token>
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
      "tarife": "Düziçi-10Mb",
      "tarife_fiyat": "70.00000",
      "bitis_tarihi": "2023-01-07 22:59:21",
      "bakiye": "123.00000",
      "faturalar": [...],
      "ariza_kayitlari": [...],
      "diger_abonelikler": [...],
      ...
    }
  }
}
```

**Toplam 32 Field:**

- `abone_no` - Subscriber number
- `isim` - Customer name
- `email` - Email address
- `telefon` - Phone number
- `adres` - Address
- `fatura_adres` - Billing address
- `tarife` - Plan/tariff name
- `tarife_fiyat` - Plan price
- `bitis_tarihi` - Service end date
- `bakiye` - Balance (prepaid)
- `on_odemeli` - Prepaid flag (boolean)
- `pppoe_k_adi` - PPPoE username
- `pppoe_parola` - PPPoE password
- `oim_k_adi` - OIM username
- `faturalar` - Array of invoices
- `ariza_kayitlari` - Array of tickets
- `trafik_data` - Array of traffic data
- `diger_abonelikler` - Array of other subscriptions
- - 14 more fields (KDV, OIV, tarife_ek_hizmet, etc.)

### 4. Error Response Format

**Example (Assumed from pattern):**

```json
{
  "success": false,
  "message": "Kullanıcı adı veya şifre hatalı",
  "data": []
}
```

### 5. Rate Limiting

**Headers in Response:**

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
```

**Interpretation:** 60 requests per time window (window duration unknown).

### 6. Additional Endpoints (Available)

Total 18 endpoints documented:

**OIM Customer API (`/api/oim/*`):**

1. `POST /api/oim/login` - Authenticate / Get Token
2. `GET /api/oim/customer_information` - Get all customer data
3. `POST /api/oim/send_password` - Send password via SMS
4. `POST /api/oim/change_password` - Change password
5. `GET /api/oim/plans` - Get available plans
6. `POST /api/oim/requestPlanChange` - Request plan change
7. `GET /api/oim/invoice_detail/{invoice_no}` - Get invoice details
8. `POST /api/oim/payment_form` - Get payment form data
9. `GET /api/oim/tickets` - Get support tickets
10. `POST /api/oim/ticket_open` - Open support ticket
11. `POST /api/oim/gih_change` - Change safe internet profile
12. `POST /api/oim/odeme-ok/{order}` - Payment process callback

**ISS Internal API (`/api/iss/*`):** 13. `POST /api/iss/api/authenticate` - Internal auth 14. `POST /api/iss/api/find` - Find records 15. `POST /api/iss/api/list` - List records 16. `POST /api/iss/api/invoices` - Get invoices 17. `POST /api/iss/api/payment_types` - Get payment types 18. `POST /api/iss/api/arti_gun_ekle` - Add advance days

**Note:** For CRM Analiz, we only need **OIM Customer API** (specifically `customer_information`).

---

## CRM Analiz Integration Requirements

### Current Implementation Analysis

**File:** `apps/api/src/modules/integrations/issmanager/issmanager.client.ts`

**Current (Placeholder):**

```typescript
async login(): Promise<void> {
  // Placeholder: no real implementation
  this.logger.warn('ISSmanager login called (placeholder)');
}

async fetchCustomers(): Promise<any[]> {
  // Placeholder: returns empty array
  return [];
}
```

### Required Changes

#### 1. Configuration Update

**Database:** `integration_configs` table

**Current:**

```sql
base_url: 'https://iss-manager.example.com/api'  -- INVALID
username: NULL
password: NULL (encrypted)
```

**Required:**

```sql
base_url: 'https://<REAL-DOMAIN>/api'  -- From customer
username: <REAL-USERNAME>              -- From customer
password: <AES-256-GCM encrypted>      -- From customer
```

**Where to Get:**

- Customer must provide ISS Manager instance domain
- Customer must provide OIM API credentials (username/password)
- Update via dashboard: http://194.15.45.47:4000/dashboard/integrations/issmanager

#### 2. Client Code Implementation

**Login Method:**

```typescript
private tokenCache: string | null = null;
private tokenExpiry: Date | null = null;

async login(): Promise<string> {
  // Check token cache
  if (this.tokenCache && this.tokenExpiry && this.tokenExpiry > new Date()) {
    return this.tokenCache;
  }

  // Get credentials from integration config
  const config = await this.getConfig(); // From DB
  const username = config.username;
  const password = await this.decrypt(config.password);

  // POST /api/oim/login
  const response = await axios.post(
    `${config.base_url}/oim/login`,
    new URLSearchParams({
      username,
      password
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  // Validate response
  if (!response.data.success) {
    throw new Error(`Login failed: ${response.data.message}`);
  }

  // Cache token (assume 1 hour lifespan, adjust if known)
  this.tokenCache = response.data.data.token;
  this.tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

  return this.tokenCache;
}
```

**Fetch Customers Method:**

```typescript
async fetchCustomers(): Promise<any[]> {
  // Get auth token
  const token = await this.login();

  // Get config
  const config = await this.getConfig();

  // GET /api/oim/customer_information
  const response = await axios.get(
    `${config.base_url}/oim/customer_information`,
    {
      headers: {
        'X-HTTP-Authorization': token
      }
    }
  );

  // Validate response
  if (!response.data.success) {
    throw new Error(`Fetch failed: ${response.data.message}`);
  }

  // Extract customer data
  const customerData = response.data.data.customer;

  // Map to our format
  const customers = [{
    externalId: customerData.abone_no,
    name: customerData.isim,
    email: customerData.email,
    phone: customerData.telefon,
    address: customerData.adres,
    billingAddress: customerData.fatura_adres,
    plan: customerData.tarife,
    planPrice: parseFloat(customerData.tarife_fiyat),
    serviceEndDate: new Date(customerData.bitis_tarihi),
    balance: parseFloat(customerData.bakiye),
    isPrepaid: customerData.on_odemeli,
    metadata: {
      pppoeUsername: customerData.pppoe_k_adi,
      invoices: customerData.faturalar,
      tickets: customerData.ariza_kayitlari,
      // ... other fields
    }
  }];

  return customers;
}
```

**Note:** This endpoint returns SINGLE customer (authenticated user's data). For bulk customer export, we may need `/api/iss/api/list` (internal API), which requires different auth.

#### 3. Error Handling

```typescript
async executeWithAuth<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        // Token expired, clear cache and retry
        this.tokenCache = null;
        this.tokenExpiry = null;
        return await operation();
      }

      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded');
      }

      if (error.code === 'ENOTFOUND') {
        throw new Error(`DNS resolution failed: ${config.base_url}`);
      }
    }
    throw error;
  }
}
```

#### 4. Data Mapping

**ISS Manager → CRM Analiz:**

| ISS Manager Field | CRM Analiz Field      | Type     | Notes              |
| ----------------- | --------------------- | -------- | ------------------ |
| `abone_no`        | `externalId`          | string   | Primary key        |
| `isim`            | `name`                | string   | Full name          |
| `email`           | `email`               | string   | Masked in response |
| `telefon`         | `phone`               | string   |                    |
| `adres`           | `address`             | string   |                    |
| `fatura_adres`    | `billingAddress`      | string   |                    |
| `tarife`          | `plan`                | string   | Plan name          |
| `tarife_fiyat`    | `planPrice`           | decimal  |                    |
| `bitis_tarihi`    | `serviceEndDate`      | datetime |                    |
| `bakiye`          | `balance`             | decimal  | Prepaid only       |
| `on_odemeli`      | `isPrepaid`           | boolean  |                    |
| `faturalar`       | `invoices` (metadata) | array    | Nested data        |
| `ariza_kayitlari` | `tickets` (metadata)  | array    | Nested data        |

---

## Next Steps

### Phase 1: Update Configuration (Customer Action Required)

**Customer must provide:**

1. Real ISS Manager base URL (e.g., `https://issmanager.quartbilisim.net`)
2. Real OIM API username
3. Real OIM API password

**Update method:**

- Via dashboard: http://194.15.45.47:4000/dashboard/integrations/issmanager
- Or via SQL (production DB):
  ```sql
  UPDATE integration_configs
  SET
    base_url = 'https://<REAL-DOMAIN>/api',
    username = '<REAL-USERNAME>',
    password = '<ENCRYPTED-PASSWORD>',
    status = 'PENDING'
  WHERE provider = 'ISSMANAGER';
  ```

### Phase 2: Implement Real Client (Code Changes)

**Files to modify:**

1. `apps/api/src/modules/integrations/issmanager/issmanager.client.ts`
2. `apps/api/src/modules/automation/workers/issmanager-automation.worker.ts` (if needed)

**Changes:**

- Implement `login()` with token caching
- Implement `fetchCustomers()` with real API call
- Add error handling and retry logic
- Add rate limit handling

### Phase 3: Connection Test

**Test sequence:**

1. DNS resolution: `nslookup <real-domain>`
2. HTTPS connectivity: `curl https://<real-domain>/api/oim/login`
3. Auth test: Login with real credentials
4. Data fetch test: Get customer_information

### Phase 4: Forced Scheduled Run

**Execute:**

```bash
ssh deploy@194.15.45.47
cd /var/www/crmanaliz/apps/api
# Trigger scheduler manually
pnpm scheduler:force-run
```

**Monitor:**

```sql
-- Check job status
SELECT * FROM automation_jobs ORDER BY created_at DESC LIMIT 5;

-- Check import batches
SELECT * FROM import_batches WHERE source = 'ISSMANAGER';

-- Check customers
SELECT COUNT(*) FROM customers WHERE import_batch_id IN (
  SELECT id FROM import_batches WHERE source = 'ISSMANAGER'
);
```

### Phase 5: Verify Persistence

**Success criteria:**

- At least 1 `COMPLETED` job in `automation_jobs`
- At least 1 record in `import_batches` with `source='ISSMANAGER'`
- At least 1 record in `customers` table
- No duplicate customers on second run (idempotency)

---

## Open Questions

### Q1: Single Customer vs Bulk Export?

**Issue:** `/api/oim/customer_information` returns authenticated user's data only.

**Options:**

1. Use `/api/iss/api/list` (internal API, endpoint 15) for bulk export
   - **Pro:** Likely returns all customers
   - **Con:** Different auth mechanism (unknown)
2. Accept single-customer mode
   - **Pro:** Works with documented OIM API
   - **Con:** Can't get full customer list for analytics

**Recommendation:** Test `/api/oim/customer_information` first. If it's single-customer only, investigate `/api/iss/api/list` or contact Quart Bilişim for bulk export endpoint.

### Q2: Token Lifespan?

**Issue:** Documentation doesn't specify token expiration time.

**Approach:**

- Implement token caching with 1-hour TTL (assumption)
- Handle 401 errors by re-authenticating
- Monitor actual token lifespan in logs

### Q3: Pagination?

**Issue:** `/api/oim/customer_information` response doesn't show pagination params.

**Approach:**

- If single-customer endpoint, pagination not needed
- If bulk endpoint, check for `page`, `limit`, `total` fields in response

### Q4: Real Base URL Unknown

**Blocker:** We cannot proceed without customer's real ISS Manager domain.

**Action Required:** Customer must provide real domain (e.g., `https://iss.example.com`).

---

## Risk Assessment

| Risk                                     | Severity  | Mitigation                                               |
| ---------------------------------------- | --------- | -------------------------------------------------------- |
| **Customer doesn't provide credentials** | 🔴 HIGH   | Blocker - Cannot proceed. Documented in Task 073.        |
| **Single-customer endpoint only**        | 🟡 MEDIUM | Contact vendor for bulk export API or accept limitation. |
| **Token expiration unknown**             | 🟢 LOW    | Implement retry with re-auth.                            |
| **Rate limiting**                        | 🟢 LOW    | Respect 60 req/window limit, add delays.                 |
| **DNS/HTTPS errors**                     | 🟢 LOW    | Standard error handling, fail gracefully.                |

---

## Appendix: API Collection File

**Location:** `F:/crmanaliz/docs/ops/issmanager-collection.json`

**Size:** 38,900 tokens (full Postman collection)

**Usage:**

- Import into Postman for interactive testing
- Contains all 18 endpoints with examples
- Contains request/response samples

---

**End of Report**

**Next Action:** Await customer credentials or proceed with implementation using placeholder domain for testing auth flow.
