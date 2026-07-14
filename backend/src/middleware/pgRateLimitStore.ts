import type { Store, Options, ClientRateLimitInfo } from 'express-rate-limit';
import sql from '../db';

/**
 * Rate-limit counters backed by Neon rather than memory.
 *
 * The default MemoryStore is per-process, and the backend runs on Vercel: counters
 * vanish on cold start and are not shared between concurrent lambda instances, so a
 * brute-force attempt could simply be spread across instances. Persisting the
 * counter makes the limit mean something.
 */
export class PostgresRateLimitStore implements Store {
  private windowMs = 60_000;

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  /**
   * One statement, so concurrent lambdas can't interleave a read and a write and
   * lose hits. The row doubles as its own expiry: once `expires_at` has passed the
   * upsert resets the count to 1 and opens a fresh window, which means expired rows
   * never need to be read out — only swept.
   */
  async increment(key: string): Promise<ClientRateLimitInfo> {
    const rows = await sql`
      INSERT INTO rate_limit_hits (key, hits, expires_at)
      VALUES (${key}, 1, NOW() + ${this.windowMs} * INTERVAL '1 millisecond')
      ON CONFLICT (key) DO UPDATE
      SET hits = CASE
                   WHEN rate_limit_hits.expires_at <= NOW() THEN 1
                   ELSE rate_limit_hits.hits + 1
                 END,
          expires_at = CASE
                         WHEN rate_limit_hits.expires_at <= NOW()
                           THEN NOW() + ${this.windowMs} * INTERVAL '1 millisecond'
                         ELSE rate_limit_hits.expires_at
                       END
      RETURNING hits, expires_at
    `;

    const row = rows[0] as { hits: number; expires_at: string };
    return { totalHits: row.hits, resetTime: new Date(row.expires_at) };
  }

  async decrement(key: string): Promise<void> {
    await sql`
      UPDATE rate_limit_hits
      SET hits = GREATEST(hits - 1, 0)
      WHERE key = ${key} AND expires_at > NOW()
    `;
  }

  async resetKey(key: string): Promise<void> {
    await sql`DELETE FROM rate_limit_hits WHERE key = ${key}`;
  }

  /**
   * Opportunistic sweep of expired rows. Stale rows are already harmless (the upsert
   * treats them as a fresh window), so this is purely to stop the table growing
   * without bound — hence best-effort, and never on the request path's critical
   * result.
   */
  async resetAll(): Promise<void> {
    await sql`DELETE FROM rate_limit_hits WHERE expires_at <= NOW()`;
  }
}
