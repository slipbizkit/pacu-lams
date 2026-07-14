import { Response, Request } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as ClientService from '../services/clientService';
import * as LookupService from '../services/lookupService';
import { buildReferralPdf } from '../services/referralPdfService';
import { sendConsultationSummary } from '../services/emailService';
import { ConsultationBody, HistoryFilters, IntakeBody, ClientSex, PendingComplaintType } from '../types/client';
import { FeedbackAnswers, NA_ALLOWED_KEYS, SQD_KEYS, SubmitFeedbackBody } from '../types/feedback';

const SEX_VALUES: ClientSex[] = ['male', 'female'];
const PENDING_COMPLAINT_TYPE_VALUES: PendingComplaintType[] = [
  'NLRC',
  'DOLE Regional/Field Office',
  'NCMB',
  'DMW',
  'OWWA',
  'Others',
];

export async function intake(req: Request, res: Response) {
  const body = req.body as IntakeBody;

  if (body.is_anonymous) {
    if (!body.employer?.trim()) {
      return res.status(400).json({ message: 'Company name is required for anonymous inquiries' });
    }
    if (body.company_city_id == null) {
      return res.status(400).json({ message: 'Company address is required for anonymous inquiries' });
    }
  } else {
    if (!body.first_name?.trim() || !body.last_name?.trim()) {
      return res.status(400).json({ message: 'First name and last name are required' });
    }
  }
  if (body.sex && !SEX_VALUES.includes(body.sex)) {
    return res.status(400).json({ message: 'Invalid sex value' });
  }
  if (
    body.pending_complaint_types &&
    (!Array.isArray(body.pending_complaint_types) ||
      body.pending_complaint_types.some((t) => !PENDING_COMPLAINT_TYPE_VALUES.includes(t)))
  ) {
    return res.status(400).json({ message: 'Invalid pending complaint type value' });
  }
  if (body.city_id != null && !Number.isInteger(body.city_id)) {
    return res.status(400).json({ message: 'Invalid city_id value' });
  }
  if (body.company_city_id != null && !Number.isInteger(body.company_city_id)) {
    return res.status(400).json({ message: 'Invalid company_city_id value' });
  }

  const client = await ClientService.createIntake({
    ...body,
    first_name: body.first_name.trim(),
    last_name: body.last_name.trim(),
  });

  res.status(201).json({
    reference_no: client.reference_no,
    queue_number: client.queue_number,
    transaction_date: client.transaction_date,
  });
}

export async function listQueue(_req: AuthRequest, res: Response) {
  const clients = await ClientService.listWaiting();
  res.json(clients);
}

const ASSIGN_ERROR_RESPONSES: Record<string, { status: number; message: string }> = {
  not_found: { status: 404, message: 'Client not found' },
  not_waiting: { status: 409, message: 'This client is no longer waiting' },
  priority_blocked: {
    status: 409,
    message: 'A priority client (senior, PWD, or pregnant) is still waiting and must be assigned first',
  },
};

export async function assign(req: AuthRequest, res: Response) {
  const clientId = Number(req.params.id);
  const { lawyer_id } = req.body;

  if (!Number.isInteger(clientId) || !Number.isInteger(lawyer_id)) {
    return res.status(400).json({ message: 'lawyer_id is required' });
  }

  const result = await ClientService.assignToLawyer(clientId, lawyer_id);

  if ('error' in result) {
    const { status, message } = ASSIGN_ERROR_RESPONSES[result.error];
    return res.status(status).json({ message });
  }

  res.json(result.client);
}

// A lawyer claims a client for themselves — same underlying atomic priority-enforced
// operation as personnel's /assign, just with lawyer_id fixed to the caller.
export async function claim(req: AuthRequest, res: Response) {
  const clientId = Number(req.params.id);
  if (!Number.isInteger(clientId)) {
    return res.status(400).json({ message: 'Invalid client id' });
  }

  const busy = await ClientService.hasInProgressClient(req.user!.id);
  if (busy) {
    return res.status(409).json({ message: 'LAWYER_IN_PROGRESS' });
  }

  const result = await ClientService.assignToLawyer(clientId, req.user!.id);

  if ('error' in result) {
    const { status, message } = ASSIGN_ERROR_RESPONSES[result.error];
    return res.status(status).json({ message });
  }

  res.json(result.client);
}

