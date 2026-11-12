const mongoose = require('mongoose');
const Symptom = require('../models/Symptom');
const { dateOnlyToUtc, toDateOnly } = require('./predictionService');

const MOODS = ['happy', 'calm', 'sad', 'irritated', 'anxious', 'stressed', 'energetic', 'low', 'emotional'];
const FLOW_INTENSITIES = ['light', 'medium', 'heavy'];
const MAX_SYMPTOMS_PER_DAY = 20;

class SymptomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'SymptomError';
    this.statusCode = statusCode;
  }
}

function getUserId(user) {
  return user._id || user.id;
}

function optionalScore(value, label) {
  if (value == null || value === '') return null;
  if (!Number.isInteger(value) || value < 1 || value > 10) {
    throw new SymptomError(`${label} must be a whole number from 1 to 10.`, 400);
  }
  return value;
}

function normalizeSymptomInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new SymptomError('Enter a valid daily health entry.', 400);
  }

  const date = typeof input.date === 'string' ? dateOnlyToUtc(input.date) : null;
  if (!date) throw new SymptomError('Enter a valid date as YYYY-MM-DD.', 400);
  if (date > dateOnlyToUtc(new Date())) throw new SymptomError('The entry date cannot be in the future.', 400);

  if (input.symptoms != null && !Array.isArray(input.symptoms)) {
    throw new SymptomError('Symptoms must be a list.', 400);
  }
  const symptomInputs = input.symptoms || [];
  if (symptomInputs.length > MAX_SYMPTOMS_PER_DAY) {
    throw new SymptomError(`Record no more than ${MAX_SYMPTOMS_PER_DAY} symptoms per day.`, 400);
  }
  const seenNames = new Set();
  const symptoms = symptomInputs.map((item) => {
    if (!item || typeof item.name !== 'string') throw new SymptomError('Each symptom needs a name.', 400);
    const name = item.name.trim();
    if (!name || name.length > 60) throw new SymptomError('Symptom names must be 1 to 60 characters.', 400);
    const key = name.toLocaleLowerCase();
    if (seenNames.has(key)) throw new SymptomError('A symptom can only be recorded once per day.', 400);
    seenNames.add(key);
    if (!Number.isInteger(item.severity) || item.severity < 1 || item.severity > 10) {
      throw new SymptomError('Each symptom severity must be a whole number from 1 to 10.', 400);
    }
    const description = item.description == null ? '' : item.description;
    if (typeof description !== 'string' || description.trim().length > 300) {
      throw new SymptomError('Symptom descriptions must be 300 characters or fewer.', 400);
    }
    return { name, severity: item.severity, description: description.trim() };
  });

  const mood = input.mood || null;
  if (mood && !MOODS.includes(mood)) throw new SymptomError('Select a valid mood.', 400);
  const flowIntensity = input.flowIntensity || null;
  if (flowIntensity && !FLOW_INTENSITIES.includes(flowIntensity)) {
    throw new SymptomError('Select a valid flow intensity.', 400);
  }
  const energyLevel = optionalScore(input.energyLevel, 'Energy level');
  const sleepQuality = optionalScore(input.sleepQuality, 'Sleep quality');
  const notes = input.notes == null ? '' : input.notes;
  if (typeof notes !== 'string' || notes.trim().length > 2000) {
    throw new SymptomError('Notes must be 2,000 characters or fewer.', 400);
  }
  if (
    symptoms.length === 0
    && !mood
    && energyLevel == null
    && sleepQuality == null
    && !flowIntensity
    && !notes.trim()
  ) {
    throw new SymptomError('Add at least one symptom or health detail before saving.', 400);
  }

  return {
    date,
    symptoms,
    mood,
    energyLevel,
    sleepQuality,
    flowIntensity,
    notes: notes.trim(),
  };
}

function serializeSymptom(entry) {
  const value = typeof entry.toObject === 'function' ? entry.toObject() : entry;
  return { ...value, date: toDateOnly(value.date) };
}

function parseListFilters(filters = {}) {
  const query = {};
  const from = filters.from ? dateOnlyToUtc(filters.from) : null;
  const to = filters.to ? dateOnlyToUtc(filters.to) : null;
  if ((filters.from && !from) || (filters.to && !to)) {
    throw new SymptomError('Date filters must use YYYY-MM-DD.', 400);
  }
  if (from && to && from > to) throw new SymptomError('Start date must be on or before end date.', 400);
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = from;
    if (to) query.date.$lte = to;
  }

  if (filters.symptom) {
    const symptom = String(filters.symptom).trim();
    if (symptom.length > 60) throw new SymptomError('Symptom filter is too long.', 400);
    query['symptoms.name'] = new RegExp(`^${symptom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  }
  if (filters.search) {
    const search = String(filters.search).trim();
    if (search.length > 100) throw new SymptomError('Search text is too long.', 400);
    const expression = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ 'symptoms.name': expression }, { mood: expression }, { notes: expression }];
  }

  const page = Math.max(1, Number.parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(filters.limit, 10) || 20));
  return { query, page, limit };
}

async function saveDailyEntry(user, input) {
  const userId = getUserId(user);
  const normalized = normalizeSymptomInput(input);
  let entry = await Symptom.findOne({ userId, date: normalized.date });
  if (entry) {
    Object.assign(entry, normalized);
    return { entry: await entry.save(), created: false };
  }

  try {
    return {
      entry: await Symptom.create({ userId, ...normalized }),
      created: true,
    };
  } catch (error) {
    if (error?.code !== 11000) throw error;
    entry = await Symptom.findOne({ userId, date: normalized.date });
    if (!entry) throw error;
    Object.assign(entry, normalized);
    return { entry: await entry.save(), created: false };
  }
}

async function listEntries(user, filters = {}) {
  const { query, page, limit } = parseListFilters(filters);
  const userId = getUserId(user);
  const filter = { ...query, userId };
  const [entries, total] = await Promise.all([
    Symptom.find(filter).sort({ date: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Symptom.countDocuments(filter),
  ]);
  return { entries: entries.map(serializeSymptom), pagination: { page, limit, total } };
}

async function findOwnedEntry(user, entryId) {
  if (!mongoose.Types.ObjectId.isValid(entryId) || !/^[a-f\d]{24}$/i.test(entryId)) {
    throw new SymptomError('Symptom entry not found.', 404);
  }
  const entry = await Symptom.findOne({ _id: entryId, userId: getUserId(user) });
  if (!entry) throw new SymptomError('Symptom entry not found.', 404);
  return entry;
}

async function updateEntry(user, entryId, input) {
  const entry = await findOwnedEntry(user, entryId);
  const normalized = normalizeSymptomInput(input);
  const duplicate = await Symptom.exists({
    userId: getUserId(user),
    date: normalized.date,
    _id: { $ne: entry._id },
  });
  if (duplicate) throw new SymptomError('A daily entry already exists for that date.', 409);
  Object.assign(entry, normalized);
  try {
    return await entry.save();
  } catch (error) {
    if (error?.code === 11000) throw new SymptomError('A daily entry already exists for that date.', 409);
    throw error;
  }
}

async function deleteEntry(user, entryId) {
  const entry = await findOwnedEntry(user, entryId);
  await entry.deleteOne();
}

module.exports = {
  FLOW_INTENSITIES,
  MAX_SYMPTOMS_PER_DAY,
  MOODS,
  SymptomError,
  deleteEntry,
  findOwnedEntry,
  listEntries,
  normalizeSymptomInput,
  parseListFilters,
  saveDailyEntry,
  serializeSymptom,
  updateEntry,
};
