const assert = require('node:assert/strict');
const test = require('node:test');
const {
  calculateAverageCycleLength,
  calculateAveragePeriodDuration,
  calculateCycleLength,
  calculateCycleOverview,
  assessCycleRegularity,
  determineCurrentCycleDay,
  determineCyclePhase,
  estimateFertileWindow,
  estimateOvulationDate,
  predictNextPeriod,
} = require('./predictionService');

test('calculates cycle lengths as date-only day differences across month and year boundaries', () => {
  assert.equal(calculateCycleLength('2024-12-20', '2025-01-17'), 28);
  assert.equal(calculateCycleLength('2024-02-01', '2024-03-01'), 29);
  assert.equal(calculateCycleLength('2025-03-01', '2025-02-28'), null);
});

test('averages only valid recent cycle intervals without assuming a 28-day cycle', () => {
  const cycles = [
    { startDate: '2024-01-01' },
    { startDate: '2024-01-26' },
    { startDate: '2024-02-20' },
    { startDate: '2024-05-30' },
  ];
  assert.equal(calculateAverageCycleLength(cycles), 25);
  assert.equal(calculateAverageCycleLength([{ startDate: '2025-01-01' }]), null);
});

test('averages completed period durations and ignores ongoing or implausible records', () => {
  const cycles = [
    { startDate: '2025-01-01', endDate: '2025-01-05' },
    { startDate: '2025-02-01', endDate: '2025-02-06' },
    { startDate: '2025-03-01', endDate: null },
    { startDate: '2025-04-01', endDate: '2025-04-20' },
  ];
  assert.equal(calculateAveragePeriodDuration(cycles), 6);
});

test('predicts period, ovulation, and fertile window with leap-day-safe arithmetic', () => {
  assert.equal(predictNextPeriod('2024-02-01', 28), '2024-02-29');
  assert.equal(estimateOvulationDate('2024-03-14'), '2024-02-29');
  assert.deepEqual(estimateFertileWindow('2024-02-29'), {
    startDate: '2024-02-24',
    endDate: '2024-03-01',
  });
  assert.equal(predictNextPeriod('2025-01-01', 14), null);
});

test('determines current day and estimated cycle phases from available information', () => {
  assert.equal(determineCurrentCycleDay('2025-01-01', '2025-01-01'), 1);
  assert.equal(determineCurrentCycleDay('2025-01-01', '2025-01-07'), 7);
  assert.equal(determineCurrentCycleDay('2025-01-01', '2024-12-31'), null);
  assert.equal(determineCyclePhase({
    today: '2025-01-03',
    lastPeriodStartDate: '2025-01-01',
    averagePeriodDuration: 5,
    predictedNextPeriodDate: '2025-01-29',
    ovulationDate: '2025-01-15',
    fertileWindow: { startDate: '2025-01-10', endDate: '2025-01-16' },
  }), 'menstrual');
  assert.equal(determineCyclePhase({
    today: '2025-01-12',
    lastPeriodStartDate: '2025-01-01',
    lastPeriodEndDate: '2025-01-05',
    averagePeriodDuration: 5,
    predictedNextPeriodDate: '2025-01-29',
    ovulationDate: '2025-01-15',
    fertileWindow: { startDate: '2025-01-10', endDate: '2025-01-16' },
  }), 'ovulation_window');
  assert.equal(determineCyclePhase({
    today: '2025-01-12',
    lastPeriodStartDate: '2025-01-01',
    lastPeriodEndDate: '2025-01-05',
  }), 'unknown');
});

test('returns insufficient prediction data instead of inventing cycle estimates', () => {
  const overview = calculateCycleOverview([], { averageCycleLength: undefined, averagePeriodDuration: undefined }, '2025-05-01');
  assert.equal(overview.currentPhase, 'unknown');
  assert.equal(overview.predictedNextPeriodDate, null);
  assert.equal(overview.daysUntilNextPeriod, null);
  assert.equal(overview.totalCyclesRecorded, 0);
});

test('uses optional profile averages only as explicitly sourced estimates', () => {
  const overview = calculateCycleOverview(
    [{ startDate: '2025-04-01', endDate: null }],
    { averageCycleLength: 31, averagePeriodDuration: 5 },
    '2025-04-10',
  );
  assert.equal(overview.predictedNextPeriodDate, '2025-05-02');
  assert.equal(overview.predictionSource, 'profile_estimate');
  assert.equal(overview.currentCycleDay, 10);
});

test('assesses historical consistency from valid non-overlapping intervals', () => {
  const cycles = [
    { startDate: '2025-01-01', endDate: '2025-01-04' },
    { startDate: '2025-01-29', endDate: '2025-02-01' },
    { startDate: '2025-02-26', endDate: '2025-03-01' },
    { startDate: '2025-03-26', endDate: '2025-03-29' },
    { startDate: '2025-04-23', endDate: null },
    { startDate: '2025-04-23', endDate: '2025-04-27' },
  ];

  assert.deepEqual(assessCycleRegularity(cycles), {
    validIntervalCount: 4,
    standardDeviation: 0,
    label: 'More consistent historical pattern',
  });
  assert.equal(calculateAverageCycleLength(cycles), 28);
});

test('does not classify an open-ended period as menstrual indefinitely', () => {
  assert.equal(determineCyclePhase({
    today: '2025-01-12',
    lastPeriodStartDate: '2025-01-01',
    averagePeriodDuration: 5,
    predictedNextPeriodDate: '2025-01-29',
    ovulationDate: '2025-01-15',
    fertileWindow: { startDate: '2025-01-10', endDate: '2025-01-16' },
  }), 'ovulation_window');
  assert.equal(determineCyclePhase({
    today: '2025-01-12',
    lastPeriodStartDate: '2025-01-01',
  }), 'unknown');
});

test('keeps date-only prediction arithmetic stable across timezone offsets and year boundaries', () => {
  assert.equal(calculateCycleLength(
    new Date('2024-12-20T00:00:00-08:00'),
    new Date('2025-01-17T00:00:00Z'),
  ), 28);
  assert.equal(predictNextPeriod('2025-12-20', 28), '2026-01-17');
});

test('excludes overlapping historical periods from duration estimates', () => {
  const cycles = [
    { startDate: '2025-01-01', endDate: '2025-01-05' },
    { startDate: '2025-01-05', endDate: '2025-01-09' },
    { startDate: '2025-02-01', endDate: '2025-02-09' },
  ];
  assert.equal(calculateAveragePeriodDuration(cycles), 7);
});
