import sql from '../db';

interface QueueSlot {
  queueNumber: number;
  transactionDate: string;
}

// Atomic per-day counter: ON CONFLICT DO UPDATE increments in the same statement,
// so concurrent intake submissions never race on the same queue number.
export async function nextQueueSlot(): Promise<QueueSlot> {
  const rows = await sql`
    INSERT INTO daily_queue_counters (queue_date, last_number)
    VALUES (CURRENT_DATE, 1)
    ON CONFLICT (queue_date) DO UPDATE SET last_number = daily_queue_counters.last_number + 1
    RETURNING queue_date, last_number
  `;
  const row = rows[0] as { queue_date: string; last_number: number };
  return { queueNumber: row.last_number, transactionDate: row.queue_date };
}

export function buildReferenceNo(transactionDate: string, queueNumber: number): string {
  const dateStr = transactionDate.replace(/-/g, '');
  return `PACU-${dateStr}-${String(queueNumber).padStart(4, '0')}`;
}
