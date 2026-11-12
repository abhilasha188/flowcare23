import api from './api';

export async function getReminders() {
  const { data } = await api.get('/reminders');
  return data.reminders;
}

export async function createReminder(reminder) {
  const { data } = await api.post('/reminders', reminder);
  return data.reminder;
}

export async function updateReminder(id, reminder) {
  const { data } = await api.put(`/reminders/${id}`, reminder);
  return data.reminder;
}

export async function patchReminder(id, reminder) {
  const { data } = await api.patch(`/reminders/${id}`, reminder);
  return data.reminder;
}

export async function deleteReminder(id) {
  const { data } = await api.delete(`/reminders/${id}`);
  return data;
}
