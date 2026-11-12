const {
  ReminderError,
  createReminder,
  deleteReminder,
  listReminders,
  updateReminder,
} = require('../services/reminderService');

function handleError(error, res, next) {
  if (error instanceof ReminderError) {
    return res.status(error.statusCode).json({ success: false, message: error.message, errors: [] });
  }
  return next(error);
}

async function list(req, res, next) {
  try {
    return res.status(200).json({ success: true, reminders: await listReminders(req.user) });
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const reminder = await createReminder(req.user, req.body);
    return res.status(201).json({ success: true, message: 'Reminder saved.', reminder });
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function update(req, res, next) {
  try {
    const reminder = await updateReminder(req.user, req.params.id, req.body);
    return res.status(200).json({ success: true, message: 'Reminder updated.', reminder });
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function remove(req, res, next) {
  try {
    await deleteReminder(req.user, req.params.id);
    return res.status(200).json({ success: true, message: 'Reminder deleted.' });
  } catch (error) {
    return handleError(error, res, next);
  }
}

module.exports = { create, list, remove, update };
