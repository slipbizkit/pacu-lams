import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { loginLimiter, accountSetupLimiter } from '../middleware/rateLimit';
import * as AuthController from '../controllers/authController';

const router = Router();

router.post('/login', loginLimiter, asyncHandler(AuthController.login));
router.post('/verify-totp', loginLimiter, asyncHandler(AuthController.verifyTotp));

// Forced first-login password change (pre-auth, gated by tempToken from /login)
router.post('/change-password-forced', accountSetupLimiter, asyncHandler(AuthController.changePasswordForced));

// Forced first-login 2FA setup (pre-auth, gated by tempToken from /login)
router.post('/totp/setup-init', accountSetupLimiter, asyncHandler(AuthController.setupInitPending));
router.post('/totp/setup-confirm', accountSetupLimiter, asyncHandler(AuthController.setupConfirmPending));

router.get('/me', requireAuth, asyncHandler(AuthController.me));
router.post('/refresh', requireAuth, asyncHandler(AuthController.refresh));
router.post('/change-password', requireAuth, asyncHandler(AuthController.changePassword));
router.post('/totp/setup', requireAuth, asyncHandler(AuthController.setupTotp));
router.post('/totp/enable', requireAuth, asyncHandler(AuthController.enableTotp));
router.post('/totp/disable', requireAuth, asyncHandler(AuthController.disableTotp));

export default router;
