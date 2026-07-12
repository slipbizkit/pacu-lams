import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as ReportService from '../services/reportService';

// Accepts ?month=YYYY-MM; defaults to the current calendar month.
function parseMonth(query: AuthRequest['query']): string {
  const raw = typeof query.month === 'string' ? query.month.trim() : '';
  if (/^\d{4}-\d{2}$/.test(raw)) {
    const m = Number(raw.slice(5));
    if (m >= 1 && m <= 12) return raw;
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function getMonthly(req: AuthRequest, res: Response) {
  const report = await ReportService.getMonthlyReport(parseMonth(req.query));
  res.json(report);
}

export async function exportExcel(req: AuthRequest, res: Response) {
  const report = await ReportService.getMonthlyReport(parseMonth(req.query));
  const buffer = await ReportService.buildExcelBuffer(report);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="pacu-monthly-report-${report.month}.xlsx"`);
  res.send(buffer);
}

export async function exportPdf(req: AuthRequest, res: Response) {
  const report = await ReportService.getMonthlyReport(parseMonth(req.query));
  const buffer = await ReportService.buildPdfBuffer(report);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="pacu-monthly-report-${report.month}.pdf"`);
  res.send(buffer);
}
