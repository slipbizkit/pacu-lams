import sql from '../db';
import { Client, ConsultationBody, IntakeBody, IssueTag } from '../types/client';
import { nextQueueSlot, buildReferenceNo } from './queueService';

export async function createIntake(body: IntakeBody): Promise<Client> {
  const { queueNumber, transactionDate } = await nextQueueSlot();
  const referenceNo = buildReferenceNo(transactionDate, queueNumber);

  const rows = await sql`
    INSERT INTO clients (
      reference_no, queue_number, transaction_date,
      first_name, middle_name, last_name, suffix, sex, birth_date, civil_status,
      contact_no, email, address, city, province, occupation, employer, concern,
      is_pwd, is_senior, is_pregnant
    ) VALUES (
      ${referenceNo}, ${queueNumber}, ${transactionDate},
      ${body.first_name}, ${body.middle_name ?? null}, ${body.last_name}, ${body.suffix ?? null},
      ${body.sex ?? null}, ${body.birth_date ?? null}, ${body.civil_status ?? null},
      ${body.contact_no ?? null}, ${body.email ?? null}, ${body.address ?? null},
      ${body.city ?? null}, ${body.province ?? null}, ${body.occupation ?? null},
      ${body.employer ?? null}, ${body.concern ?? null},
      ${body.is_pwd ?? false}, ${body.is_senior ?? false}, ${body.is_pregnant ?? false}
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
    SET assigned_lawyer_id = ${lawyerId}, status = 'assigned'
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
    WHERE assigned_lawyer_id = ${lawyerId} AND status IN ('assigned', 'in_progress')
    ORDER BY (is_senior OR is_pwd OR is_pregnant) DESC, transaction_date ASC, queue_number ASC
  `;
  return rows as Client[];
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
  if (current.status !== 'assigned' && current.status !== 'in_progress') {
    return { error: 'not_active' };
  }

  const hasReferral = body.referred_office_id != null;
  if (hasReferral !== (body.referred_reason != null && body.referred_reason.trim() !== '')) {
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

  const newStatus = body.mark_incomplete ? 'in_progress' : 'completed';
  const rows = await sql`
    UPDATE clients
    SET legal_advice = ${body.legal_advice ?? null},
        referred_office_id = ${body.referred_office_id ?? null},
        referred_reason = ${body.referred_reason ?? null},
        status = ${newStatus}
    WHERE client_id = ${clientId} AND assigned_lawyer_id = ${lawyerId}
    RETURNING *
  `;
  return { client: rows[0] as Client };
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

export async function findForReferral(clientId: number): Promise<Client | null> {
  const rows = await sql`SELECT * FROM clients WHERE client_id = ${clientId}`;
  return (rows[0] as Client) ?? null;
}
