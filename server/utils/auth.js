const jwt = require('jsonwebtoken');

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'flowcare_session';
const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || 'flowcare_csrf';

function getSameSite() {
  const sameSite = (process.env.COOKIE_SAME_SITE || 'lax').toLowerCase();
  if (!['lax', 'strict', 'none'].includes(sameSite)) {
    throw new Error('COOKIE_SAME_SITE must be lax, strict, or none');
  }
  return sameSite;
}

function isSecureCookie() {
  return process.env.NODE_ENV === 'production'
    || getSameSite() === 'none'
    || process.env.COOKIE_SECURE === 'true';
}

function cookieBaseOptions() {
  return {
    path: '/api',
    sameSite: getSameSite(),
    secure: isSecureCookie(),
  };
}

function parseDurationMilliseconds(value) {
  const match = /^(\d+)\s*(s|m|h|d|w)$/i.exec(value);
  if (!match) {
    throw new Error('JWT expiration must use a duration such as 15m, 1d, or 30d');
  }

  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  return Number(match[1]) * units[match[2].toLowerCase()];
}

function getTokenLifetime(rememberMe = false) {
  return rememberMe
    ? process.env.JWT_REMEMBER_EXPIRES_IN || '30d'
    : process.env.JWT_EXPIRES_IN || '1d';
}

function ensureAuthConfiguration() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set to a random value of at least 32 characters');
  }
  getSameSite();
  parseDurationMilliseconds(getTokenLifetime(true));
  parseDurationMilliseconds(getTokenLifetime(false));
}

function createAuthToken(userId, rememberMe = false, sessionVersion = 0) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT authentication is not configured');
  }

  const expiresIn = getTokenLifetime(rememberMe);
  return jwt.sign({ sub: userId.toString(), sessionVersion }, secret, { expiresIn });
}

function setAuthCookie(res, token, rememberMe = false) {
  const expiresIn = getTokenLifetime(rememberMe);
  res.clearCookie(AUTH_COOKIE_NAME, {
    ...cookieBaseOptions(),
    path: '/api/auth',
    httpOnly: true,
  });
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...cookieBaseOptions(),
    httpOnly: true,
    maxAge: parseDurationMilliseconds(expiresIn),
  });
}

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    ...cookieBaseOptions(),
    httpOnly: true,
  });
  res.clearCookie(AUTH_COOKIE_NAME, {
    ...cookieBaseOptions(),
    path: '/api/auth',
    httpOnly: true,
  });
}

function setCsrfCookie(res, token) {
  res.clearCookie(CSRF_COOKIE_NAME, {
    ...cookieBaseOptions(),
    path: '/api/auth',
    httpOnly: false,
  });
  res.cookie(CSRF_COOKIE_NAME, token, {
    ...cookieBaseOptions(),
    path: '/api',
    httpOnly: false,
    maxAge: 86400000,
  });
}

module.exports = {
  AUTH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  clearAuthCookie,
  createAuthToken,
  ensureAuthConfiguration,
  setAuthCookie,
  setCsrfCookie,
};
