const assert = require('node:assert/strict');
const test = require('node:test');
const Cycle = require('../models/Cycle');
const { CycleError, findOwnedCycle, parsePeriodInput } = require('./cycleService');

function assertCycleError(input, expectedStatus = 400) {
  assert.throws(
    () => parsePeriodInput(input),
    (error) => error instanceof CycleError && error.statusCode === expectedStatus,
  );
}

test('parses valid date-only inputs into UTC midnight', () => {
  const parsed = parsePeriodInput({ startDate: '2024-02-29', endDate: '2024-03-04' });
  assert.equal(parsed.startDate.toISOString(), '2024-02-29T00:00:00.000Z');
  assert.equal(parsed.endDate.toISOString(), '2024-03-04T00:00:00.000Z');
});

test('accepts a period without an end date as ongoing', () => {
  const today = new Date().toISOString().slice(0, 10);
  const parsed = parsePeriodInput({ startDate: today, endDate: '' });
  assert.equal(parsed.startDate.toISOString().slice(0, 10), today);
  assert.equal(parsed.endDate, null);
});

test('rejects invalid dates, reversed ranges, future dates, and excessively long periods', () => {
  assertCycleError({ startDate: '2025-02-30' });
  assertCycleError({ startDate: '2025-01-02', endDate: '2025-01-01' });
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  assertCycleError({ startDate: tomorrow });
  assertCycleError({ startDate: '1900-01-01' });
  assertCycleError({ startDate: '2025-01-01', endDate: '2025-01-16' });
});

test('scopes cycle lookups to the requester and hides records owned by someone else', async () => {
  const originalFindOne = Cycle.findOne;
  const ownerId = '507f1f77bcf86cd799439011';
  const cycleId = '507f1f77bcf86cd799439012';
  let query;
  Cycle.findOne = async (value) => {
    query = value;
    return null;
  };

  try {
    await assert.rejects(
      findOwnedCycle({ _id: ownerId }, cycleId),
      (error) => error instanceof CycleError && error.statusCode === 404,
    );
    assert.deepEqual(query, { _id: cycleId, userId: ownerId });
  } finally {
    Cycle.findOne = originalFindOne;
  }
});
