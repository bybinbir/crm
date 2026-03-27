const API_BASE = 'http://localhost:3001';

async function debugJWT() {
  console.log('=== JWT Debug Harness ===\n');

  try {
    // 1. Login and get token
    console.log('[1/3] Login...');
    const loginResponse = await fetch(`${API_BASE}/api/v1/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@test.com', password: 'admin' }),
    });

    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.accessToken;
    console.log(`✓ Login successful, token received (${token.length} chars)\n`);

    // 2. Decode JWT payload
    console.log('[2/3] JWT Token Analysis');
    const tokenParts = token.split('.');
    console.log(`  Parts: ${tokenParts.length} (header.payload.signature)`);

    const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
    console.log('  Header:', JSON.stringify(header, null, 2));

    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    console.log('  Payload:', JSON.stringify(payload, null, 2));

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = payload.exp - now;
    console.log(
      `  Expires: ${new Date(payload.exp * 1000).toISOString()} (in ${expiresIn}s)`
    );
    console.log(`  Valid: ${expiresIn > 0 ? '✓ YES' : '✗ NO (EXPIRED)'}\n`);

    // 3. Test protected endpoint with detailed error
    console.log('[3/3] Protected endpoint test: GET /api/v1/customers');
    console.log(`  Authorization: Bearer ${token.substring(0, 30)}...`);

    const customersResponse = await fetch(`${API_BASE}/api/v1/customers`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(
      `\n  Response status: ${customersResponse.status} ${customersResponse.statusText}`
    );
    console.log('  Response headers:');
    customersResponse.headers.forEach((value, key) => {
      console.log(`    ${key}: ${value}`);
    });

    const responseBody = await customersResponse.text();
    console.log('\n  Response body:');
    console.log(responseBody);

    if (customersResponse.status === 401) {
      console.log('\n❌ UNAUTHORIZED - JWT validation failed');
      console.log('   Possible causes:');
      console.log('   - JwtStrategy not properly registered');
      console.log('   - Secret mismatch between sign and verify');
      console.log('   - Strategy not executed (check logs)');
    } else if (customersResponse.status === 200) {
      console.log('\n✅ SUCCESS - Protected endpoint accessible');
    }
  } catch (error) {
    console.error('\n=== ❌ ERROR ===');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

debugJWT();
