import sql from '../db';
import { Client, CompletedTransaction, ConsultationBody, HistoryFilters, IntakeBody, IssueTag } from '../types/client';
import { nextQueueSlot, buildReferenceNo } from './queueService';
import { findReferredOfficeById } from './lookupService';
import { sendConsultationSummary } from './emailService';

export async function createIntake(body: IntakeBody): Promise<Client> {
  const { queueNumber, transactionDate } = await nextQueueSlot();
  const referenceNo = buildReferenceNo(transactionDate, queueNumber);

  const rows = await sql`
    INSERT INTO clients (
      reference_no, queue_number, transaction_date,
      first_name, middle_name, last_name, suffix, sex,
      contact_no, email, city_id, occupation, employer,
      date_of_employment, union_member, company_city_id, pending_complaint_types,
      is_pwd, is_senior, is_pregnant, is_anonymous
    ) VALUES (
      ${referenceNo}, ${queueNumber}, ${transactionDate},
      ${body.first_name}, ${body.middle_name ?? null}, ${body.last_name}, ${body.suffix ?? null},
      ${body.sex ?? null},
      ${body.contact_no ?? null}, ${body.email ?? null}, ${body.city_id ?? null},
      ${body.occupation ?? null}, ${body.employer ?? null},
      ${body.date_of_employment || null}, ${body.union_member ?? null}, ${body.company_city_id ?? null},
      ${body.pending_complaint_types ?? null},
      ${body.is_pwd ?? false}, ${body.is_senior ?? false}, ${body.is_pregnant ?? false}, ${body.is_anonymous ?? false}
    )
    RETURNING *
  `;
  return rows[0] as Client;
}

// Priority clients (senior / PWD / pregnant) first, then FIFO by queue number.
export async function listWaiting(): Promise<Client[]> {
  const rows = await sql`
    SELECT * FROM clients
    WHERE status = 'waiting'
    ORDER BY (is_senior OR is_pwd OR is_pregnant) DESC, transaction_date ASC, queue_number ASC
  `;
  return rows as Client[];
}

export async function findWaitingById(clientId: number): Promise<Client | null> {
  const rows = await sql`SELECT * FROM clients WHERE client_id = ${clientId}`;
  return (rows[0] as Client) ?? null;
}

export type AssignFailureReason = 'not_found' | 'not_waiting' | 'priority_blocked';

export async function assignToLawyer(
  clientId: number,
  lawyerId: number
): Promise<{ client: Client } | { error: AssignFailureReason }> {
  // Single atomic statement: only assigns if the target is still 'waiting' AND either it
  // is itself a priority client, or no other priority client is still waiting. Concurrent
  // requests can't race past this check the way a separate read-then-write could.
  const rows = await sql`
    UPDATE clients
    SET assigned_lawyer_id = ${lawyerId}, status = 'in_progress'
    WHERE client_id = ${clientId}
      AND status = 'waiting'
      AND (
        is_senior OR is_pwd OR is_pregnant
        OR NOT EXISTS (
          SELECT 1 FROM clients c2
          WHERE c2.status = 'waiting'
            AND c2.client_id <> ${clientId}
            AND (c2.is_senior OR c2.is_pwd OR c2.is_pregnant)
        )
      )
    RETURNING *
  `;

  if (rows.length > 0) {
    return { client: rows[0] as Client };
  }

  const current = await findWaitingById(clientId);
  if (!current) return { error: 'not_found' };
  if (current.status !== 'waiting') return { error: 'not_waiting' };
  return { error: 'priority_blocked' };
}

// Clients this lawyer is actively working, including ones saved as incomplete —
// this is where an incomplete transaction reappears to be finished later.
export async function listAssignedToLawyer(lawyerId: number): Promise<Client[]> {
  const rows = await sql`
    SELECT * FROM clients
    WHERE assigned_lawyer_id = ${lawyerId} AND status IN ('assigned', 'in_progress', 'incomplete')
    ORDER BY (is_senior OR is_pwd OR is_pregnant) DESC, transaction_date ASC, queue_number ASC
  `;
  return rows as Client[];
}