export async function listMine(req: AuthRequest, res: Response) {
  const clients = await ClientService.listAssignedToLawyer(req.user!.id);
  res.json(clients);
}

export async function getMine(req: AuthRequest, res: Response) {
  const clientId = Number(req.params.id);
  const client = await ClientService.findAssignedToLawyer(clientId, req.user!.id);
  if (!client) return res.status(404).json({ message: 'Client not found' });

  const issues = await ClientService.getIssueTags(clientId);
  res.json({ client, issues });
}

const CONSULTATION_ERROR_STATUS: Record<string, number> = {
  not_found: 404,
  not_active: 409,
  validation: 400,
};

export async function saveConsultation(req: AuthRequest, res: Response) {
  const clientId = Number(req.params.id);
  const body = req.body as ConsultationBody;

  if (!Number.isInteger(clientId) || !Array.isArray(body.issue_category_ids)) {
    return res.status(400).json({ message: 'issue_category_ids is required' });
  }

  const result = await ClientService.saveConsultation(clientId, req.user!.id, body);

  if ('error' in result) {
    const status = CONSULTATION_ERROR_STATUS[result.error];
    return res.status(status).json({ message: result.message ?? 'Could not save consultation' });
  }

  res.json(result.client);
}

export async function removeFromQueue(req: AuthRequest, res: Response) {
  const clientId = Number(req.params.id);
  const { reason } = req.body as { reason?: string };

  if (!Number.isInteger(clientId)) {
    return res.status(400).json({ message: 'Invalid client id' });
  }
  if (!reason?.trim()) {
    return res.status(400).json({ message: 'Removal reason is required' });
  }

  const result = await ClientService.removeFromQueue(clientId, reason.trim(), req.user!.id);

  if ('error' in result) {
    const status = result.error === 'not_found' ? 404 : 409;
    return res.status(status).json({ message: result.error === 'not_found' ? 'Client not found' : 'Client is no longer waiting in the queue' });
  }

  res.json(result.client);
}

export async function getSupportStaffDashboard(_req: AuthRequest, res: Response) {
  const data = await ClientService.getSupportStaffDashboard();
  res.json(data);
}

export async function getDashboard(req: AuthRequest, res: Response) {
  const data = await ClientService.getDashboard(req.user!.id, req.user!.role);
  res.json(data);
}

export async function getDashboardCharts(req: AuthRequest, res: Response) {
  const data = await ClientService.getDashboardCharts(req.user!.id, req.user!.role);
  res.json(data);
}

export async function listAllHistory(req: AuthRequest, res: Response) {
  const filters: HistoryFilters = {
    search: typeof req.query.search === 'string' ? req.query.search : undefined,
    date_from: typeof req.query.date_from === 'string' ? req.query.date_from : undefined,
    date_to: typeof req.query.date_to === 'string' ? req.query.date_to : undefined,
  };
  const history = await ClientService.listAllCompleted(filters);
  res.json(history);
}

export async function listCancelled(req: AuthRequest, res: Response) {
  const filters: HistoryFilters = {
    search: typeof req.query.search === 'string' ? req.query.search : undefined,
  };
  const clients = await ClientService.listCancelledByLawyer(req.user!.id, filters);
  res.json(clients);
}

export async function restoreToQueue(req: AuthRequest, res: Response) {
  const clientId = Number(req.params.id);
  if (!Number.isInteger(clientId)) return res.status(400).json({ message: 'Invalid client id' });

  const result = await ClientService.restoreToQueue(clientId);
  if ('error' in result) {
    const status = result.error === 'not_found' ? 404 : 409;
    return res.status(status).json({ message: result.error === 'not_found' ? 'Client not found' : 'Client is not in a cancelled state' });
  }
  res.json(result.client);
}

