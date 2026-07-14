import rateLimit from 'express-rate-limit';
import { createHash } from 'crypto';
import { Request } from 'express';
import { PostgresRateLimitStore } from './pgRateLimitStore';

const WINDOW_MS = 15 * 60 * 1000;

function clientIp(req: Request): string {
  return req.ip ?? 'unknown-ip';
}

// The tempToken is a JWT — too long to use as a primary key, and not something to
// copy into a table verbatim. A digest identifies the same session without storing
// the credential itself.
function tempTokenFingerprint(req: Request): string {
  const token = (req.body?.tempToken as string | undefined) ?? '';
  if (!token) return 'no-token';
  return createHash('sha256').update(token).digest('hex').slice(0, 32);
}

function submittedEmail(req: Request): string {
  const email = (req.body?.email as string | undefined) ?? '';
  return email.trim().toLowerCase() || 'no-email';
}

/**
 * Credential submission. Keyed by **account + IP**, not IP alone: PACU staff all sit
 * behind one office NAT, so an IP-only key meant one person fat-fingering their
 * password consumed the whole unit's budget and could lock out their colleagues
 * (the kiosk included). Keying on the account confines the lockout to the account
 * actually under attack.
 *
 * `skipSuccessfulRequests` makes this a limit on *failures*. Previously a clean
 * login still spent from the budget, so the cap throttled legitimate use as much as
 * it did guessing.
 */
export const loginLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `login:${clientIp(req)}:${submittedEmail(req)}`,
  message: { message: 'Too many failed login attempts for this account. Please try again in 15 minutes.' },
  store: new PostgresRateLimitStore(),
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Per-account keying alone would let one host guess one password each against many
 * accounts without ever tripping a limit, so a looser per-IP net sits behind it to
 * catch spraying. Failures only, and high enough that a whole office signing in at
 * shift change never approaches it.
 */
export const authIpLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 60,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `authip:${clientIp(req)}`,
  message: { message: 'Too many failed attempts from this location. Please try again in 15 minutes.' },
  store: new PostgresRateLimitStore(),
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * TOTP verification gets its own limiter and its own counter. It used to share the
 * login limiter instance — one store, one key — so a normal login (credentials, then
 * code) spent two of the ten, and a wrong code ate into the budget for signing in at
 * all. Keyed by the pending session rather than the account, which is all this step
 * knows about.
 */
export const totpLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `totp:${clientIp(req)}:${tempTokenFingerprint(req)}`,
  message: { message: 'Too many incorrect verification codes. Please sign in again in a few minutes.' },
  store: new PostgresRateLimitStore(),
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * First-login setup (forced password change + 2FA enrolment) is already gated by a
 * short-lived tempToken, so it needs only loose abuse protection. Keyed by that
 * session so one person's enrolment can't exhaust anyone else's allowance.
 */
export const accountSetupLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 30,
  keyGenerator: (req) => `setup:${clientIp(req)}:${tempTokenFingerprint(req)}`,
  message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
  store: new PostgresRateLimitStore(),
  standardHeaders: true,
  legacyHeaders: false,
});
