import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AccessTokenPayload, UserRole } from '../types/user';

export interface AuthRequest extends Request {
  user?: AccessTokenPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid authentication' });
  }

  try {
    req.user = verifyAccessToken(header.slice('Bearer '.length));
    next();
  } catch {
    return res.status(401).json({ message: 'Missing or invalid authentication' });
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