export async function listAllCancelled(req: AuthRequest, res: Response) {
  const filters: HistoryFilters = {
    search: typeof req.query.search === 'string' ? req.query.search : undefined,
    date_from: typeof req.query.date_from === 'string' ? req.query.date_from : undefined,
    date_to: typeof req.query.date_to === 'string' ? req.query.date_to : undefined,
  };
  const clients = await ClientService.listAllCancelled(filters);
  res.json(clients);
}

export async function cancelTransaction(req: AuthRequest, res: Response) {
  const clientId = Number(req.params.id);
  const { reason } = req.body as { reason?: string };

  if (!Number.isInteger(clientId)) {
    return res.status(400).json({ message: 'Invalid client id' });
  }
  if (!reason?.trim()) {
    return res.status(400).json({ message: 'Cancellation reason is required' });
  }

  const result = await ClientService.cancelTransaction(clientId, req.user!.id, reason.trim());

  if ('error' in result) {
    const status = result.error === 'not_found' ? 404 : 409;
    return res.status(status).json({ message: result.error === 'not_found' ? 'Client not found' : 'Transaction cannot be cancelled in its current state' });
  }

  res.json(result.client);
}

// Public — no auth. A client checks their own reference_no to see if feedback is open.
export async function getFeedbackStatus(req: Request, res: Response) {
  const referenceNo = req.params.referenceNo;
  const client = await ClientService.findByReferenceNo(referenceNo);
  if (!client) return res.status(404).json({ message: 'Reference number not found' });

  res.json({
    first_name: client.first_name,
    status: client.status,
    already_submitted: await ClientService.hasFeedback(client.client_id),
  });
}

const FEEDBACK_ERROR_RESPONSES: Record<string, { status: number; message: string }> = {
  not_found: { status: 404, message: 'Reference number not found' },
  not_completed: { status: 409, message: 'This transaction is not completed yet' },
  already_submitted: { status: 409, message: 'Feedback has already been submitted for this transaction' },
};

// Validate the CSM answer set. Every SQD item must be a whole number 1-5, except the
// items in NA_ALLOWED_KEYS which may also be null ("Not Applicable"). Returns the
// normalised answers, or an error message.
function parseFeedbackAnswers(body: SubmitFeedbackBody): { answers: FeedbackAnswers } | { error: string } {
  if (!body || typeof body !== 'object' || !body.answers || typeof body.answers !== 'object') {
    return { error: 'Feedback answers are required' };
  }
  const answers = {} as FeedbackAnswers;
  for (const key of SQD_KEYS) {
    const value = body.answers[key];
    if (value === null || value === undefined) {
      if (NA_ALLOWED_KEYS.includes(key)) {
        answers[key] = null;
        continue;
      }
      return { error: `Please answer every question (missing ${key})` };
    }
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      return { error: 'Each answer must be a whole number from 1 to 5' };
    }
    answers[key] = value;
  }
  return { answers };
}

// Public — no auth. Answers/comments are the client's own words about their own visit.
export async function submitFeedback(req: Request, res: Response) {
  const referenceNo = req.params.referenceNo;
  const parsed = parseFeedbackAnswers(req.body as SubmitFeedbackBody);
  if ('error' in parsed) return res.status(400).json({ message: parsed.error });

  const comments = (req.body as SubmitFeedbackBody).comments?.trim() || null;
  const result = await ClientService.submitFeedbackByReferenceNo(referenceNo, parsed.answers, comments);

  if ('error' in result) {
    const { status, message } = FEEDBACK_ERROR_RESPONSES[result.error];
    return res.status(status).json({ message });
  }

  res.json({ message: 'Thank you for your feedback' });
}

