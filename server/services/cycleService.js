const mongoose = require('mongoose');
const Cycle = require('../models/Cycle');
const { dateOnlyToUtc, toDateOnly } = require('./predictionService');

class CycleError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'CycleError';
    this.statusCode = statusCode;
  }
}

function parsePeriodInput(input, today = new Date()) {
  const startDate = dateOnlyToUtc(input.startDate);
  const endDate = input.endDate ? dateOnlyToUtc(input.endDate) : null;
  if (!startDate) throw new CycleError('Enter a valid period start date.', 400);
  if (input.endDate && !endDate) throw new CycleError('Enter a valid period end date.', 400);

  const todayDate = dateOnlyToUtc(today);
  if (!todayDate) throw new CycleError('Unable to determine today’s date.', 500);
  const earliest = new Date(Date.UTC(todayDate.getUTCFullYear() - 120, todayDate.getUTCMonth(), todayDate.getUTCDate()));
  if (startDate < earliest) {
    throw new CycleError('Period dates must be within the last 120 years.', 400);
  }
  if (startDate > todayDate) throw new CycleError('Period start date cannot be in the future.', 400);
  if (endDate && endDate > todayDate) throw new CycleError('Period end date cannot be in the future.', 400);
  if (endDate && endDate < startDate) throw new CycleError('Period end date cannot be before its start date.', 400);
  if (endDate && (endDate.getTime() - startDate.getTime()) / 86400000 + 1 > 15) {
    throw new CycleError('A period record cannot be longer than 15 days.', 400);
  }
  return { startDate, endDate };
}

function normalizeOptionalFields(input) {
  const flowIntensity = input.flowIntensity || null;
  if (flowIntensity && !['light', 'medium', 'heavy'].includes(flowIntensity)) {
    throw new CycleError('Select a valid flow intensity.', 400);
  }
  if (input.notes != null && typeof input.notes !== 'string') {
    throw new CycleError('Notes must be text.', 400);
  }
  const notes = typeof input.notes === 'string' ? input.notes.trim() : '';
  if (notes.length > 500) throw new CycleError('Notes must be 500 characters or fewer.', 400);
  return { flowIntensity, notes };
}

function getUserId(user) {
  return user._id || user.id;
}

async function assertNoOverlap(userId, startDate, endDate, excludedId = null, today = new Date()) {
  const query = { userId };
  if (excludedId) query._id = { $ne: excludedId };
  const records = await Cycle.find(query).select('startDate endDate').lean();
  const todayDate = dateOnlyToUtc(today);
  if (!todayDate) throw new CycleError('Unable to determine today’s date.', 500);

  const overlap = records.some((record) => {
    const existingEndDate = record.endDate || todayDate;
    const newEndDate = endDate || todayDate;
    return startDate <= existingEndDate && newEndDate >= record.startDate;
  });

  if (overlap) {
    throw new CycleError('This period overlaps another recorded period. Review your existing records.', 409);
  }
}

async function listCycles(user) {
  const records = await Cycle.find({ userId: getUserId(user) })
    .sort({ startDate: -1 })
    .lean();
  return records;
}

async function findOwnedCycle(user, cycleId) {
  if (!mongoose.Types.ObjectId.isValid(cycleId) || !/^[a-f\d]{24}$/i.test(cycleId)) {
    throw new CycleError('Period record not found.', 404);
  }
  const record = await Cycle.findOne({ _id: cycleId, userId: getUserId(user) });
  if (!record) throw new CycleError('Period record not found.', 404);
  return record;
}

async function createCycle(user, input, today = new Date()) {
  const { startDate, endDate } = parsePeriodInput(input, today);
  const optionalFields = normalizeOptionalFields(input);
  const userId = getUserId(user);

  if (await Cycle.exists({ userId, startDate })) {
    throw new CycleError('A period already begins on this date.', 409);
  }
  await assertNoOverlap(userId, startDate, endDate, null, today);

  try {
    return await Cycle.create({ userId, startDate, endDate, ...optionalFields });
  } catch (error) {
    if (error?.code === 11000) {
      throw new CycleError('A period already begins on this date.', 409);
    }
    throw error;
  }
}

async function updateCycle(user, cycleId, input, today = new Date()) {
  const record = await findOwnedCycle(user, cycleId);
  const { startDate, endDate } = parsePeriodInput(input, today);
  const optionalFields = normalizeOptionalFields(input);
  const userId = getUserId(user);

  const duplicate = await Cycle.exists({
    userId,
    startDate,
    _id: { $ne: record._id },
  });
  if (duplicate) throw new CycleError('A period already begins on this date.', 409);
  await assertNoOverlap(userId, startDate, endDate, record._id, today);

  record.startDate = startDate;
  record.endDate = endDate;
  record.flowIntensity = optionalFields.flowIntensity;
  record.notes = optionalFields.notes;
  try {
    return await record.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw new CycleError('A period already begins on this date.', 409);
    }
    throw error;
  }
}

async function deleteCycle(user, cycleId) {
  const record = await findOwnedCycle(user, cycleId);
  await record.deleteOne();
  return record;
}

module.exports = {
  CycleError,
  createCycle,
  deleteCycle,
  findOwnedCycle,
  listCycles,
  parsePeriodInput,
  updateCycle,
};
