import api from './api';

export async function getAnalyticsData(range) {
  const [overview, cycles, symptoms, moods, patterns] = await Promise.all([
    api.get('/analytics/overview'),
    api.get('/analytics/cycles', { params: { range } }),
    api.get('/analytics/symptoms', { params: { range } }),
    api.get('/analytics/moods', { params: { range } }),
    api.get('/analytics/patterns', { params: { range } }),
  ]);
  return {
    overview: overview.data.overview,
    cycles: cycles.data.analytics,
    symptoms: symptoms.data.analytics,
    moods: moods.data.analytics,
    patterns: patterns.data.analytics,
  };
}
