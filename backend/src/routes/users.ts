import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import * as UserController from '../controllers/userController';

const router = Router();

router.get(
  '/lawyers',
  requireAuth,
  requireRole('personnel', 'admin'),
  asyncHandler(UserController.listLawyers)
);

router.get('/', requireAuth, requireRole('admin'), asyncHandler(UserController.listUsers));
router.post('/', requireAuth, requireRole('admin'), asyncHandler(UserController.createUser));
router.patch('/:id', requireAuth, requireRole('admin'), asyncHandler(UserController.updateUser));
router.post('/:id/reset-totp', requireAuth, requireRole('admin'), asyncHandler(UserController.resetTotp));

export default router;
