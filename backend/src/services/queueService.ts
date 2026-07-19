import sql from '../db';

interface QueueSlot {
  queueNumber: number;
  transactionDate: string;
}

// The PACU office runs on Philippine local time, so the queue day (and its sequential
// numbering) must roll over at Manila midnight — not the database session's UTC midnight.
const PACU_TIMEZONE = 'Asia/Manila';

// Atomic per-month counter: ON CONFLICT DO UPDATE increments in the same statement,
// so concurrent intake submissions never race on the same queue number.
//
// The month and day are both pinned to Manila local time.  The counter key is the
// first day of the current month (so it resets at the start of each new month),
// while the returned transaction_date is today's full date (for the reference number).
export async function nextQueueSlot(): Promise<QueueSlot> {
  const rows = await sql`
    WITH local_now AS (
      SELECT now() AT TIME ZONE ${PACU_TIMEZONE}::text AS ts
    )
    INSERT INTO monthly_queue_counters (queue_month, last_number)
    SELECT date_trunc('month', ts)::date, 1 FROM local_now
    ON CONFLICT (queue_month) DO UPDATE SET last_number = monthly_queue_counters.last_number + 1
    RETURNING
      (SELECT to_char(ts::date, 'YYYY-MM-DD') FROM local_now) AS transaction_date,
      last_number
  `;
  const row = rows[0] as { transaction_date: string; last_number: number };
  return { queueNumber: row.last_number, transactionDate: row.transaction_date };
}

export function buildReferenceNo(transactionDate: string, queueNumber: number): string {
  const dateStr = transactionDate.replace(/-/g, '');
  return `PACU-${dateStr}-${String(queueNumber).padStart(4, '0')}`;
}
