const Cycle = require('../models/Cycle');
const Reminder = require('../models/Reminder');
const Symptom = require('../models/Symptom');
const {
  addCycleLengths,
  calculateAverageCycleLength,
  calculateAveragePeriodDuration,
  calculateCycleOverview,
  determineCyclePhase,
  estimateFertileWindow,
  estimateOvulationDate,
  predictNextPeriod,
  toDateOnly,
} = require('./predictionService');

const RANGE_DAYS = { '30d': 30, '90d': 90 };
const RANGE_MONTHS = { '6m': 6, '12m': 12 };

function resolveDateRange(range = '90d', now = new Date()) {
  if (range === 'all') return { from: null, to: null };
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  if (RANGE_DAYS[range]) {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    from.setUTCDate(from.getUTCDate() - RANGE_DAYS[range] + 1);
    return { from, to };
  }
  if (RANGE_MONTHS[range]) {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    from.setUTCMonth(from.getUTCMonth() - RANGE_MONTHS[range] + 1);
    return { from, to };
  }
  throw Object.assign(new Error('Choose a valid date range.'), { statusCode: 400 });
}

function dateMatch(field, range) {
  const match = {};
  if (range.from || range.to) {
    match[field] = {};
    if (range.from) match[field].$gte = range.from;
    if (range.to) match[field].$lte = range.to;
  }
  return match;
}

function getUserId(user) {
  return user._id || user.id;
}

