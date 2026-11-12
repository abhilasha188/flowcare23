function normalizeOrigin(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function getClientOrigins() {
  const configuredOrigins = process.env.CLIENT_URL
    || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173');

  return configuredOrigins
    .split(',')
    .map((origin) => normalizeOrigin(origin.trim()))
    .filter(Boolean);
}

function getRequestOrigin(req) {
  const host = req.get('host');
  if (!host) return null;
  return normalizeOrigin(`${req.protocol}://${host}`);
}

module.exports = { getClientOrigins, getRequestOrigin, normalizeOrigin };
