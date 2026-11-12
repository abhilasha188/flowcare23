const { validationResult } = require('express-validator');

function validateRequest(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  return res.status(400).json({
    success: false,
    message: 'Please correct the highlighted fields.',
    errors: result.array({ onlyFirstError: true }).map(({ path, param, msg }) => ({
      field: path || param,
      message: msg,
    })),
  });
}

module.exports = validateRequest;
