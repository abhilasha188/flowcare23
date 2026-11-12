import api from './api';

export async function getCycles() {
  const { data } = await api.get('/cycles');
  return data.cycles;
}

export async function getCycle(id) {
  const { data } = await api.get(`/cycles/${id}`);
  return data.cycle;
}

export async function createCycle(values) {
  const { data } = await api.post('/cycles', values);
  return data;
}

export async function updateCycle(id, values) {
  const { data } = await api.put(`/cycles/${id}`, values);
  return data;
}

export async function deleteCycle(id) {
  const { data } = await api.delete(`/cycles/${id}`);
  return data;
}

export async function getPredictions() {
  const { data } = await api.get('/predictions');
  return data.predictions;
}
