import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as ReportService from '../services/reportService';
import { ReportFilters } from '../types/report';

function parseFilters(query: AuthRequest['query']): ReportFilters {
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  const num = (v: unknown) => {
    const s = str(v);
    return s ? Number(s) : undefined;
  };

  return {
    date_from: str(query.date_from),
    date_to: str(query.date_to),
    lawyer_id: num(query.lawyer_id),
    issue_category_id: num(query.issue_category_id),
    referred_office_id: num(query.referred_office_id),
    sex: str(query.sex),
    city: str(query.city),
    province: str(query.province),
    priority_only: query.priority_only === 'true',
    status: str(query.status),
  };
}

export async function runReport(req: AuthRequest, res: Response) {
  const rows = await ReportService.runReport(parseFilters(req.query));
  res.json(rows);
}

export async function exportExcel(req: AuthRequest, res: Response) {
  const rows = await ReportService.runReport(parseFilters(req.query));
  const buffer = await ReportService.buildExcelBuffer(rows);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="pacu-report-${Date.now()}.xlsx"`);
  res.send(buffer);
}

export async function exportPdf(req: AuthRequest, res: Response) {
  const rows = await ReportService.runReport(parseFilters(req.query));
  const buffer = await ReportService.buildPdfBuffer(rows);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="pacu-report-${Date.now()}.pdf"`);
  res.send(buffer);
}
