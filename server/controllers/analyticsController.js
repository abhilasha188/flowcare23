const Cycle = require('../models/Cycle');
const {
  getCycleAnalytics,
  getMoodAnalytics,
  getOverview,
  getPatternAnalytics,
  getSymptomAnalytics,
} = require('../services/analyticsService');
const { calculateCycleOverview, dateOnlyToUtc } = require('../services/predictionService');

function handleError(error, res, next) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ success: false, message: error.message, errors: [] });
  }
  return next(error);
}

async function overview(req, res, next) {
  try {
    return res.status(200).json({ success: true, overview: await getOverview(req.user, req.todayDate) });
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function getPredictions(req, res, next) {
  try {
    const cycles = await Cycle.find({ userId: req.user._id }).sort({ startDate: -1 }).limit(120).lean();
    cycles.reverse();
    return res.status(200).json({
      success: true,
      predictions: calculateCycleOverview(cycles, req.user, req.todayDate),
    });
  } catch (error) {
    return next(error);
  }
}

async function cycles(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      analytics: await getCycleAnalytics(req.user, req.query.range, dateOnlyToUtc(req.todayDate)),
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function symptoms(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      analytics: await getSymptomAnalytics(req.user, req.query.range, dateOnlyToUtc(req.todayDate)),
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function moods(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      analytics: await getMoodAnalytics(req.user, req.query.range, dateOnlyToUtc(req.todayDate)),
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function patterns(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      analytics: await getPatternAnalytics(req.user, req.query.range, dateOnlyToUtc(req.todayDate)),
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}

module.exports = {
  cycles,
  getPredictions,
  moods,
  overview,
  patterns,
  symptoms,
};
