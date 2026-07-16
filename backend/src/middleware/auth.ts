import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, verifyTerminalToken } from '../utils/jwt';
import { AccessTokenPayload, UserRole } from '../types/user';
import * as AuthService from '../services/authService';

export interface AuthRequest extends Request {
  user?: AccessTokenPayload;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid authentication' });
  }

  let payload: AccessTokenPayload;
  try {
    payload = verifyAccessToken(header.slice('Bearer '.length));
  } catch {
    return res.status(401).json({ message: 'Missing or invalid authentication' });
  }

  try {
    const valid = await AuthService.validateSession(payload.jti);
    if (!valid) return res.status(401).json({ message: 'Session has been replaced on another device' });
  } catch {
    // DB error — fail open so a transient Neon hiccup doesn't lock everyone out.
    // The JWT signature check above still guarantees token authenticity.
  }

  req.user = payload;
  next();
}

export function requireTerminal(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-terminal-token'] as string | undefined;
  if (!token) return res.status(401).json({ message: 'Terminal access required' });
  try {
    verifyTerminalToken(token);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired terminal token' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}
