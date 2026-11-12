const assert = require('node:assert/strict');
const test = require('node:test');
const Reminder = require('../models/Reminder');
const { ReminderError, findOwnedReminder, normalizeReminderInput } = require('./reminderService');

test('normalizes reminders with a timezone-aware instant', () => {
  const reminder = normalizeReminderInput({
    type: 'period',
    title: 'Upcoming period',
    message: 'A personal estimate.',
    scheduledAt: '2025-03-08T09:30:00+05:30',
  });
  assert.equal(reminder.scheduledAt.toISOString(), '2025-03-08T04:00:00.000Z');
  assert.equal(reminder.enabled, true);
  assert.equal(reminder.status, 'scheduled');
});

test('rejects invalid reminder content and timezone-less date-times', () => {
  for (const input of [
    { type: 'unknown', title: 'test', scheduledAt: '2025-03-08T09:30:00Z' },
    { type: 'custom', title: 'x', scheduledAt: '2025-03-08T09:30:00Z' },
    { type: 'custom', title: 'Reminder', scheduledAt: '2025-03-08T09:30:00' },
    { type: 'custom', title: 'Reminder', scheduledAt: 'not-a-date' },
    { type: 'custom', title: 'Reminder', scheduledAt: '2025-03-08T09:30:00Z', enabled: 'yes' },
  ]) {
    assert.throws(() => normalizeReminderInput(input), ReminderError);
  }
});

test('supports partial reminder updates without allowing invalid status values', () => {
  assert.deepEqual(normalizeReminderInput({ enabled: false }, { partial: true }), { enabled: false });
  assert.throws(() => normalizeReminderInput({ status: 'sent' }, { partial: true }), ReminderError);
});

test('scopes reminder lookups to the requester and hides records owned by someone else', async () => {
  const originalFindOne = Reminder.findOne;
  const ownerId = '507f1f77bcf86cd799439011';
  const reminderId = '507f1f77bcf86cd799439012';
  let query;
  Reminder.findOne = async (value) => {
    query = value;
    return null;
  };

  try {
    await assert.rejects(
      findOwnedReminder({ _id: ownerId }, reminderId),
      (error) => error instanceof ReminderError && error.statusCode === 404,
    );
    assert.deepEqual(query, { _id: reminderId, userId: ownerId });
  } finally {
    Reminder.findOne = originalFindOne;
  }
});
