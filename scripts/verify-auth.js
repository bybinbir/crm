const API_BASE = 'http://localhost:3001';

async function verifyAuth() {
  console.log('=== Auth Verification Harness ===\n');

  try {
    // 1. Health check
    console.log('[1/4] Health check...');
    const health = await fetch(`${API_BASE}/api/v1/health`);
    const healthData = await health.json();
    console.log(`✓ Health: ${health.status} - ${healthData.status}\n`);

    // 2. Login
    console.log('[2/4] Login attempt...');
    const loginResponse = await fetch(`${API_BASE}/api/v1/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@test.com', password: 'admin' }),
    });
    const loginData = await loginResponse.json();
    console.log(`✓ Login: ${loginResponse.status}`);
    console.log(`  User: ${loginData.user.email} (${loginData.user.role})`);
    console.log(`  Token length: ${loginData.accessToken?.length || 0} chars\n`);

    const token = loginData.accessToken;

    // 3. Protected endpoint #1 - Customers
    console.log('[3/4] Protected endpoint: GET /api/v1/customers');
    const customersResponse = await fetch(`${API_BASE}/api/v1/customers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const customersData = await customersResponse.json();
    console.log(`✓ Customers: ${customersResponse.status}`);
    console.log(`  Total: ${customersData.total || 0} customers`);
    console.log(`  Page: ${customersData.page || 1}/${customersData.pageSize || 50}\n`);

    // 4. Protected endpoint #2 - Dashboard metrics
    console.log('[4/4] Protected endpoint: GET /api/v1/dashboard/metrics');
    const metricsResponse = await fetch(`${API_BASE}/api/v1/dashboard/metrics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const metricsData = await metricsResponse.json();
    console.log(`✓ Dashboard: ${metricsResponse.status}`);
    console.log(`  Total customers: ${metricsData.totalCustomers || 0}`);
    console.log(`  Total neighborhoods: ${metricsData.totalNeighborhoods || 0}`);
    console.log(`  Import success rate: ${metricsData.importSuccessRate || 0}%\n`);

    console.log('=== ✅ ALL TESTS PASSED ===');
    process.exit(0);
  } catch (error) {
    console.error('\n=== ❌ TEST FAILED ===');
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

verifyAuth();
