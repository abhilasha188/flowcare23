import { useEffect, useRef, useState } from 'react';
import { getApiErrorMessage } from '../services/api';
import { getReminders } from '../services/reminderService';
import {
  getDailySymptomNotification,
  getDueReminderNotifications,
  isReminderCategoryEnabled,
} from '../utils/reminderNotifications';

const EMPTY_PREFERENCES = Object.freeze({});
const EMPTY_REMINDERS = Object.freeze([]);
const REMINDER_REFRESH_INTERVAL = 30000;
const NOTIFICATION_CHECK_INTERVAL = 5000;

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

function readNotifications(userKey) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(`flowcare:notifications:${userKey}`) || '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter((item) => (
      item
      && typeof item.id === 'string'
      && typeof item.title === 'string'
      && typeof item.body === 'string'
      && typeof item.createdAt === 'string'
      && !Number.isNaN(Date.parse(item.createdAt))
      && typeof item.read === 'boolean'
    )).slice(-30);
  } catch {
    // Start with an empty in-app inbox when storage is unavailable or malformed.
    return [];
  }
}

function useReminderNotifications(user) {
  const userKey = String(user?._id || user?.id || user?.email || '');
  const preferences = user?.notificationPreferences || EMPTY_PREFERENCES;
  const delivered = useRef(new Set());
  const [reminderState, setReminderState] = useState({ userKey: '', reminders: [] });
  const [notificationState, setNotificationState] = useState(() => ({
    userKey,
    notifications: userKey ? readNotifications(userKey) : [],
  }));
  const [browserNotificationError, setBrowserNotificationError] = useState('');
  const [syncError, setSyncError] = useState('');
  const reminders = reminderState.userKey === userKey ? reminderState.reminders : EMPTY_REMINDERS;
  const notifications = notificationState.userKey === userKey ? notificationState.notifications : [];
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    if (!userKey || notificationState.userKey !== userKey) return;
    try {
      window.localStorage.setItem(
        `flowcare:notifications:${userKey}`,
        JSON.stringify(notificationState.notifications),
      );
    } catch {
      // The inbox still works in memory when browser storage is unavailable.
    }
  }, [notificationState, userKey]);

  useEffect(() => {
    if (!userKey) {
      return undefined;
    }
    let active = true;

    async function refreshReminders() {
      try {
        const items = await getReminders();
        if (active) {
          setReminderState({ userKey, reminders: items });
          setSyncError('');
        }
      } catch (error) {
        if (active) setSyncError(getApiErrorMessage(error, 'Could not check scheduled reminders.'));
      }
    }

    refreshReminders();
    const intervalId = window.setInterval(refreshReminders, REMINDER_REFRESH_INTERVAL);
    window.addEventListener('flowcare:reminders-changed', refreshReminders);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('flowcare:reminders-changed', refreshReminders);
    };
  }, [userKey]);

  useEffect(() => {
    if (!userKey || !preferences.enabled) return undefined;

    function checkReminders() {
      const now = new Date();
      const eligibleReminders = reminders.filter((reminder) => (
        isReminderCategoryEnabled(reminder, preferences)
      ));
      const dueReminders = getDueReminderNotifications(eligibleReminders, now);
      const dailyNotification = getDailySymptomNotification(now, preferences);
      const due = dailyNotification ? [...dueReminders, dailyNotification] : dueReminders;

      for (const item of due) {
        const key = `flowcare:notification:${userKey}:${item.id}`;
        if (wasDelivered(key, delivered.current)) continue;

        const notification = {
          ...item,
          createdAt: now.toISOString(),
          read: false,
        };
        setNotificationState((current) => {
          if (current.userKey !== userKey || current.notifications.some(({ id }) => id === item.id)) {
            return current;
          }
          return {
            userKey,
            notifications: [...current.notifications, notification].slice(-30),
          };
        });

        if (
          preferences.browserNotifications
          && 'Notification' in window
          && window.Notification.permission === 'granted'
        ) {
          try {
            new window.Notification(item.title, { body: item.body, tag: item.id });
            setBrowserNotificationError('');
          } catch {
            setBrowserNotificationError('A browser alert could not be shown; the reminder is available in the bell.');
          }
        }
      }
    }

    checkReminders();
    const intervalId = window.setInterval(checkReminders, NOTIFICATION_CHECK_INTERVAL);
    return () => window.clearInterval(intervalId);
  }, [userKey, preferences, reminders]);

  function markAllRead() {
    setNotificationState((current) => {
      if (current.userKey !== userKey) return current;
      return {
        ...current,
        notifications: current.notifications.map((notification) => ({ ...notification, read: true })),
      };
    });
  }

  return {
    notifications,
    unreadCount,
    syncError: syncError || browserNotificationError,
    markAllRead,
  };
}

export default useReminderNotifications;
