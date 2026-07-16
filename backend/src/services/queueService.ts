import sql from '../db';

interface QueueSlot {
  queueNumber: number;
  transactionDate: string;
}

// The PACU office runs on Philippine local time, so the queue day (and its sequential
// numbering) must roll over at Manila midnight — not the database session's UTC midnight.
const PACU_TIMEZONE = 'Asia/Manila';

// Atomic per-day counter: ON CONFLICT DO UPDATE increments in the same statement,
// so concurrent intake submissions never race on the same queue number.
//
// The day is pinned to Manila local time, and Postgres formats the date to text
// (`to_char`) so it comes back as a plain 'YYYY-MM-DD' string. This deliberately avoids
// the neon DATE -> JS Date -> toISOString() round-trip, which rendered the *UTC* calendar
// day and shifted the queue date back by one across the +08:00 boundary.
export async function nextQueueSlot(): Promise<QueueSlot> {
  const rows = await sql`
    INSERT INTO daily_queue_counters (queue_date, last_number)
    VALUES ((now() AT TIME ZONE ${PACU_TIMEZONE}::text)::date, 1)
    ON CONFLICT (queue_date) DO UPDATE SET last_number = daily_queue_counters.last_number + 1
    RETURNING to_char(queue_date, 'YYYY-MM-DD') AS transaction_date, last_number
  `;
  const row = rows[0] as { transaction_date: string; last_number: number };
  return { queueNumber: row.last_number, transactionDate: row.transaction_date };
}

export function buildReferenceNo(transactionDate: string, queueNumber: number): string {
  const dateStr = transactionDate.replace(/-/g, '');
  return `PACU-${dateStr}-${String(queueNumber).padStart(4, '0')}`;
}
