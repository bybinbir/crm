# ISSmanager API Integration Requirements

## Current Status: PLACEHOLDER IMPLEMENTATION

The ISSmanager integration client (`apps/api/src/modules/integrations/issmanager/`) currently contains **placeholder code** that assumes generic REST API patterns. This document outlines what is needed to complete the integration.

## What EXISTS (Implemented)

###  Authentication Framework

- JWT token storage (encrypted in database)
- Configurable base URL and API key
- Timeout configuration
- Authorization header injection (`Bearer ${apiKey}`)

###  Connection Testing

- Generic health check endpoint probing
- Attempts 7 common patterns:
  - `/api/health`, `/api/v1/health`, `/health`
  - `/api/ping`, `/ping`
  - `/api/version`, `/version`
- Response time measurement
- Error normalization

###  Error Handling

- HTTP status code normalization
- Timeout detection
- Request/response error differentiation
- Consistent error format

###  Placeholder Data Fetch Methods

- `getCustomers(page?, limit?)`
- `getPersonnel(page?, limit?)`
- `getFinanceRecords(page?, limit?, startDate?, endDate?)`

**� WARNING:** These methods use **guessed endpoints** (`/api/customers`, `/api/personnel`, `/api/finance`) and will fail against real ISSmanager API.

## What is MISSING (Required for Production)

### 1. Real ISSmanager API Documentation

**Required Information:**

- [ ] Official API documentation URL
- [ ] API version being used
- [ ] Authentication method (is it really Bearer token?)
- [ ] Base URL format/structure
- [ ] Rate limiting policies
- [ ] Pagination strategy

### 2. Actual Endpoint Specifications

**Customer Data Endpoint:**

- [ ] Real endpoint path
- [ ] Request method (GET/POST?)
- [ ] Query parameters format
- [ ] Pagination mechanism
- [ ] Response structure
- [ ] Field mapping to our CustomerSnapshot model

**Personnel Data Endpoint:**

- [ ] Real endpoint path
- [ ] Request/response format
- [ ] Field mapping to our PersonnelSnapshot model

**Finance Data Endpoint:**

- [ ] Real endpoint path
- [ ] Date range parameter format
- [ ] Currency handling
- [ ] Field mapping to our FinanceSnapshot model

**Test/Health Endpoint:**

- [ ] Does ISSmanager have a health check endpoint?
- [ ] Or should we test with a minimal data fetch?

### 3. Authentication Clarification

**Questions:**

- Is the API key passed as `Authorization: Bearer {key}`?
- Or is it a custom header like `X-API-Key: {key}`?
- Or is it a query parameter `?api_key={key}`?
- Is there a login step to exchange API key for session token?

### 4. Data Format Mapping

Document field mapping between ISSmanager API responses and our snapshot models.

### 5. Error Response Format

Document ISSmanager error response structures for:

- Unauthorized (401)
- Not Found (404)
- Rate Limit (429)
- Server Error (500)

### 6. Integration Test Credentials

**Required:**

- [ ] Test/sandbox environment URL
- [ ] Test API key (non-production)
- [ ] Sample data in test environment
- [ ] Expected response examples

## How to Complete the Integration

### Step 1: Gather Documentation

Contact ISSmanager vendor/admin to obtain:

1. API documentation
2. Test environment credentials
3. Sample API responses (JSON examples)

### Step 2: Test Connection Manually

```bash
curl -X GET "https://issmanager.example.com/api/v1/health" \
  -H "Authorization: Bearer YOUR_TEST_API_KEY"
```

### Step 3: Update Client Code

**File:** `apps/api/src/modules/integrations/issmanager/issmanager.client.ts`

Update methods with real endpoints and response mapping.

### Step 4: Add Integration Tests

Create real integration test with actual API calls.

### Step 5: Update Documentation

Update this file with actual findings and architecture docs.

## Current Assumptions (TO BE VERIFIED)

S **Unverified Assumptions:**

1.  API uses Bearer token authentication
2.  Endpoints follow REST conventions
3.  Pagination uses `page` and `limit` parameters
4.  Date filters use ISO 8601 format
5.  API returns JSON
6.  Currency is always TRY
7.  There is a health check endpoint

**These assumptions MUST be validated before production use.**

## Risk Assessment

**=4 HIGH RISK:**

- Integration may completely fail on first real API call
- Placeholder endpoints will return 404 errors
- Authentication mechanism may be incorrect
- Data mapping will be incomplete

**=� MEDIUM RISK:**

- Error handling may not cover ISSmanager-specific error codes
- Rate limiting not handled
- Retry logic may not match API behavior

**=� LOW RISK:**

- Framework is solid (error normalization, timeout handling)
- Easy to update once real API spec is known

## Next Steps (Priority Order)

1. **CRITICAL:** Obtain ISSmanager API documentation
2. **CRITICAL:** Get test environment credentials
3. **HIGH:** Test connection manually
4. **HIGH:** Document actual endpoint paths and response formats
5. **HIGH:** Update client code with real endpoints
6. **MEDIUM:** Add response mapping logic
7. **MEDIUM:** Create integration tests
8. **LOW:** Optimize error handling

## Contact Information

**Who to ask about ISSmanager API:**

- [ ] ISSmanager vendor support: (contact info needed)
- [ ] Internal ISSmanager admin: (name/email needed)
- [ ] Technical documentation location: (URL needed)

---

**Last Updated:** 2026-03-25
**Status:** Awaiting ISSmanager API documentation
**Blocker:** No real API specification available
