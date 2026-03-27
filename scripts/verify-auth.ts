import axios from 'axios';

const API_BASE = 'http://localhost:3001';

async function verifyAuth() {
  console.log('=== Auth Verification Harness ===\n');

  try {
    // 1. Health check
    console.log('[1/4] Health check...');
    const health = await axios.get(`${API_BASE}/api/v1/health`);
    console.log(`✓ Health: ${health.status} - ${health.data.status}\n`);

    // 2. Login
    console.log('[2/4] Login attempt...');
    const loginResponse = await axios.post(`${API_BASE}/api/v1/api/v1/auth/login`, {
      email: 'admin@test.com',
      password: 'admin',
    });
    console.log(`✓ Login: ${loginResponse.status}`);
    console.log(`  User: ${loginResponse.data.user.email} (${loginResponse.data.user.role})`);
    console.log(`  Token length: ${loginResponse.data.accessToken?.length || 0} chars\n`);

    const token = loginResponse.data.accessToken;

    // 3. Protected endpoint #1 - Customers
    console.log('[3/4] Protected endpoint: GET /api/v1/customers');
    const customersResponse = await axios.get(`${API_BASE}/api/v1/customers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`✓ Customers: ${customersResponse.status}`);
    console.log(`  Total: ${customersResponse.data.total || 0} customers`);
    console.log(`  Page: ${customersResponse.data.page || 1}/${customersResponse.data.pageSize || 50}\n`);

    // 4. Protected endpoint #2 - Dashboard metrics
    console.log('[4/4] Protected endpoint: GET /api/v1/dashboard/metrics');
    const metricsResponse = await axios.get(`${API_BASE}/api/v1/dashboard/metrics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`✓ Dashboard: ${metricsResponse.status}`);
    console.log(`  Total customers: ${metricsResponse.data.totalCustomers || 0}`);
    console.log(`  Total neighborhoods: ${metricsResponse.data.totalNeighborhoods || 0}`);
    console.log(`  Import success rate: ${metricsResponse.data.importSuccessRate || 0}%\n`);

    console.log('=== ✅ ALL TESTS PASSED ===');
    process.exit(0);
  } catch (error: any) {
    console.error('\n=== ❌ TEST FAILED ===');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Message: ${error.response.data?.message || 'Unknown'}`);
      console.error(`Endpoint: ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
    } else {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}

verifyAuth();
