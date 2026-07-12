import sql from '../db';
import { User } from '../types/user';

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
