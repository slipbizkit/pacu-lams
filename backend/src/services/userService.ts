import bcrypt from 'bcryptjs';
import sql from '../db';
import { CreateUserBody, PublicUser, UpdateUserBody } from '../types/user';
import { generateTempPassword } from '../utils/password';

export interface LawyerOption {
  user_id: number;
  first_name: string;
  last_name: string;
}

export async function listActiveLawyers(): Promise<LawyerOption[]> {
  const rows = await sql`
    SELECT user_id, first_name, last_name
    FROM users
    WHERE role = 'lawyer' AND is_active = TRUE
    ORDER BY last_name, first_name
  `;
  return rows as LawyerOption[];
}

export async function listAllUsers(): Promise<PublicUser[]> {
  const rows = await sql`
    SELECT user_id, username, first_name, middle_name, last_name, position, role,
           totp_enabled, is_active, created_at, updated_at
    FROM users
    ORDER BY last_name, first_name
  `;
  return rows as PublicUser[];
}

export async function findByUsernameExists(username: string): Promise<boolean> {
  const rows = await sql`SELECT user_id FROM users WHERE username = ${username.toLowerCase()}`;
  return rows.length > 0;
}

export async function createUser(body: CreateUserBody): Promise<{ user: PublicUser; tempPassword: string }> {
  const tempPassword = generateTempPassword();
  const hash = await bcrypt.hash(tempPassword, 12);

  const rows = await sql`
    INSERT INTO users (username, password_hash, first_name, middle_name, last_name, position, role)
    VALUES (
      ${body.username.toLowerCase()}, ${hash}, ${body.first_name}, ${body.middle_name ?? null},
      ${body.last_name}, ${body.position ?? null}, ${body.role}
    )
    RETURNING user_id, username, first_name, middle_name, last_name, position, role,
              totp_enabled, is_active, created_at, updated_at
  `;
  return { user: rows[0] as PublicUser, tempPassword };
}

export async function updateUser(userId: number, body: UpdateUserBody): Promise<PublicUser | null> {
  const rows = await sql`
    UPDATE users
    SET first_name = COALESCE(${body.first_name ?? null}, first_name),
        middle_name = COALESCE(${body.middle_name ?? null}, middle_name),
        last_name = COALESCE(${body.last_name ?? null}, last_name),
        position = COALESCE(${body.position ?? null}, position),
        role = COALESCE(${body.role ?? null}, role),
        is_active = COALESCE(${body.is_active ?? null}, is_active)
    WHERE user_id = ${userId}
    RETURNING user_id, username, first_name, middle_name, last_name, position, role,
              totp_enabled, is_active, created_at, updated_at
  `;
  return (rows[0] as PublicUser) ?? null;
}

export async function resetTotp(userId: number): Promise<PublicUser | null> {
  const rows = await sql`
    UPDATE users
    SET totp_enabled = FALSE, totp_secret = NULL
    WHERE user_id = ${userId}
    RETURNING user_id, username, first_name, middle_name, last_name, position, role,
              totp_enabled, is_active, created_at, updated_at
  `;
  return (rows[0] as PublicUser) ?? null;
}
