const DAY_MS = 86400000;

function toDateOnly(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value !== 'string') return null;
  const dateOnly = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : null;
}

function dateOnlyToUtc(value) {
  if (typeof value === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const dateOnly = toDateOnly(value);
  if (!dateOnly) return null;
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateOnly ? null : date;
}

function addDays(value, days) {
  const date = dateOnlyToUtc(value);
  if (!date || !Number.isInteger(days)) return null;
  return new Date(date.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

function differenceInCalendarDays(fromDate, toDate) {
  const from = dateOnlyToUtc(fromDate);
  const to = dateOnlyToUtc(toDate);
  if (!from || !to) return null;
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

function calculateCycleLength(previousStartDate, currentStartDate) {
  const length = differenceInCalendarDays(previousStartDate, currentStartDate);
  return length > 0 ? length : null;
}

function calculateAverageCycleLength(cycles) {
  if (!Array.isArray(cycles) || cycles.length < 2) return null;
  const ordered = normalizeCycleHistory(cycles);
  const lengths = [];

  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index - 1].endDate && ordered[index - 1].endDate >= ordered[index].startDate) continue;
    const length = calculateCycleLength(ordered[index - 1].startDate, ordered[index].startDate);
    if (length >= 15 && length <= 60) lengths.push(length);
  }

  const recentLengths = lengths.slice(-6);
  if (!recentLengths.length) return null;
  return Math.round(recentLengths.reduce((total, value) => total + value, 0) / recentLengths.length);
}

function calculateAveragePeriodDuration(cycles) {
  if (!Array.isArray(cycles)) return null;
  const ordered = normalizeCycleHistory(cycles);
  const durations = ordered
    .map((cycle, index) => {
      const nextCycle = ordered[index + 1];
      if (!cycle.endDate || (nextCycle && cycle.endDate >= nextCycle.startDate)) return null;
      return differenceInCalendarDays(cycle.startDate, cycle.endDate) + 1;
    })
    .filter((duration) => Number.isInteger(duration) && duration >= 1 && duration <= 15)
    .slice(-6);

  if (!durations.length) return null;
  return Math.round(durations.reduce((total, value) => total + value, 0) / durations.length);
}

function normalizeCycleHistory(cycles) {
  const seen = new Set();
  return cycles
    .map((cycle) => {
      const startDate = dateOnlyToUtc(cycle.startDate);
      const endDate = cycle.endDate ? dateOnlyToUtc(cycle.endDate) : null;
      if (!startDate || (cycle.endDate && (!endDate || endDate < startDate))) return null;
      const key = toDateOnly(startDate);
      if (seen.has(key)) return null;
      seen.add(key);
      return { ...cycle, startDate, endDate };
    })
    .filter(Boolean)
    .sort((a, b) => a.startDate - b.startDate);
}

function assessCycleRegularity(cycles) {
  const ordered = normalizeCycleHistory(cycles);
  const lengths = [];
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index - 1].endDate && ordered[index - 1].endDate >= ordered[index].startDate) continue;
    const length = calculateCycleLength(ordered[index - 1].startDate, ordered[index].startDate);
    if (length >= 15 && length <= 60) lengths.push(length);
  }

  if (lengths.length < 2) {
    return {
      validIntervalCount: lengths.length,
      standardDeviation: null,
      label: 'Limited data',
    };
  }

  const average = lengths.reduce((total, value) => total + value, 0) / lengths.length;
  const variance = lengths.reduce((total, value) => total + ((value - average) ** 2), 0) / lengths.length;
  const standardDeviation = Math.round(Math.sqrt(variance) * 10) / 10;

  return {
    validIntervalCount: lengths.length,
    standardDeviation,
    label: lengths.length >= 4 && standardDeviation <= 3
      ? 'More consistent historical pattern'
      : standardDeviation <= 7
        ? 'Moderate historical consistency'
        : 'Limited data',
  };
}

function predictNextPeriod(lastPeriodStartDate, averageCycleLength) {
  if (!lastPeriodStartDate || !Number.isInteger(averageCycleLength) || averageCycleLength < 15 || averageCycleLength > 60) {
    return null;
  }
  return addDays(lastPeriodStartDate, averageCycleLength);
}

function estimateOvulationDate(predictedNextPeriodDate) {
  return predictedNextPeriodDate ? addDays(predictedNextPeriodDate, -14) : null;
}

function estimateFertileWindow(ovulationDate) {
  if (!ovulationDate) return null;
  return {
    startDate: addDays(ovulationDate, -5),
    endDate: addDays(ovulationDate, 1),
  };
}

function determineCurrentCycleDay(lastPeriodStartDate, today = new Date()) {
  if (!lastPeriodStartDate) return null;
  const todayDate = toDateOnly(today);
  const difference = differenceInCalendarDays(lastPeriodStartDate, todayDate);
  return difference == null || difference < 0 ? null : difference + 1;
}

