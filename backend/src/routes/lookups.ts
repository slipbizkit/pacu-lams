import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import * as LookupController from '../controllers/lookupController';

const router = Router();

// Public — no auth. Backs the City/Municipality dropdown on the public intake form.
router.get('/cities-municipalities', asyncHandler(LookupController.listCitiesMunicipalities));

router.get('/issue-categories', requireAuth, asyncHandler(LookupController.listIssueCategories));
router.get('/referred-offices', requireAuth, asyncHandler(LookupController.listReferredOffices));

// Admin management — includes inactive rows, mutations
router.get(
  '/issue-categories/all',
  requireAuth,
  requireRole('admin'),
  asyncHandler(LookupController.listAllIssueCategories)
);
router.post(
  '/issue-categories',
  requireAuth,
  requireRole('admin'),
  asyncHandler(LookupController.createIssueCategory)
);
router.patch(
  '/issue-categories/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(LookupController.updateIssueCategory)
);

router.get(
  '/referred-offices/all',
  requireAuth,
  requireRole('admin'),
  asyncHandler(LookupController.listAllReferredOffices)
);
router.post(
  '/referred-offices',
  requireAuth,
  requireRole('admin'),
  asyncHandler(LookupController.createReferredOffice)
);
router.patch(
  '/referred-offices/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(LookupController.updateReferredOffice)
);

export default router;
