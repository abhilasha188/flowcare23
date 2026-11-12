const REMINDER_DELIVERY_WINDOW = 2 * 60 * 1000;

export function isReminderCategoryEnabled(reminder, preferences) {
  if (reminder.type === 'period' || reminder.type === 'period-preparation') {
    return Boolean(preferences.periodReminders);
  }
  if (reminder.type === 'symptom') return Boolean(preferences.symptomReminders);
  return true;
}

export function getDueReminderNotifications(reminders, now = new Date()) {
  const nowMs = now.getTime();
  return reminders.flatMap((reminder) => {
    if (!reminder.enabled || reminder.status !== 'scheduled' || !reminder._id) return [];
    const scheduledAt = Date.parse(reminder.scheduledAt);
    const elapsed = nowMs - scheduledAt;
    if (!Number.isFinite(scheduledAt) || elapsed < 0 || elapsed > REMINDER_DELIVERY_WINDOW) return [];

    return [{
      id: `reminder:${reminder._id}:${scheduledAt}`,
      title: reminder.title,
      body: reminder.message || 'You have a FlowCare reminder.',
    }];
  });
}

export function getDailySymptomNotification(now, preferences) {
  if (!preferences.enabled || !preferences.symptomReminders || !preferences.reminderTime) return null;
  const localTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (localTime !== preferences.reminderTime) return null;

  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return {
    id: `daily-symptom:${date}`,
    title: 'A gentle check-in',
    body: 'Take a moment to log a symptom or how you feel, if you wish.',
  };
}