export async function hasInProgressClient(lawyerId: number): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM clients
    WHERE assigned_lawyer_id = ${lawyerId} AND status = 'in_progress'
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function findAssignedToLawyer(clientId: number, lawyerId: number): Promise<Client | null> {
  const rows = await sql`
    SELECT * FROM clients
    WHERE client_id = ${clientId} AND assigned_lawyer_id = ${lawyerId}
  `;
  return (rows[0] as Client) ?? null;
}

export async function getIssueTags(clientId: number): Promise<IssueTag[]> {
  const rows = await sql`
    SELECT ic.category_id, ic.category_group, ic.category_name, ci.issue_description
    FROM client_issues ci
    JOIN issue_categories ic ON ic.category_id = ci.category_id
    WHERE ci.client_id = ${clientId}
    ORDER BY ic.category_group, ic.category_name
  `;
  return rows as IssueTag[];
}

export type ConsultationFailureReason = 'not_found' | 'not_active' | 'validation';

export async function saveConsultation(
  clientId: number,
  lawyerId: number,
  body: ConsultationBody
): Promise<{ client: Client } | { error: ConsultationFailureReason; message?: string }> {
  const current = await findAssignedToLawyer(clientId, lawyerId);
  if (!current) return { error: 'not_found' };
  if (current.status !== 'assigned' && current.status !== 'in_progress' && current.status !== 'incomplete') {
    return { error: 'not_active' };
  }

  const hasReferral = body.referred_office_id != null;
  if (!body.mark_incomplete && hasReferral !== (body.referred_reason != null && body.referred_reason.trim() !== '')) {
    return { error: 'validation', message: 'Referral office and reason must be provided together' };
  }

  if (!body.mark_incomplete) {
    if (!body.legal_advice?.trim()) {
      return { error: 'validation', message: 'Legal advice is required to complete the transaction' };
    }
    if (body.issue_category_ids.length === 0) {
      return { error: 'validation', message: 'At least one issue category is required to complete the transaction' };
    }
  }

  // Replace tagged issues wholesale — simpler and safer than diffing for a single-lawyer,
  // single-client edit with no concurrent writers.
  await sql`DELETE FROM client_issues WHERE client_id = ${clientId}`;
  for (const categoryId of body.issue_category_ids) {
    await sql`
      INSERT INTO client_issues (client_id, category_id, issue_description)
      VALUES (${clientId}, ${categoryId}, ${body.issue_description ?? null})
    `;
  }

  const newStatus = body.mark_incomplete ? 'incomplete' : 'completed';
  const rows = await sql`
    UPDATE clients
    SET legal_advice = ${body.legal_advice ?? null},
        referred_office_id = ${body.referred_office_id ?? null},
        referred_reason = ${body.referred_reason ?? null},
        status = ${newStatus}
    WHERE client_id = ${clientId} AND assigned_lawyer_id = ${lawyerId}
    RETURNING *
  `;
  const client = rows[0] as Client;

  if (newStatus === 'completed' && client.email && client.legal_advice) {
    const referredOffice = client.referred_office_id
      ? await findReferredOfficeById(client.referred_office_id)
      : null;

    sendConsultationSummary({
      toEmail: client.email,
      firstName: client.first_name,
      lastName: client.last_name,
      referenceNo: client.reference_no,
      transactionDate: client.transaction_date,
      legalAdvice: client.legal_advice,
      referredOfficeName: referredOffice?.office_name ?? null,
      referredReason: client.referred_reason,
    })
      .then(() => markEmailSent(client.client_id))
      .catch((err) => console.error('[email] Failed to send consultation summary:', err));
  }

  return { client };
}

export async function removeFromQueue(
  clientId: number,
  reason: string,
  removedById: number
): Promise<{ client: Client } | { error: 'not_found' | 'not_waiting' }> {
  const rows = await sql`
    UPDATE clients
    SET status = 'cancelled', cancellation_reason = ${reason}, removed_by = ${removedById}
    WHERE client_id = ${clientId} AND status = 'waiting'
    RETURNING *
  `;
  if (rows.length > 0) return { client: rows[0] as Client };

  const current = await findWaitingById(clientId);
  if (!current) return { error: 'not_found' };
  return { error: 'not_waiting' };
}

export interface ActivityItem {
  client_id: number;
  first_name: string;
  last_name: string;
  queue_number: number;
  status: string;
  updated_at: string;
  cancellation_reason: string | null;
  lawyer_name: string | null;
}

