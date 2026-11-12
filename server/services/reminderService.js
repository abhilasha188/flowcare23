const mongoose = require('mongoose');
const Reminder = require('../models/Reminder');
const REMINDER_TYPES = require('../utils/reminderTypes');
const TIMEZONE_SUFFIX = /(?:Z|[+-]\d{2}:\d{2})$/i;

class ReminderError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'ReminderError';
    this.statusCode = statusCode;
  }
}

function getUserId(user) {
  return user._id || user.id;
}

function normalizeReminderInput(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ReminderError('Enter valid reminder details.', 400);
  }
  const result = {};
  const fields = ['type', 'title', 'message', 'scheduledAt', 'enabled', 'status'];
  for (const field of fields) {
    if (Object.hasOwn(input, field)) result[field] = input[field];
  }

  if (!partial || Object.hasOwn(result, 'type')) {
    if (!REMINDER_TYPES.includes(result.type)) throw new ReminderError('Select a valid reminder type.', 400);
  }
  if (!partial || Object.hasOwn(result, 'title')) {
    if (typeof result.title !== 'string' || result.title.trim().length < 2 || result.title.trim().length > 80) {
      throw new ReminderError('Reminder titles must be 2 to 80 characters.', 400);
    }
    result.title = result.title.trim();
  }
  if (Object.hasOwn(result, 'message')) {
    if (typeof result.message !== 'string' || result.message.trim().length > 500) {
      throw new ReminderError('Reminder messages must be 500 characters or fewer.', 400);
    }
    result.message = result.message.trim();
  }
  if (!partial || Object.hasOwn(result, 'scheduledAt')) {
    if (
      typeof result.scheduledAt !== 'string'
      || !TIMEZONE_SUFFIX.test(result.scheduledAt)
      || Number.isNaN(Date.parse(result.scheduledAt))
    ) {
      throw new ReminderError('Choose a valid date and time with a timezone.', 400);
    }
    result.scheduledAt = new Date(result.scheduledAt);
  }
  if (Object.hasOwn(result, 'enabled') && typeof result.enabled !== 'boolean') {
    throw new ReminderError('Reminder enabled state must be true or false.', 400);
  }
  if (Object.hasOwn(result, 'status') && !['scheduled', 'dismissed'].includes(result.status)) {
    throw new ReminderError('Select a valid reminder status.', 400);
  }
  if (!partial && !Object.hasOwn(result, 'enabled')) result.enabled = true;
  if (!partial) result.status = 'scheduled';
  return result;
}

async function listReminders(user) {
  const records = await Reminder.find({ userId: getUserId(user) })
    .sort({ scheduledAt: 1 })
    .limit(500)
    .lean();
  return records.map((record) => ({
    ...record,
    derivedStatus: !record.enabled
      ? 'disabled'
      : record.status === 'dismissed'
        ? 'dismissed'
        : record.scheduledAt <= new Date()
          ? 'past'
          : 'upcoming',
  }));
}

async function findOwnedReminder(user, reminderId) {
  if (!mongoose.Types.ObjectId.isValid(reminderId) || !/^[a-f\d]{24}$/i.test(reminderId)) {
    throw new ReminderError('Reminder not found.', 404);
  }
  const reminder = await Reminder.findOne({ _id: reminderId, userId: getUserId(user) });
  if (!reminder) throw new ReminderError('Reminder not found.', 404);
  return reminder;
}

async function createReminder(user, input) {
  const normalized = normalizeReminderInput(input);
  return Reminder.create({ userId: getUserId(user), ...normalized });
}

async function updateReminder(user, reminderId, input) {
  const reminder = await findOwnedReminder(user, reminderId);
  const normalized = normalizeReminderInput(input, { partial: true });
  if (Object.hasOwn(normalized, 'status') && normalized.status === 'dismissed') {
    reminder.status = 'dismissed';
  } else if (Object.hasOwn(normalized, 'status')) {
    reminder.status = 'scheduled';
  }
  for (const field of ['type', 'title', 'message', 'scheduledAt', 'enabled']) {
    if (Object.hasOwn(normalized, field)) reminder[field] = normalized[field];
  }
  return reminder.save();
}

async function deleteReminder(user, reminderId) {
  const reminder = await findOwnedReminder(user, reminderId);
  await reminder.deleteOne();
}

module.exports = {
  REMINDER_TYPES,
  ReminderError,
  createReminder,
  deleteReminder,
  findOwnedReminder,
  listReminders,
  normalizeReminderInput,
  updateReminder,
};
