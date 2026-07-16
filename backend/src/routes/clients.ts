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

// Public — no auth. Lobby-TV queue board (PII-free), refreshed by the display itself.
router.get('/queue-board', asyncHandler(ClientController.getQueueBoard));

router.get('/queue', requireAuth, asyncHandler(ClientController.listQueue));
router.post(
  '/:id/assign',
  requireAuth,
  requireRole('personnel', 'admin'),
  asyncHandler(ClientController.assign)
);

router.get('/history', requireAuth, requireRole('lawyer'), asyncHandler(ClientController.listHistory));
router.get('/cancelled', requireAuth, requireRole('lawyer'), asyncHandler(ClientController.listCancelled));
router.get('/all-cancelled', requireAuth, requireRole('personnel', 'support_staff', 'admin'), asyncHandler(ClientController.listAllCancelled));
router.post('/:id/restore', requireAuth, requireRole('personnel', 'support_staff', 'admin'), asyncHandler(ClientController.restoreToQueue));
router.get('/ss-dashboard', requireAuth, requireRole('support_staff'), asyncHandler(ClientController.getSupportStaffDashboard));
router.get('/dashboard', requireAuth, requireRole('personnel', 'lawyer', 'admin'), asyncHandler(ClientController.getDashboard));
router.get('/dashboard/charts', requireAuth, requireRole('personnel', 'lawyer', 'admin'), asyncHandler(ClientController.getDashboardCharts));
router.get('/all-history', requireAuth, requireRole('personnel', 'support_staff', 'admin'), asyncHandler(ClientController.listAllHistory));
router.post('/:id/remove', requireAuth, requireRole('support_staff', 'personnel', 'admin'), asyncHandler(ClientController.removeFromQueue));
router.get('/mine', requireAuth, requireRole('lawyer'), asyncHandler(ClientController.listMine));
router.get('/mine/:id', requireAuth, requireRole('lawyer'), asyncHandler(ClientController.getMine));
router.post('/:id/claim', requireAuth, requireRole('lawyer'), asyncHandler(ClientController.claim));
router.patch(
  '/:id/consultation',
  requireAuth,
  requireRole('lawyer'),
  asyncHandler(ClientController.saveConsultation)
);
router.post(
  '/:id/cancel',
  requireAuth,
  requireRole('lawyer'),
  asyncHandler(ClientController.cancelTransaction)
);

router.post(
  '/:id/send-email',
  requireAuth,
  requireRole('lawyer'),
  asyncHandler(ClientController.sendEmail)
);

// Manual encoding of a paper CSM feedback form.
router.post(
  '/:id/feedback',
  requireAuth,
  requireRole('personnel', 'support_staff', 'admin'),
  asyncHandler(ClientController.encodeFeedback)
);

router.get(
  '/:id/referral.pdf',
  requireAuth,
  requireRole('lawyer', 'admin'),
  asyncHandler(ClientController.getReferralPdf)
);

export default router;