export async function getSupportStaffDashboard(): Promise<{
  stats: { waiting: number; served_today: number; removed_today: number };
  queue: Client[];
  recent_activity: ActivityItem[];
}> {
  const [statsRows, queueRows, activityRows] = await Promise.all([
    sql`
      SELECT
        (SELECT COUNT(*)::int FROM clients WHERE status = 'waiting') AS waiting,
        (SELECT COUNT(*)::int FROM clients WHERE status = 'completed' AND updated_at::date = CURRENT_DATE) AS served_today,
        (SELECT COUNT(*)::int FROM clients WHERE status = 'cancelled' AND removed_by IS NOT NULL AND updated_at::date = CURRENT_DATE) AS removed_today
    `,
    sql`
      SELECT * FROM clients
      WHERE status = 'waiting'
      ORDER BY (is_senior OR is_pwd OR is_pregnant) DESC, transaction_date ASC, queue_number ASC
      LIMIT 10
    `,
    sql`
      SELECT c.client_id, c.first_name, c.last_name, c.queue_number, c.status,
             c.updated_at, c.cancellation_reason,
             CASE WHEN u.user_id IS NOT NULL THEN u.first_name || ' ' || u.last_name ELSE NULL END AS lawyer_name
      FROM clients c
      LEFT JOIN users u ON u.user_id = c.assigned_lawyer_id
      WHERE c.updated_at::date = CURRENT_DATE
        AND c.status IN ('completed', 'cancelled')
      ORDER BY c.updated_at DESC
      LIMIT 10
    `,
  ]);

  return {
    stats: statsRows[0] as { waiting: number; served_today: number; removed_today: number },
    queue: queueRows as Client[],
    recent_activity: activityRows as ActivityItem[],
  };
}

export interface DashboardData {
  queue: {
    waiting: number;
    priority_waiting: number;
    in_progress: number;
    incomplete: number;
    completed_today: number;
    cancelled_today: number;
  };
  my?: {
    in_progress: number;
    incomplete: number;
    completed_today: number;
    completed_this_month: number;
  };
}

export async function getDashboard(userId: number, role: string): Promise<DashboardData> {
  const [queueStats] = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM clients WHERE status = 'waiting') AS waiting,
      (SELECT COUNT(*)::int FROM clients WHERE status = 'waiting' AND (is_senior OR is_pwd OR is_pregnant)) AS priority_waiting,
      (SELECT COUNT(*)::int FROM clients WHERE status IN ('assigned', 'in_progress')) AS in_progress,
      (SELECT COUNT(*)::int FROM clients WHERE status = 'incomplete') AS incomplete,
      (SELECT COUNT(*)::int FROM clients WHERE status = 'completed' AND updated_at::date = CURRENT_DATE) AS completed_today,
      (SELECT COUNT(*)::int FROM clients WHERE status = 'cancelled' AND updated_at::date = CURRENT_DATE) AS cancelled_today
  `;

  const result: DashboardData = { queue: queueStats as DashboardData['queue'] };

  if (role === 'lawyer') {
    const [myStats] = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM clients WHERE assigned_lawyer_id = ${userId} AND status = 'in_progress') AS in_progress,
        (SELECT COUNT(*)::int FROM clients WHERE assigned_lawyer_id = ${userId} AND status = 'incomplete') AS incomplete,
        (SELECT COUNT(*)::int FROM clients WHERE assigned_lawyer_id = ${userId} AND status = 'completed' AND updated_at::date = CURRENT_DATE) AS completed_today,
        (SELECT COUNT(*)::int FROM clients WHERE assigned_lawyer_id = ${userId} AND status = 'completed' AND DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', CURRENT_DATE)) AS completed_this_month
    `;
    result.my = myStats as DashboardData['my'];
  }

  return result;
}

export interface DashboardCharts {
  daily: { date: string; count: number }[];
  categories?: { name: string; count: number }[];
}

