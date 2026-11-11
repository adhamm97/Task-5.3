import { doubleCsrf } from 'csrf-csrf';

const isProduction = process.env.NODE_ENV === 'production';

export const CSRF_COOKIE_NAME = isProduction ? '__Host-psifi.x-csrf-token' : 'x-csrf-token';

export const {
  invalidCsrfTokenError,
  generateCsrfToken,
  validateRequest,
  doubleCsrfProtection
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || process.env.JWT_SECRET || 'dev-csrf-secret',
  // Bind the CSRF token to the caller's session cookie (JWT), falling back to ''
  // when unauthenticated so pre-session token fetches never crash.
  getSessionIdentifier: (req) => req.cookies?.token || '',
  cookieName: CSRF_COOKIE_NAME,
  cookieOptions: {
    sameSite: 'lax',
    path: '/',
    secure: isProduction,
    httpOnly: true
  },
  getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'],
  skipCsrfProtection: (req) => {
    const reqPath = (req.originalUrl || req.path || '').split('?')[0];
    // Pre-auth routes run before a session cookie exists, so leave them exempt.
    return reqPath === '/api/auth/login' || reqPath === '/api/auth/register';
  }
});

