import jwt from 'jsonwebtoken';
import { AccessTokenPayload, TempTokenPayload, User } from '../types/user';

const JWT_SECRET = process.env.JWT_SECRET!;

export function signAccessToken(user: Pick<User, 'user_id' | 'username' | 'role'>): string {
  const payload = { id: user.user_id, username: user.username, role: user.role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '60m' });
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
