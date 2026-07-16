import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { AccessTokenPayload, TerminalTokenPayload, TempTokenPayload, User } from '../types/user';

const JWT_SECRET = process.env.JWT_SECRET!;

export const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;

export function signAccessToken(user: Pick<User, 'user_id' | 'email' | 'role'>): { token: string; jti: string } {
  const jti = randomUUID();
  const payload = { id: user.user_id, email: user.email, role: user.role, jti };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '60m' });
  return { token, jti };
}

export function signTempToken(userId: number): string {
  const payload = { id: userId, pending2FA: true as const };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '5m' });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
}

export function verifyTempToken(token: string): TempTokenPayload {
  return jwt.verify(token, JWT_SECRET) as TempTokenPayload;
}

export function signTerminalToken(): string {
  return jwt.sign({ type: 'terminal' }, JWT_SECRET, { expiresIn: '16h' });
}

export function verifyTerminalToken(token: string): TerminalTokenPayload {
  const payload = jwt.verify(token, JWT_SECRET) as TerminalTokenPayload;
  if (payload.type !== 'terminal') throw new Error('Not a terminal token');
  return payload;
}
