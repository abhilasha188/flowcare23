const assert = require('node:assert/strict');
const test = require('node:test');
const Symptom = require('../models/Symptom');
const {
  SymptomError,
  findOwnedEntry,
  normalizeSymptomInput,
  parseListFilters,
} = require('./symptomService');

test('normalizes a daily symptom entry with multiple symptoms and optional health details', () => {
  const entry = normalizeSymptomInput({
    date: '2025-03-08',
    symptoms: [
      { name: 'Cramps', severity: 7, description: 'Mild in the morning' },
      { name: 'Custom symptom', severity: 2 },
    ],
    mood: 'calm',
    energyLevel: 6,
    sleepQuality: 8,
    flowIntensity: 'medium',
    notes: '  Took a rest. ',
  });

  assert.equal(entry.date.toISOString(), '2025-03-08T00:00:00.000Z');
  assert.deepEqual(entry.symptoms[1], { name: 'Custom symptom', severity: 2, description: '' });
  assert.equal(entry.notes, 'Took a rest.');
});

test('allows entries with only one optional health field', () => {
  assert.equal(normalizeSymptomInput({
    date: '2025-03-08',
    symptoms: [],
    energyLevel: 5,
  }).energyLevel, 5);
});

test('accepts the client local date when UTC is still on the previous day', () => {
  const entry = normalizeSymptomInput({
    date: '2026-11-13',
    symptoms: [{ name: 'Cramps', severity: 5 }],
  }, '2026-11-13');

  assert.equal(entry.date.toISOString(), '2026-11-13T00:00:00.000Z');
});

test('rejects invalid dates, future dates, duplicate symptoms, and invalid scores', () => {
  for (const input of [
    { date: '2025-02-30', symptoms: [{ name: 'Cramps', severity: 4 }] },
    { date: '2999-01-01', symptoms: [{ name: 'Cramps', severity: 4 }] },
    { date: '2025-03-08', symptoms: [{ name: 'Cramps', severity: 4 }, { name: ' cramps ', severity: 5 }] },
    { date: '2025-03-08', symptoms: [{ name: 'Cramps', severity: 11 }] },
    { date: '2025-03-08', symptoms: [], mood: 'unknown' },
    { date: '2025-03-08', symptoms: [] },
  ]) {
    assert.throws(() => normalizeSymptomInput(input), SymptomError);
  }
});

test('validates and bounds symptom history filters', () => {
  assert.deepEqual(parseListFilters({ page: '2', limit: '1000' }), {
    query: {},
    page: 2,
    limit: 100,
  });
  assert.throws(() => parseListFilters({ from: 'not-a-date' }), SymptomError);
  assert.throws(() => parseListFilters({ from: '2025-03-09', to: '2025-03-08' }), SymptomError);
});

test('scopes symptom lookups to the requester and hides records owned by someone else', async () => {
  const originalFindOne = Symptom.findOne;
  const ownerId = '507f1f77bcf86cd799439011';
  const entryId = '507f1f77bcf86cd799439012';
  let query;
  Symptom.findOne = async (value) => {
    query = value;
    return null;
  };

  try {
    await assert.rejects(
      findOwnedEntry({ _id: ownerId }, entryId),
      (error) => error instanceof SymptomError && error.statusCode === 404,
    );
    assert.deepEqual(query, { _id: entryId, userId: ownerId });
  } finally {
    Symptom.findOne = originalFindOne;
  }
});
