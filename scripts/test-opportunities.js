// Node test script (requires Node 18+ for built-in fetch)
const BASE = 'http://localhost:5000';
(async () => {
  try {
    console.log('Logging in as admin...');
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@college.edu', password: 'admin123' })
    });
    const login = await loginRes.json();
    console.log('Login response:', JSON.stringify(login, null, 2));
    if (!login.token) {
      console.error('Login failed - no token'); process.exit(1);
    }
    const token = login.token;
    console.log('\nListing opportunities (admin):');
    const listRes = await fetch(`${BASE}/api/opportunities`, { headers: { Authorization: `Bearer ${token}` } });
    const list = await listRes.json();
    console.log(JSON.stringify(list, null, 2));
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
})();
