import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getDailySymptomNotification,
  getDueReminderNotifications,
  isReminderCategoryEnabled,
} from './reminderNotifications.js';

test('finds enabled reminders that became due while the app was open', () => {
  const now = new Date('2026-11-13T10:00:30.000Z');
  const due = getDueReminderNotifications([
    {
      _id: 'one',
      title: 'Take a break',
      message: 'A short note',
      scheduledAt: '2026-11-13T10:00:00.000Z',
      enabled: true,
      status: 'scheduled',
    },
    {
      _id: 'paused',
      title: 'Paused reminder',
      scheduledAt: '2026-11-13T10:00:00.000Z',
      enabled: false,
      status: 'scheduled',
    },
    {
      _id: 'old',
      title: 'Old reminder',
      scheduledAt: '2026-11-13T09:00:00.000Z',
      enabled: true,
      status: 'scheduled',
    },
  ], now);

  assert.deepEqual(due, [{
    id: 'reminder:one:1794564000000',
    title: 'Take a break',
    body: 'A short note',
  }]);
});

test('provides a default message when a due reminder has no note', () => {
  const due = getDueReminderNotifications([{
    _id: 'one',
    title: 'Check in',
    scheduledAt: '2026-11-13T10:00:00.000Z',
    enabled: true,
    status: 'scheduled',
  }], new Date('2026-11-13T10:00:00.000Z'));

  assert.equal(due[0].body, 'You have a FlowCare reminder.');
});

test('creates the daily symptom notification only at its configured local time', () => {
  const preferences = {
    enabled: true,
    symptomReminders: true,
    reminderTime: '09:15',
  };
  const now = new Date(2026, 10, 13, 9, 15);

  assert.equal(getDailySymptomNotification(now, preferences).id, 'daily-symptom:2026-11-13');
  assert.equal(
    getDailySymptomNotification(new Date(2026, 10, 13, 9, 16), preferences),
    null,
  );
  assert.equal(
    getDailySymptomNotification(now, { ...preferences, symptomReminders: false }),
    null,
  );
});

test('respects period and symptom notification categories for scheduled reminders', () => {
  assert.equal(isReminderCategoryEnabled({ type: 'period' }, { periodReminders: true }), true);
  assert.equal(isReminderCategoryEnabled({ type: 'period-preparation' }, { periodReminders: false }), false);
  assert.equal(isReminderCategoryEnabled({ type: 'symptom' }, { symptomReminders: false }), false);
  assert.equal(isReminderCategoryEnabled({ type: 'custom' }, {}), true);
});
