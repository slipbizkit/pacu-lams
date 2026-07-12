import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import * as ReportController from '../controllers/reportController';

const router = Router();

router.get('/', requireAuth, requireRole('admin'), asyncHandler(ReportController.getMonthly));
router.get('/export.xlsx', requireAuth, requireRole('admin'), asyncHandler(ReportController.exportExcel));
router.get('/export.pdf', requireAuth, requireRole('admin'), asyncHandler(ReportController.exportPdf));

export default router;
