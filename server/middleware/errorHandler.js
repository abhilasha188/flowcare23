function errorHandler(error, _req, res, next) {
  if (res.headersSent) return next(error);

  if (error?.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request body is too large.',
      errors: [],
    });
  }

  if (error?.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Please correct the submitted information.',
      errors: Object.values(error.errors).map(({ path, message }) => ({ field: path, message })),
    });
  }

  if (error?.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'A record with this value already exists.',
      errors: [],
    });
  }

  console.error('Request failed:', error?.name || 'UnknownError');

  return res.status(500).json({
    success: false,
    message: 'An unexpected error occurred.',
    errors: [],
  });
}

module.exports = errorHandler;