function rounded(value, digits = 1) {
  if (!Number.isFinite(value)) return null;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

async function getSymptomSummary(userId, range = { from: null, to: null }) {
  const [result = {}] = await Symptom.aggregate([
    { $match: { userId, ...dateMatch('date', range) } },
    {
      $facet: {
        days: [
          { $project: { symptomCount: { $size: { $ifNull: ['$symptoms', []] } } } },
          { $group: { _id: null, days: { $sum: 1 }, averageSymptomsPerDay: { $avg: '$symptomCount' } } },
        ],
        symptoms: [
          { $unwind: '$symptoms' },
          { $group: { _id: '$symptoms.name', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $limit: 10 },
        ],
        moods: [
          { $match: { mood: { $type: 'string', $ne: '' } } },
          { $group: { _id: '$mood', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $limit: 10 },
        ],
      },
    },
  ]);
  const days = result.days?.[0] || { days: 0, averageSymptomsPerDay: null };
  return {
    recordedDays: days.days,
    averageSymptomsPerDay: rounded(days.averageSymptomsPerDay),
    symptomFrequency: result.symptoms || [],
    moodFrequency: result.moods || [],
  };
}

async function getOverview(user, today = new Date()) {
  const userId = getUserId(user);
  const [cycleCount, cycles, symptomSummary, recentSymptoms, upcomingReminders] = await Promise.all([
    Cycle.countDocuments({ userId }),
    Cycle.find({ userId }).sort({ startDate: -1 }).limit(120).lean(),
    getSymptomSummary(userId),
    Symptom.find({ userId }).sort({ date: -1 }).limit(5).lean(),
    Reminder.find({ userId, enabled: true, status: 'scheduled', scheduledAt: { $gte: new Date() } })
      .sort({ scheduledAt: 1 })
      .limit(5)
      .lean(),
  ]);
  cycles.reverse();
  const overview = calculateCycleOverview(cycles, user, today);
  return {
    ...overview,
    totalCyclesRecorded: cycleCount,
    recentCycles: addCycleLengths(cycles).slice(-5).reverse(),
    averageSymptomsPerRecordedDay: symptomSummary.averageSymptomsPerDay,
    mostFrequentSymptom: symptomSummary.symptomFrequency[0]?._id || null,
    mostFrequentMood: symptomSummary.moodFrequency[0]?._id || null,
    totalSymptomDays: symptomSummary.recordedDays,
    recentSymptoms: recentSymptoms.map((entry) => ({ ...entry, date: toDateOnly(entry.date) })),
    upcomingReminders,
  };
}

async function getCycleAnalytics(user, rangeInput = '90d', now = new Date()) {
  const range = resolveDateRange(rangeInput, now);
  const query = { userId: getUserId(user) };
  if (range.from) {
    const historyFrom = new Date(range.from);
    historyFrom.setUTCDate(historyFrom.getUTCDate() - 60);
    query.startDate = { $gte: historyFrom, $lte: range.to };
  } else if (range.to) {
    query.startDate = { $lte: range.to };
  }
  const records = await Cycle.find(query).sort({ startDate: -1 }).limit(120).lean();
  records.reverse();
  const withLengths = addCycleLengths(records).filter((cycle) => (
    (!range.from || cycle.startDate >= toDateOnly(range.from))
    && (!range.to || cycle.startDate <= toDateOnly(range.to))
  ));
  const cycleLengths = withLengths
    .filter((cycle) => cycle.cycleLength != null)
    .map((cycle) => ({ date: cycle.startDate, value: cycle.cycleLength }));
  const periodDurations = withLengths
    .filter((cycle) => cycle.endDate)
    .map((cycle) => {
      const start = new Date(`${cycle.startDate}T00:00:00.000Z`);
      const end = new Date(`${cycle.endDate}T00:00:00.000Z`);
      const value = Math.round((end - start) / 86400000) + 1;
      return value >= 1 && value <= 15 ? { date: cycle.startDate, value } : null;
    })
    .filter(Boolean);

  return {
    cycleLengths,
    periodDurations,
    variation: cycleLengths.map((point, index) => ({
      ...point,
      differenceFromPrevious: index ? point.value - cycleLengths[index - 1].value : null,
    })),
    averageCycleLength: calculateAverageCycleLength(records),
    averagePeriodDuration: calculateAveragePeriodDuration(records),
    totalCyclesRecorded: await Cycle.countDocuments({ userId: getUserId(user), ...dateMatch('startDate', range) }),
  };
}

async function getSymptomAnalytics(user, rangeInput = '90d', now = new Date()) {
  const range = resolveDateRange(rangeInput, now);
  const [result = {}] = await Symptom.aggregate([
    { $match: { userId: getUserId(user), ...dateMatch('date', range) } },
    {
      $facet: {
        frequency: [
          { $unwind: '$symptoms' },
          {
            $group: {
              _id: '$symptoms.name',
              count: { $sum: 1 },
              averageSeverity: { $avg: '$symptoms.severity' },
            },
          },
          { $sort: { count: -1, _id: 1 } },
          { $limit: 20 },
        ],
        severityTrends: [
          { $unwind: '$symptoms' },
          {
            $group: {
              _id: {
                date: { $dateToString: { date: '$date', format: '%Y-%m-%d', timezone: 'UTC' } },
                name: '$symptoms.name',
              },
              averageSeverity: { $avg: '$symptoms.severity' },
            },
          },
          { $sort: { '_id.date': 1, '_id.name': 1 } },
          { $limit: 500 },
        ],
        monthlyDistribution: [
          { $unwind: '$symptoms' },
          {
            $group: {
              _id: { $dateToString: { date: '$date', format: '%Y-%m', timezone: 'UTC' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $limit: 60 },
        ],
        wellnessTrends: [
          {
            $group: {
              _id: { $dateToString: { date: '$date', format: '%Y-%m-%d', timezone: 'UTC' } },
              energyLevel: { $avg: '$energyLevel' },
              sleepQuality: { $avg: '$sleepQuality' },
            },
          },
          { $sort: { _id: 1 } },
          { $limit: 500 },
        ],
        moodDistribution: [
          { $match: { mood: { $type: 'string', $ne: '' } } },
          { $group: { _id: '$mood', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
        ],
      },
    },
  ]);
  return {
    symptomFrequency: result.frequency || [],
    severityTrends: (result.severityTrends || []).map((item) => ({
      date: item._id.date,
      name: item._id.name,
      averageSeverity: rounded(item.averageSeverity),
    })),
    monthlyDistribution: (result.monthlyDistribution || []).map((item) => ({ month: item._id, count: item.count })),
    wellnessTrends: (result.wellnessTrends || []).map((item) => ({
      date: item._id,
      energyLevel: rounded(item.energyLevel),
      sleepQuality: rounded(item.sleepQuality),
    })),
    moodDistribution: result.moodDistribution || [],
  };
}

async function getMoodAnalytics(user, rangeInput = '90d', now = new Date()) {
  const range = resolveDateRange(rangeInput, now);
  const [result = {}] = await Symptom.aggregate([
    { $match: { userId: getUserId(user), mood: { $type: 'string', $ne: '' }, ...dateMatch('date', range) } },
    {
      $facet: {
        distribution: [
          { $group: { _id: '$mood', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
        ],
        monthly: [
          {
            $group: {
              _id: {
                month: { $dateToString: { date: '$date', format: '%Y-%m', timezone: 'UTC' } },
                mood: '$mood',
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.month': 1, '_id.mood': 1 } },
          { $limit: 500 },
        ],
      },
    },
  ]);
  return {
    distribution: result.distribution || [],
    monthlyTrends: (result.monthly || []).map((item) => ({
      month: item._id.month,
      mood: item._id.mood,
      count: item.count,
    })),
  };
}

async function getPatternAnalytics(user, rangeInput = '12m', now = new Date()) {
  const range = resolveDateRange(rangeInput, now);
  const userId = getUserId(user);
  const [cycles, entries] = await Promise.all([
    Cycle.find({ userId, startDate: { $lte: range.to || now } })
      .sort({ startDate: -1 })
      .limit(120)
      .lean(),
    Symptom.find({ userId, ...dateMatch('date', range) })
      .sort({ date: -1 })
      .limit(2000)
      .lean(),
  ]);

  const sortedCycles = [...cycles].reverse();
  const averageCycleLength = calculateAverageCycleLength(sortedCycles) || user.averageCycleLength;
  const averagePeriodDuration = calculateAveragePeriodDuration(sortedCycles) || user.averagePeriodDuration;
  const grouped = new Map();
  for (const entry of entries) {
    const date = toDateOnly(entry.date);
    const priorIndex = sortedCycles.findLastIndex((cycle) => toDateOnly(cycle.startDate) <= date);
    if (priorIndex < 0) continue;
    const cycle = sortedCycles[priorIndex];
    const nextCycle = sortedCycles[priorIndex + 1];
    const nextDate = nextCycle
      ? toDateOnly(nextCycle.startDate)
      : predictNextPeriod(toDateOnly(cycle.startDate), averageCycleLength);
    const ovulationDate = estimateOvulationDate(nextDate);
    const fertileWindow = estimateFertileWindow(ovulationDate);
    const phase = determineCyclePhase({
      today: date,
      lastPeriodStartDate: cycle.startDate,
      lastPeriodEndDate: cycle.endDate,
      averagePeriodDuration,
      predictedNextPeriodDate: nextDate,
      ovulationDate,
      fertileWindow,
    });
    if (phase === 'unknown') continue;
    if (!grouped.has(phase)) grouped.set(phase, { entries: 0, symptoms: new Map(), moods: new Map() });
    const group = grouped.get(phase);
    group.entries += 1;
    for (const symptom of entry.symptoms || []) {
      group.symptoms.set(symptom.name, (group.symptoms.get(symptom.name) || 0) + 1);
    }
    if (entry.mood) group.moods.set(entry.mood, (group.moods.get(entry.mood) || 0) + 1);
  }

  const observations = [...grouped.entries()]
    .filter(([, value]) => value.entries >= 3)
    .map(([phase, value]) => ({
      phase,
      recordedDays: value.entries,
      commonSymptoms: [...value.symptoms.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count })),
      commonMoods: [...value.moods.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count })),
    }));

  return {
    observations,
    message: observations.length
      ? 'These are descriptive patterns in your own logs, not evidence that cycle phase caused a symptom or mood.'
      : 'Add cycle history and at least three logged days in an estimated phase to see personal observations.',
  };
}

module.exports = {
  getCycleAnalytics,
  getMoodAnalytics,
  getOverview,
  getPatternAnalytics,
  getSymptomAnalytics,
  getSymptomSummary,
  resolveDateRange,
};
