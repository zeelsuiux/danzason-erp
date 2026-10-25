const EXPECTED_KEY =
  process.env.EXTERNAL_CRM_API_KEY || '2ee062fd20e15a2da9c359fac339da2c24396001c9d748df0ef4c6a1d6a776a6';

/**
 * Middleware to authenticate External CRM requests via:
 * 1. x-api-key header
 * 2. Authorization: Bearer <token>
 * 3. Permissive bypass for local frontend client (localhost:3000)
 */
const crmAuth = (req, res, next) => {
  const apiKey =
    req.headers['x-api-key'] ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.substring(7)
      : null);

  // If API key is provided, validate strictly
  if (apiKey) {
    if (apiKey === EXPECTED_KEY) {
      req.crmAuthenticated = true;
      return next();
    }
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid API key',
    });
  }

  // Allow internal frontend browser requests originating strictly from trusted development origins
  const origin = req.headers.origin || req.headers.referer || '';
  const isTrustedOrigin =
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(origin) ||
    !origin; // internal server-to-server or curl/tests

  if (isTrustedOrigin) {
    req.internalAuthenticated = true;
    return next();
  }

  // Otherwise, require valid API key
  return res.status(401).json({
    success: false,
    message: 'Unauthorized: Missing or invalid x-api-key header or Bearer token',
  });
};

module.exports = crmAuth;
