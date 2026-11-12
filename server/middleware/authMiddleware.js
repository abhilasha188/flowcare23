const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AUTH_COOKIE_NAME } = require('../utils/auth');

async function authenticate(req, res, next) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
      errors: [],
    });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      return res.status(500).json({
        success: false,
        message: 'Authentication is temporarily unavailable.',
        errors: [],
      });
    }

    const payload = jwt.verify(token, secret);
    if (typeof payload !== 'object' || typeof payload.sub !== 'string') {
      throw new jwt.JsonWebTokenError('Invalid token subject');
    }

    const user = await User.findById(payload.sub);
    if (!user || payload.sessionVersion !== user.sessionVersion) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        errors: [],
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Session is invalid or has expired. Please sign in again.',
        errors: [],
      });
    }
    return next(error);
  }
}

module.exports = authenticate;
