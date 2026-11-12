const assert = require('node:assert/strict');
const test = require('node:test');
const { dateOnlyInTimeZone } = require('./dateOnly');

test('resolves the client calendar date independently of the server timezone', () => {
  const instant = new Date('2026-11-12T20:00:00.000Z');

  assert.equal(dateOnlyInTimeZone(instant, 'UTC'), '2026-11-12');
  assert.equal(dateOnlyInTimeZone(instant, 'Asia/Kolkata'), '2026-11-13');
});

test('rejects invalid time zones instead of silently using the server date', () => {
  assert.throws(
    () => dateOnlyInTimeZone(new Date('2026-11-12T20:00:00.000Z'), 'not-a-time-zone'),
    RangeError,
  );
});
