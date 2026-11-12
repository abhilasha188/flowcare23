const assert = require('node:assert/strict');
const test = require('node:test');
const { resolveDateRange } = require('./analyticsService');

test('resolves date-only UTC ranges for dashboards and leap-year boundaries', () => {
  const range = resolveDateRange('30d', new Date('2024-03-01T22:00:00-08:00'));
  assert.equal(range.from.toISOString(), '2024-02-02T00:00:00.000Z');
  assert.equal(range.to.toISOString(), '2024-03-02T23:59:59.999Z');
  assert.deepEqual(resolveDateRange('all', new Date('2024-03-01T00:00:00Z')), { from: null, to: null });
});

test('resolves analytics ranges using the client-local calendar day', () => {
  const range = resolveDateRange('30d', new Date('2026-11-13T00:00:00Z'));
  assert.equal(range.from.toISOString(), '2026-10-15T00:00:00.000Z');
  assert.equal(range.to.toISOString(), '2026-11-13T23:59:59.999Z');
});

test('rejects unknown analytics ranges', () => {
  assert.throws(() => resolveDateRange('5d'), /valid date range/);
});
