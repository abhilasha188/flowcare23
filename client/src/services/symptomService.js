import api from './api';

export async function getSymptoms(params = {}) {
  const { data } = await api.get('/symptoms', { params });
  return data;
}

export async function saveSymptom(entry) {
  const { data } = await api.post('/symptoms', entry);
  return data;
}

export async function updateSymptom(id, entry) {
  const { data } = await api.put(`/symptoms/${id}`, entry);
  return data;
}

export async function deleteSymptom(id) {
  const { data } = await api.delete(`/symptoms/${id}`);
  return data;
}
