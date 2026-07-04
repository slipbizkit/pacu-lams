import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import * as ClientController from '../controllers/clientController';

const router = Router();

// Public — no auth. This is the one open intake screen; there is no authenticated variant.
router.post('/', asyncHandler(ClientController.intake));

// Public — no auth. Client-facing post-completion feedback, looked up by reference_no.
router.get('/feedback/:referenceNo', asyncHandler(ClientController.getFeedbackStatus));
router.post('/feedback/:referenceNo', asyncHandler(ClientController.submitFeedback));

router.get('/queue', requireAuth, asyncHandler(ClientController.listQueue));
router.post(
  '/:id/assign',
  requireAuth,
  requireRole('personnel', 'admin'),
  asyncHandler(ClientController.assign)
);

router.get('/mine', requireAuth, requireRole('lawyer'), asyncHandler(ClientController.listMine));
router.get('/mine/:id', requireAuth, requireRole('lawyer'), asyncHandler(ClientController.getMine));
router.post('/:id/claim', requireAuth, requireRole('lawyer'), asyncHandler(ClientController.claim));
router.patch(
  '/:id/consultation',
  requireAuth,
  requireRole('lawyer'),
  asyncHandler(ClientController.saveConsultation)
);

router.get(
  '/:id/referral.pdf',
  requireAuth,
  requireRole('lawyer', 'admin'),
  asyncHandler(ClientController.getReferralPdf)
);

export default router;
