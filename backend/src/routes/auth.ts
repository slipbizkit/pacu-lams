import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { loginLimiter, totpLimiter, authIpLimiter, accountSetupLimiter } from '../middleware/rateLimit';
import * as AuthController from '../controllers/authController';

const router = Router();

// Two nets on each credential route: a strict per-account limit (so guessing one
// account can't lock out the rest of the office), behind a looser per-IP limit (so
// spraying one guess across many accounts from one host still trips something).
router.post('/login', authIpLimiter, loginLimiter, asyncHandler(AuthController.login));
router.post('/terminal', authIpLimiter, asyncHandler(AuthController.terminalLogin));
router.post('/verify-totp', authIpLimiter, totpLimiter, asyncHandler(AuthController.verifyTotp));

// Forced first-login password change (pre-auth, gated by tempToken from /login)
router.post('/change-password-forced', accountSetupLimiter, asyncHandler(AuthController.changePasswordForced));

// Forced first-login 2FA setup (pre-auth, gated by tempToken from /login)
router.post('/totp/setup-init', accountSetupLimiter, asyncHandler(AuthController.setupInitPending));
router.post('/totp/setup-confirm', accountSetupLimiter, asyncHandler(AuthController.setupConfirmPending));

router.get('/me', requireAuth, asyncHandler(AuthController.me));
router.post('/logout', requireAuth, asyncHandler(AuthController.logout));
router.post('/refresh', requireAuth, asyncHandler(AuthController.refresh));
router.post('/change-password', requireAuth, asyncHandler(AuthController.changePassword));
router.post('/terminal-password', requireAuth, requireRole('admin'), asyncHandler(AuthController.setTerminalPassword));
router.post('/totp/setup', requireAuth, asyncHandler(AuthController.setupTotp));
router.post('/totp/enable', requireAuth, asyncHandler(AuthController.enableTotp));
router.post('/totp/disable', requireAuth, asyncHandler(AuthController.disableTotp));

export default router;
