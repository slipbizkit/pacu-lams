import { Router } from 'express';
import { requireAuth, requireTerminal, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import * as ClientController from '../controllers/clientController';

const router = Router();

// Kiosk-only — requires a valid kiosk token (X-Kiosk-Token header).
router.post('/', requireTerminal, asyncHandler(ClientController.intake));
router.get('/queue-board', requireTerminal, asyncHandler(ClientController.getQueueBoard));

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
router.get('/dashboard', requireAuth, requireRole('personnel', 'lawyer', 'admin', 'director'), asyncHandler(ClientController.getDashboard));
router.get('/dashboard/charts', requireAuth, requireRole('personnel', 'lawyer', 'admin', 'director'), asyncHandler(ClientController.getDashboardCharts));
router.get('/all-history', requireAuth, requireRole('personnel', 'support_staff', 'admin', 'director'), asyncHandler(ClientController.listAllHistory));
// Read-only issue tags for any completed transaction — the Director's view modal
// needs these but, unlike a lawyer, does not own the client (so /mine/:id won't do).
router.get('/:id/issues', requireAuth, requireRole('director', 'admin'), asyncHandler(ClientController.getCompletedIssues));
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

router.get(
  '/:id/referral.pdf',
  requireAuth,
  requireRole('lawyer', 'admin'),
  asyncHandler(ClientController.getReferralPdf)
);

export default router;
