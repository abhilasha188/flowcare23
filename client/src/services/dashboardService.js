import api from './api';

export async function getDashboardOverview() {
  const { data } = await api.get('/analytics/overview');
  return data.overview;
}
