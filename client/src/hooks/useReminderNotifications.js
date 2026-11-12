import { useEffect, useRef } from 'react';

function wasDelivered(key, delivered) {
  if (delivered.has(key)) return true;
  try {
    if (window.localStorage.getItem(key) === '1') {
      delivered.add(key);
      return true;
    }
    window.localStorage.setItem(key, '1');
  } catch {
    // Keep an in-memory guard when browser storage is unavailable.
  }
  delivered.add(key);
  return false;
}

function useReminderNotifications(user, reminders = []) {
  const delivered = useRef(new Set());

  useEffect(() => {
    const preferences = user?.notificationPreferences;
    if (
      !preferences?.enabled
      || !preferences.browserNotifications
      || !('Notification' in window)
      || window.Notification.permission !== 'granted'
    ) return undefined;

    const userKey = user._id || 'account';
    const deliver = (key, title, body) => {
      if (wasDelivered(`flowcare:notification:${userKey}:${key}`, delivered.current)) return;
      new window.Notification(title, { body });
    };

    const check = () => {
      const now = new Date();
      const reminderTypes = new Set(['custom']);
      if (preferences.periodReminders) reminderTypes.add('period');
      if (preferences.symptomReminders) reminderTypes.add('symptom');
      for (const reminder of reminders) {
        const scheduledAt = new Date(reminder.scheduledAt);
        const elapsed = now.getTime() - scheduledAt.getTime();
        if (
          reminder.enabled
          && reminder.status === 'scheduled'
          && reminderTypes.has(reminder.type)
          && elapsed >= 0
          && elapsed < 60000
        ) {
          deliver(`reminder:${reminder._id}`, reminder.title, reminder.message || 'You have a FlowCare reminder.');
        }
      }

      if (preferences.symptomReminders && preferences.reminderTime) {
        const localTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        if (localTime === preferences.reminderTime) {
          const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          deliver(`daily-symptom:${date}`, 'A gentle check-in', 'Take a moment to log a symptom or how you feel, if you wish.');
        }
      }
    };

    check();
    const intervalId = window.setInterval(check, 30000);
    return () => window.clearInterval(intervalId);
  }, [user, reminders]);
}

export default useReminderNotifications;