export async function getDashboardCharts(userId: number, role: string): Promise<DashboardCharts> {
  const dailyRows = role === 'lawyer'
    ? await sql`
        SELECT gs.day::date AS date, COALESCE(cnt, 0)::int AS count
        FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, '1 day'::interval) gs(day)
        LEFT JOIN (
          SELECT transaction_date, COUNT(*)::int AS cnt
          FROM clients
          WHERE status = 'completed' AND assigned_lawyer_id = ${userId}
            AND transaction_date >= CURRENT_DATE - 13
          GROUP BY transaction_date
        ) counts ON counts.transaction_date = gs.day::date
        ORDER BY gs.day
      `
    : await sql`
        SELECT gs.day::date AS date, COALESCE(cnt, 0)::int AS count
        FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, '1 day'::interval) gs(day)
        LEFT JOIN (
          SELECT transaction_date, COUNT(*)::int AS cnt
          FROM clients
          WHERE status = 'completed'
            AND transaction_date >= CURRENT_DATE - 13
          GROUP BY transaction_date
        ) counts ON counts.transaction_date = gs.day::date
        ORDER BY gs.day
      `;

  const result: DashboardCharts = { daily: dailyRows as DashboardCharts['daily'] };

  if (role === 'lawyer' || role === 'admin') {
    const catRows = role === 'lawyer'
      ? await sql`
          SELECT ic.category_name AS name, COUNT(*)::int AS count
          FROM client_issues ci
          JOIN issue_categories ic ON ic.category_id = ci.category_id
          JOIN clients c ON c.client_id = ci.client_id
          WHERE c.status = 'completed' AND c.assigned_lawyer_id = ${userId}
          GROUP BY ic.category_name
          ORDER BY count DESC
          LIMIT 10
        `
      : await sql`
          SELECT ic.category_name AS name, COUNT(*)::int AS count
          FROM client_issues ci
          JOIN issue_categories ic ON ic.category_id = ci.category_id
          JOIN clients c ON c.client_id = ci.client_id
          WHERE c.status = 'completed'
          GROUP BY ic.category_name
          ORDER BY count DESC
          LIMIT 10
        `;
    result.categories = catRows as DashboardCharts['categories'];
  }

  return result;
}

export async function listAllCompleted(filters: HistoryFilters): Promise<CompletedTransaction[]> {
  const searchLike = filters.search?.trim() ? `%${filters.search.trim()}%` : null;

  const rows = await sql`
    SELECT
      c.*,
      cm.city_municipality AS city,
      cm.province AS province,
      cm2.city_municipality AS company_city,
      MAX(ro.office_name) AS referred_office_name,
      STRING_AGG(ic.category_name, ', ' ORDER BY ic.category_name) AS issue_categories,
      MAX(u.first_name || ' ' || u.last_name) AS lawyer_name
    FROM clients c
    LEFT JOIN cities_municipalities cm ON cm.id = c.city_id
    LEFT JOIN cities_municipalities cm2 ON cm2.id = c.company_city_id
    LEFT JOIN referred_offices ro ON ro.office_id = c.referred_office_id
    LEFT JOIN client_issues ci ON ci.client_id = c.client_id
    LEFT JOIN issue_categories ic ON ic.category_id = ci.category_id
    LEFT JOIN users u ON u.user_id = c.assigned_lawyer_id
    WHERE c.status = 'completed'
      AND (
        ${searchLike}::text IS NULL
        OR c.first_name ILIKE ${searchLike}::text
        OR c.last_name ILIKE ${searchLike}::text
        OR (c.first_name || ' ' || c.last_name) ILIKE ${searchLike}::text
        OR c.employer ILIKE ${searchLike}::text
      )
    GROUP BY c.client_id, cm.city_municipality, cm.province, cm2.city_municipality
    ORDER BY c.updated_at DESC
  `;
  return rows as CompletedTransaction[];
}

export async function listCancelledByLawyer(
  lawyerId: number,
  filters: HistoryFilters
): Promise<Client[]> {
  const searchLike = filters.search?.trim() ? `%${filters.search.trim()}%` : null;

  const rows = await sql`
    SELECT * FROM clients
    WHERE assigned_lawyer_id = ${lawyerId}
      AND status = 'cancelled'
      AND (
        ${searchLike}::text IS NULL
        OR first_name ILIKE ${searchLike}::text
        OR last_name ILIKE ${searchLike}::text
        OR (first_name || ' ' || last_name) ILIKE ${searchLike}::text
      )
    ORDER BY updated_at DESC
  `;
  return rows as Client[];
}

