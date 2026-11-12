import api from './api';

export async function changePassword(input) {
  const { data } = await api.post('/users/change-password', input);
  return data;
}

export async function deleteHealthData() {
  const { data } = await api.delete('/users/health-data');
  return data;
}

export async function deleteAccount(input) {
  const { data } = await api.delete('/users/account', { data: input });
  return data;
}
