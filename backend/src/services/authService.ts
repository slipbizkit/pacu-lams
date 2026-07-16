import sql from '../db';
import { User } from '../types/user';
import { ACCESS_TOKEN_TTL_MS } from '../utils/jwt';

export async function findByEmail(email: string): Promise<User | null> {
  const rows = await sql`
    SELECT * FROM users WHERE email = ${email.toLowerCase()} AND is_active = TRUE
  `;
  return (rows[0] as User) ?? null;
}

export async function findById(id: number): Promise<User | null> {
  const rows = await sql`SELECT * FROM users WHERE user_id = ${id}`;
  return (rows[0] as User) ?? null;
}

export async function setTotpSecret(userId: number, secret: string): Promise<void> {
  await sql`UPDATE users SET totp_secret = ${secret} WHERE user_id = ${userId}`;
}

export async function enableTotp(userId: number): Promise<void> {
  await sql`UPDATE users SET totp_enabled = TRUE WHERE user_id = ${userId}`;
}

export async function disableTotp(userId: number): Promise<void> {
  await sql`UPDATE users SET totp_enabled = FALSE, totp_secret = NULL WHERE user_id = ${userId}`;
}

export async function changePassword(userId: number, newPasswordHash: string): Promise<void> {
  await sql`
    UPDATE users
    SET password_hash = ${newPasswordHash}, must_change_password = FALSE
    WHERE user_id = ${userId}
  `;
}

// Atomically replace any existing session for this user with a new one.
// Two sequential statements are safe here: the DELETE + INSERT happen within
// the same HTTP connection, and this is the only code path that writes sessions.
export async function upsertSession(userId: number, jti: string): Promise<void> {
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS);
  await sql`DELETE FROM user_sessions WHERE user_id = ${userId}`;
  await sql`INSERT INTO user_sessions (user_id, jti, expires_at) VALUES (${userId}, ${jti}, ${expiresAt})`;
}

export async function validateSession(jti: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM user_sessions WHERE jti = ${jti} AND expires_at > now() LIMIT 1
  `;
  return rows.length > 0;
}

export async function deleteSession(userId: number): Promise<void> {
  await sql`DELETE FROM user_sessions WHERE user_id = ${userId}`;
}