export async function cancelTransaction(
  clientId: number,
  lawyerId: number,
  reason: string
): Promise<{ client: Client } | { error: 'not_found' | 'not_active' }> {
  const rows = await sql`
    UPDATE clients
    SET status = 'cancelled', cancellation_reason = ${reason}
    WHERE client_id = ${clientId}
      AND assigned_lawyer_id = ${lawyerId}
      AND status IN ('in_progress', 'incomplete')
    RETURNING *
  `;
  if (rows.length > 0) return { client: rows[0] as Client };

  const current = await findAssignedToLawyer(clientId, lawyerId);
  if (!current) return { error: 'not_found' };
  return { error: 'not_active' };
}

export async function findByReferenceNo(referenceNo: string): Promise<Client | null> {
  const rows = await sql`SELECT * FROM clients WHERE reference_no = ${referenceNo}`;
  return (rows[0] as Client) ?? null;
}

export type FeedbackFailureReason = 'not_found' | 'not_completed' | 'already_submitted';

export async function submitFeedback(
  referenceNo: string,
  rating: number,
  comments: string | null
): Promise<{ client: Client } | { error: FeedbackFailureReason }> {
  // Single atomic statement mirrors the assign/claim pattern: only writes if the
  // transaction is completed and feedback hasn't already been recorded.
  const rows = await sql`
    UPDATE clients
    SET feedback_rating = ${rating}, feedback_comments = ${comments}
    WHERE reference_no = ${referenceNo}
      AND status = 'completed'
      AND feedback_rating IS NULL
    RETURNING *
  `;
  if (rows.length > 0) return { client: rows[0] as Client };

  const current = await findByReferenceNo(referenceNo);
  if (!current) return { error: 'not_found' };
  if (current.status !== 'completed') return { error: 'not_completed' };
  return { error: 'already_submitted' };
}

export async function listCompletedByLawyer(
  lawyerId: number,
  filters: HistoryFilters
): Promise<CompletedTransaction[]> {
  const dateFrom = filters.date_from || null;
  const dateTo = filters.date_to || null;
  const searchLike = filters.search?.trim() ? `%${filters.search.trim()}%` : null;

  const rows = await sql`
    SELECT
      c.*,
      cm.city_municipality AS city,
      cm.province AS province,
      cm2.city_municipality AS company_city,
      MAX(ro.office_name) AS referred_office_name,
      STRING_AGG(ic.category_name, ', ' ORDER BY ic.category_name) AS issue_categories
    FROM clients c
    LEFT JOIN cities_municipalities cm ON cm.id = c.city_id
    LEFT JOIN cities_municipalities cm2 ON cm2.id = c.company_city_id
    LEFT JOIN referred_offices ro ON ro.office_id = c.referred_office_id
    LEFT JOIN client_issues ci ON ci.client_id = c.client_id
    LEFT JOIN issue_categories ic ON ic.category_id = ci.category_id
    WHERE c.assigned_lawyer_id = ${lawyerId}
      AND c.status = 'completed'
      AND (${dateFrom}::date IS NULL OR c.updated_at::date >= ${dateFrom}::date)
      AND (${dateTo}::date IS NULL OR c.updated_at::date <= ${dateTo}::date)
      AND (
        ${searchLike}::text IS NULL
        OR c.first_name ILIKE ${searchLike}::text
        OR c.last_name ILIKE ${searchLike}::text
        OR (c.first_name || ' ' || c.last_name) ILIKE ${searchLike}::text
        OR c.employer ILIKE ${searchLike}::text
      )
    GROUP BY c.client_id, cm.city_municipality, cm.province, cm2.city_municipality
    ORDER BY c.updated_at DESC
  `;
  return rows as CompletedTransaction[];
}

export async function findForReferral(clientId: number): Promise<Client | null> {
  const rows = await sql`SELECT * FROM clients WHERE client_id = ${clientId}`;
  return (rows[0] as Client) ?? null;
}

export async function markEmailSent(clientId: number): Promise<void> {
  await sql`UPDATE clients SET email_sent_at = NOW() WHERE client_id = ${clientId}`;
}
