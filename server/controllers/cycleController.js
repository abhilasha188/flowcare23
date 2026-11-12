const {
  createCycle,
  deleteCycle,
  findOwnedCycle,
  listCycles,
  updateCycle,
} = require('../services/cycleService');
const { addCycleLengths, serializeCycle } = require('../services/predictionService');

function respondError(res, error) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: [],
    });
  }
  throw error;
}

async function getCycles(req, res, next) {
  try {
    const records = await listCycles(req.user);
    return res.status(200).json({ success: true, cycles: addCycleLengths(records).reverse() });
  } catch (error) {
    return next(error);
  }
}

async function getCycle(req, res, next) {
  try {
    const record = await findOwnedCycle(req.user, req.params.id);
    return res.status(200).json({ success: true, cycle: serializeCycle(record) });
  } catch (error) {
    if (error.statusCode) return respondError(res, error);
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const record = await createCycle(req.user, req.body);
    return res.status(201).json({
      success: true,
      message: 'Period saved.',
      cycle: serializeCycle(record),
    });
  } catch (error) {
    if (error.statusCode) return respondError(res, error);
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const record = await updateCycle(req.user, req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Period updated.',
      cycle: serializeCycle(record),
    });
  } catch (error) {
    if (error.statusCode) return respondError(res, error);
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    await deleteCycle(req.user, req.params.id);
    return res.status(200).json({ success: true, message: 'Period deleted.' });
  } catch (error) {
    if (error.statusCode) return respondError(res, error);
    return next(error);
  }
}

module.exports = { create, getCycle, getCycles, remove, update };
