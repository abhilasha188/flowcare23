const crypto = require('crypto');
const { CSRF_COOKIE_NAME, setCsrfCookie } = require('../utils/auth');
const { getClientOrigins, getRequestOrigin, normalizeOrigin } = require('../utils/origins');

function issueCsrfToken(_req, res) {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  setCsrfCookie(res, csrfToken);
  return res.status(200).json({ success: true, csrfToken });
}

function csrfProtection(req, res, next) {
  const origin = req.get('Origin');
  const normalizedOrigin = origin ? normalizeOrigin(origin) : null;
  if (
    origin
    && (!normalizedOrigin
      || (normalizedOrigin !== getRequestOrigin(req) && !getClientOrigins().includes(normalizedOrigin)))
  ) {
    return res.status(403).json({
      success: false,
      message: 'Request origin is not allowed.',
      errors: [],
    });
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.get('X-CSRF-Token');
  if (
    typeof cookieToken !== 'string'
    || typeof headerToken !== 'string'
    || cookieToken.length !== headerToken.length
    || !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))
  ) {
    return res.status(403).json({
      success: false,
      message: 'Request verification failed. Refresh the page and try again.',
      errors: [],
    });
  }

  return next();
}

module.exports = { csrfProtection, issueCsrfToken };
