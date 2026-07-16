import sql from '../db';

export async function getTerminalPasswordHash(): Promise<string | null> {
  const rows = await sql`SELECT value FROM settings WHERE key = 'terminal_password_hash'`;
  return (rows[0] as { value: string } | undefined)?.value ?? null;
}

export async function setTerminalPasswordHash(hash: string): Promise<void> {
  await sql`
    INSERT INTO settings (key, value) VALUES ('terminal_password_hash', ${hash})
    ON CONFLICT (key) DO UPDATE SET value = ${hash}, updated_at = now()
  `;
}
