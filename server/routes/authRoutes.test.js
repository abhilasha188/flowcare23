const assert = require('node:assert/strict');
const { once } = require('node:events');
const test = require('node:test');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET ||= require('node:crypto').randomBytes(64).toString('hex');
process.env.CLIENT_URL ||= 'http://localhost:5173';

const app = require('../app');
const { AUTH_COOKIE_NAME } = require('../utils/auth');
let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (!server) return;
  server.close();
  await once(server, 'close');
});

async function getCsrf() {
  const response = await fetch(`${baseUrl}/api/auth/csrf`);
  const data = await response.json();
  const csrfHeader = response.headers.getSetCookie().find((header) => (
    header.startsWith('flowcare_csrf=') && header.includes('Path=/api;') && !header.includes('1970')
  ));
  const cookie = csrfHeader?.split(';', 1)[0];
  assert.equal(response.status, 200);
  assert.ok(cookie);
  assert.match(csrfHeader || '', /Path=\/api/i);
  assert.equal(typeof data.csrfToken, 'string');
  return { cookie, token: data.csrfToken };
}

test('requires a valid session for the current-user endpoint', async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).success, false);
});

test('requires authentication for all private tracking, analytics, reminder, and profile endpoints', async () => {
  for (const path of [
    '/api/cycles',
    '/api/predictions',
    '/api/analytics/overview',
    '/api/analytics/cycles',
    '/api/analytics/symptoms',
    '/api/analytics/moods',
    '/api/analytics/patterns',
    '/api/symptoms',
    '/api/reminders',
    '/api/users/me',
  ]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 401, `${path} must require a session`);
  }
});

test('serves curated resource results without requiring health-data authentication', async () => {
  const response = await fetch(`${baseUrl}/api/resources?search=period%20pain`);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.resources.length, 1);
  assert.equal(data.resources[0].slug, 'period-pain');
  assert.equal(data.resources[0].sourceOrganization, 'NHS');

  const detail = await fetch(`${baseUrl}/api/resources/pcos-awareness`);
  assert.equal(detail.status, 200);
  assert.equal((await detail.json()).resource.category, 'PCOS awareness');
});

test('reports API and database availability without exposing connection details', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const data = await response.json();
  assert.equal(response.status, 503);
  assert.equal(data.database, 'unavailable');
  assert.equal(Object.hasOwn(data, 'connectionString'), false);
  assert.equal(Object.hasOwn(data, 'credentials'), false);
});

test('rejects state-changing requests without CSRF verification', async () => {
  const response = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' });
  assert.equal(response.status, 403);
});

test('rejects expired JWT sessions', async () => {
  const token = jwt.sign({ sub: 'expired-user' }, process.env.JWT_SECRET, { expiresIn: -1 });
  const response = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Cookie: `${AUTH_COOKIE_NAME}=${token}` },
  });
  assert.equal(response.status, 401);
});

test('validates registration input before database access', async () => {
  const csrf = await getCsrf();
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:5173',
      'Content-Type': 'application/json',
      Cookie: csrf.cookie,
      'X-CSRF-Token': csrf.token,
    },
    body: JSON.stringify({}),
  });
  const data = await response.json();
  assert.equal(response.status, 400);
  assert.equal(data.success, false);
  assert.ok(data.errors.length >= 4);
});

test('clears the session cookie on a CSRF-verified logout', async () => {
  const csrf = await getCsrf();
  const response = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:5173',
      Cookie: csrf.cookie,
      'X-CSRF-Token': csrf.token,
    },
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);
  assert.ok(response.headers.getSetCookie().some((header) => /flowcare_session=;/.test(header)));
});

test('rejects requests from an untrusted browser origin', async () => {
  const csrf = await getCsrf();
  const response = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: {
      Origin: 'https://untrusted.example',
      Cookie: csrf.cookie,
      'X-CSRF-Token': csrf.token,
    },
  });
  assert.equal(response.status, 403);
});

test('rate limits repeated login attempts', async () => {
  const csrf = await getCsrf();
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:5173',
        'Content-Type': 'application/json',
        Cookie: csrf.cookie,
        'X-CSRF-Token': csrf.token,
      },
      body: JSON.stringify({ email: '', password: '' }),
    });
    assert.equal(response.status, attempt <= 5 ? 400 : 429);
  }
});
