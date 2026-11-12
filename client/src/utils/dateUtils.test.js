import assert from 'node:assert/strict';
import test from 'node:test';
import { dateOnlyToLocalDate, formatDate, getDateRange, localDateToDateOnly } from './dateUtils.js';

test('keeps date-only values stable across conversion and formatting', () => {
  const date = dateOnlyToLocalDate('2024-02-29');
  assert.equal(localDateToDateOnly(date), '2024-02-29');
  assert.notEqual(formatDate('2024-02-29'), 'Not recorded');
});

test('enumerates a date range inclusively across month boundaries', () => {
  assert.deepEqual(getDateRange('2024-02-28', '2024-03-01'), [
    '2024-02-28',
    '2024-02-29',
    '2024-03-01',
  ]);
  assert.deepEqual(getDateRange('2024-03-02', '2024-03-01'), []);
});
