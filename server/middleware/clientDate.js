const { dateOnlyInTimeZone } = require('../utils/dateOnly');

function setClientDate(req, res, next) {
  const timeZone = req.get('X-Client-Timezone') || 'UTC';
  try {
    req.todayDate = dateOnlyInTimeZone(new Date(), timeZone);
    return next();
  } catch (error) {
    if (error instanceof RangeError) {
      return res.status(400).json({
        success: false,
        message: 'Client time zone is invalid.',
        errors: [],
      });
    }
    return next(error);
  }
}

module.exports = setClientDate;