function determineCyclePhase({
  today = new Date(),
  lastPeriodStartDate,
  lastPeriodEndDate = null,
  averagePeriodDuration,
  ovulationDate,
  fertileWindow,
  predictedNextPeriodDate,
}) {
  const todayDate = toDateOnly(today);
  const startDate = toDateOnly(lastPeriodStartDate);
  if (!todayDate || !startDate || todayDate < startDate) return 'unknown';

  const actualEndDate = toDateOnly(lastPeriodEndDate);
  const cycleDay = determineCurrentCycleDay(startDate, todayDate);
  if (actualEndDate && todayDate <= actualEndDate) return 'menstrual';
  if (!actualEndDate && Number.isInteger(averagePeriodDuration) && cycleDay <= averagePeriodDuration) {
    return 'menstrual';
  }

  if (!predictedNextPeriodDate || todayDate >= predictedNextPeriodDate || !ovulationDate || !fertileWindow) {
    return 'unknown';
  }
  if (todayDate < fertileWindow.startDate) return 'follicular';
  if (todayDate === ovulationDate) return 'ovulation';
  if (todayDate <= fertileWindow.endDate) return 'ovulation_window';
  return 'luteal';
}

function serializeCycle(cycle, cycleLength = null) {
  return {
    _id: cycle._id.toString(),
    startDate: toDateOnly(cycle.startDate),
    endDate: cycle.endDate ? toDateOnly(cycle.endDate) : null,
    flowIntensity: cycle.flowIntensity || null,
    notes: cycle.notes || '',
    cycleLength,
    createdAt: cycle.createdAt,
    updatedAt: cycle.updatedAt,
  };
}

function calculateCycleOverview(cycles, user, today = new Date()) {
  const ordered = normalizeCycleHistory(cycles);
  const lastPeriod = ordered.at(-1) || null;
  const historicalCycleLength = calculateAverageCycleLength(ordered);
  const profileCycleLength = Number.isInteger(user.averageCycleLength) ? user.averageCycleLength : null;
  const averageCycleLength = historicalCycleLength || profileCycleLength;
  const historicalPeriodDuration = calculateAveragePeriodDuration(ordered);
  const profilePeriodDuration = Number.isInteger(user.averagePeriodDuration) ? user.averagePeriodDuration : null;
  const averagePeriodDuration = historicalPeriodDuration || profilePeriodDuration;
  const regularity = assessCycleRegularity(ordered);
  const predictedNextPeriodDate = lastPeriod
    ? predictNextPeriod(lastPeriod.startDate, averageCycleLength)
    : null;
  const calculatedOvulationDate = estimateOvulationDate(predictedNextPeriodDate);
  const calculatedFertileWindow = estimateFertileWindow(calculatedOvulationDate);
  const preferences = user.predictionPreferences || {};
  const ovulationDate = preferences.showFertileWindow === false ? null : calculatedOvulationDate;
  const fertileWindow = preferences.showFertileWindow === false ? null : calculatedFertileWindow;

  return {
    todayDate: toDateOnly(today),
    currentCycleDay: lastPeriod ? determineCurrentCycleDay(lastPeriod.startDate, today) : null,
    currentPhase: lastPeriod && preferences.showPhaseEstimate !== false
      ? determineCyclePhase({
        today,
        lastPeriodStartDate: lastPeriod.startDate,
        lastPeriodEndDate: lastPeriod.endDate,
        averagePeriodDuration,
        ovulationDate: calculatedOvulationDate,
        fertileWindow: calculatedFertileWindow,
        predictedNextPeriodDate,
      })
      : 'unknown',
    averageCycleLength,
    cycleLengthSource: historicalCycleLength ? 'history' : profileCycleLength ? 'profile' : null,
    averagePeriodDuration,
    periodDurationSource: historicalPeriodDuration ? 'history' : profilePeriodDuration ? 'profile' : null,
    totalCyclesRecorded: ordered.length,
    lastPeriodStartDate: lastPeriod ? toDateOnly(lastPeriod.startDate) : null,
    lastPeriodEndDate: lastPeriod?.endDate ? toDateOnly(lastPeriod.endDate) : null,
    predictedNextPeriodDate,
    daysUntilNextPeriod: predictedNextPeriodDate
      ? differenceInCalendarDays(toDateOnly(today), predictedNextPeriodDate)
      : null,
    ovulationDate,
    fertileWindow,
    predictionSource: historicalCycleLength ? 'historical_cycles' : profileCycleLength ? 'profile_estimate' : null,
    isPrediction: Boolean(predictedNextPeriodDate),
    predictionConfidence: regularity,
    incompletePeriodCount: ordered.filter((cycle) => !cycle.endDate).length,
    predictionPreferences: {
      showPhaseEstimate: preferences.showPhaseEstimate !== false,
      showFertileWindow: preferences.showFertileWindow !== false,
    },
  };
}

function addCycleLengths(cycles) {
  const ordered = normalizeCycleHistory(cycles);

  return ordered.map((cycle, index) => {
    const cycleLength = index > 0
      ? calculateCycleLength(ordered[index - 1].startDate, cycle.startDate)
      : null;
    return serializeCycle(cycle, cycleLength);
  });
}

module.exports = {
  addCycleLengths,
  assessCycleRegularity,
  calculateAverageCycleLength,
  calculateAveragePeriodDuration,
  calculateCycleLength,
  calculateCycleOverview,
  dateOnlyToUtc,
  determineCurrentCycleDay,
  determineCyclePhase,
  estimateFertileWindow,
  estimateOvulationDate,
  normalizeCycleHistory,
  predictNextPeriod,
  serializeCycle,
  toDateOnly,
};
