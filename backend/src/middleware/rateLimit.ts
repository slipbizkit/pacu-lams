import rateLimit from 'express-rate-limit';

// Brute-force protection for credential and TOTP-code submission.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts, please try again later' },
});

// First-login setup steps (forced password change + 2FA enrolment) are gated by a
// short-lived tempToken, so they need only loose abuse protection — not the strict
// credential limiter. A higher cap keeps a legitimate multi-step setup from locking
// itself out, and the message fits the context instead of mentioning "login attempts".
export const accountSetupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
});
