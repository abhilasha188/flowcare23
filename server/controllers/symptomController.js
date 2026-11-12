const {
  SymptomError,
  deleteEntry,
  findOwnedEntry,
  listEntries,
  saveDailyEntry,
  serializeSymptom,
  updateEntry,
} = require('../services/symptomService');

function handleError(error, res, next) {
  if (error instanceof SymptomError) {
    return res.status(error.statusCode).json({ success: false, message: error.message, errors: [] });
  }
  return next(error);
}

async function create(req, res, next) {
  try {
    const { entry, created } = await saveDailyEntry(req.user, req.body, req.todayDate);
    return res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Daily health entry saved.' : 'Daily health entry updated.',
      entry: serializeSymptom(entry),
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function list(req, res, next) {
  try {
    const result = await listEntries(req.user, req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function get(req, res, next) {
  try {
    const entry = await findOwnedEntry(req.user, req.params.id);
    return res.status(200).json({ success: true, entry: serializeSymptom(entry) });
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function update(req, res, next) {
  try {
    const entry = await updateEntry(req.user, req.params.id, req.body, req.todayDate);
    return res.status(200).json({ success: true, message: 'Daily health entry updated.', entry: serializeSymptom(entry) });
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function remove(req, res, next) {
  try {
    await deleteEntry(req.user, req.params.id);
    return res.status(200).json({ success: true, message: 'Daily health entry deleted.' });
  } catch (error) {
    return handleError(error, res, next);
  }
}

module.exports = { create, get, list, remove, update };