// Authed — support staff / personnel / admin encode a paper feedback form.
export async function encodeFeedback(req: AuthRequest, res: Response) {
  const clientId = Number(req.params.id);
  if (!Number.isInteger(clientId)) {
    return res.status(400).json({ message: 'Invalid client id' });
  }

  const parsed = parseFeedbackAnswers(req.body as SubmitFeedbackBody);
  if ('error' in parsed) return res.status(400).json({ message: parsed.error });

  const comments = (req.body as SubmitFeedbackBody).comments?.trim() || null;
  const result = await ClientService.submitFeedbackByClientId(clientId, parsed.answers, comments, req.user!.id);

  if ('error' in result) {
    const errorResponses: Record<string, { status: number; message: string }> = {
      ...FEEDBACK_ERROR_RESPONSES,
      not_found: { status: 404, message: 'Transaction not found' },
    };
    const { status, message } = errorResponses[result.error];
    return res.status(status).json({ message });
  }

  res.json({ message: 'Feedback recorded', feedback: result.feedback });
}

export async function listHistory(req: AuthRequest, res: Response) {
  const filters: HistoryFilters = {
    date_from: typeof req.query.date_from === 'string' ? req.query.date_from : undefined,
    date_to: typeof req.query.date_to === 'string' ? req.query.date_to : undefined,
    search: typeof req.query.search === 'string' ? req.query.search : undefined,
  };
  const history = await ClientService.listCompletedByLawyer(req.user!.id, filters);
  res.json(history);
}

export async function sendEmail(req: AuthRequest, res: Response) {
  const clientId = Number(req.params.id);
  if (!Number.isInteger(clientId)) {
    return res.status(400).json({ message: 'Invalid client id' });
  }

  const client = await ClientService.findForReferral(clientId);
  if (!client) return res.status(404).json({ message: 'Client not found' });

  if (client.assigned_lawyer_id !== req.user!.id) {
    return res.status(403).json({ message: 'You can only send emails for your own clients' });
  }
  if (client.status !== 'completed') {
    return res.status(409).json({ message: 'Transaction is not completed' });
  }
  if (!client.email) {
    return res.status(409).json({ message: 'Client has no email address on file' });
  }
  if (!client.legal_advice) {
    return res.status(409).json({ message: 'No legal advice recorded for this transaction' });
  }

  const referredOffice = client.referred_office_id
    ? await LookupService.findReferredOfficeById(client.referred_office_id)
    : null;

  await sendConsultationSummary({
    toEmail: client.email,
    firstName: client.first_name,
    lastName: client.last_name,
    referenceNo: client.reference_no,
    transactionDate: client.transaction_date,
    legalAdvice: client.legal_advice,
    referredOfficeName: referredOffice?.office_name ?? null,
    referredReason: client.referred_reason,
  });

  await ClientService.markEmailSent(clientId);
  const sentAt = new Date().toISOString();

  res.json({ message: 'Email sent successfully', email_sent_at: sentAt });
}

// Referral PDF — admin can access any client's; a lawyer only their own.
export async function getReferralPdf(req: AuthRequest, res: Response) {
  const clientId = Number(req.params.id);
  if (!Number.isInteger(clientId)) {
    return res.status(400).json({ message: 'Invalid client id' });
  }

  const client = await ClientService.findForReferral(clientId);
  if (!client) return res.status(404).json({ message: 'Client not found' });

  if (req.user!.role === 'lawyer' && client.assigned_lawyer_id !== req.user!.id) {
    return res.status(403).json({ message: 'You can only access referral forms for your own clients' });
  }
  if (!client.referred_office_id) {
    return res.status(400).json({ message: 'This client has no referral on file' });
  }

  const office = await LookupService.findReferredOfficeById(client.referred_office_id);
  const issues = await ClientService.getIssueTags(clientId);
  const pdf = await buildReferralPdf({ client, officeName: office?.office_name ?? 'Unknown office', issues });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="referral-${client.reference_no}.pdf"`);
  res.send(pdf);
}
