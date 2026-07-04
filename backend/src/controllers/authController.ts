import { Response } from 'express';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { Request } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as AuthService from '../services/authService';
import { signAccessToken, signTempToken, verifyTempToken } from '../utils/jwt';
import { PublicUser } from '../types/user';

function toPublicUser(user: Awaited<ReturnType<typeof AuthService.findByUsername>>): PublicUser {
  const { password_hash, totp_secret, ...publicUser } = user!;
  return publicUser;
}

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const user = await AuthService.findByUsername(username);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

  const tempToken = signTempToken(user.user_id);

  // 2FA is mandatory for every account. A password alone never grants access:
  // accounts with TOTP already enabled must verify a code; accounts without it
  // yet (e.g. fresh from admin creation) are routed through forced setup.
  if (user.totp_enabled) {
    return res.json({ requiresTOTP: true, tempToken });
  }
  return res.json({ requiresTOTPSetup: true, tempToken });
}

export async function verifyTotp(req: Request, res: Response) {
  const { tempToken, code } = req.body;
  if (!tempToken || !code) {
    return res.status(400).json({ message: 'tempToken and code are required' });
  }

  let payload;
  try {
    payload = verifyTempToken(tempToken);
  } catch {
    return res.status(401).json({ message: 'Session expired, please log in again' });
  }

  const user = await AuthService.findById(payload.id);
  if (!user?.totp_enabled || !user.totp_secret) {
    return res.status(400).json({ message: '2FA not enabled' });
  }

  const valid = speakeasy.totp.verify({
    secret: user.totp_secret,
    encoding: 'base32',
    token: code,
    window: 1,
  });
  if (!valid) return res.status(401).json({ message: 'Invalid 2FA code' });

  const token = signAccessToken(user);
  res.json({ token, user: toPublicUser(user) });
}

// Forced first-login setup — authenticated by tempToken (password already
// verified in /login), not a full access token, since the user has none yet.
export async function setupInitPending(req: Request, res: Response) {
  const { tempToken } = req.body;
  if (!tempToken) return res.status(400).json({ message: 'tempToken is required' });

  let payload;
  try {
    payload = verifyTempToken(tempToken);
  } catch {
    return res.status(401).json({ message: 'Session expired, please log in again' });
  }

  const user = await AuthService.findById(payload.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.totp_enabled) return res.status(400).json({ message: '2FA already enabled' });

  const secret = speakeasy.generateSecret({ name: `PACU System (${user.username})`, length: 20 });
  await AuthService.setTotpSecret(user.user_id, secret.base32);

  const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
  res.json({ qrCode, secret: secret.base32 });
}

export async function setupConfirmPending(req: Request, res: Response) {
  const { tempToken, code } = req.body;
  if (!tempToken || !code) {
    return res.status(400).json({ message: 'tempToken and code are required' });
  }

  let payload;
  try {
    payload = verifyTempToken(tempToken);
  } catch {
    return res.status(401).json({ message: 'Session expired, please log in again' });
  }

  const user = await AuthService.findById(payload.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.totp_enabled) return res.status(400).json({ message: '2FA already enabled' });
  if (!user.totp_secret) return res.status(400).json({ message: 'Run setup first' });

  const valid = speakeasy.totp.verify({ secret: user.totp_secret, encoding: 'base32', token: code, window: 1 });
  if (!valid) return res.status(401).json({ message: 'Invalid code' });

  await AuthService.enableTotp(user.user_id);

  const token = signAccessToken(user);
  res.json({ token, user: toPublicUser(user) });
}

export async function setupTotp(req: AuthRequest, res: Response) {
  const user = await AuthService.findById(req.user!.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.totp_enabled) return res.status(400).json({ message: '2FA already enabled' });

  const secret = speakeasy.generateSecret({ name: `PACU System (${user.username})`, length: 20 });
  await AuthService.setTotpSecret(user.user_id, secret.base32);

  const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
  res.json({ qrCode, secret: secret.base32 });
}

export async function enableTotp(req: AuthRequest, res: Response) {
  const { code } = req.body;
  const user = await AuthService.findById(req.user!.id);
  if (!user?.totp_secret) return res.status(400).json({ message: 'Run setup first' });

  const valid = speakeasy.totp.verify({ secret: user.totp_secret, encoding: 'base32', token: code, window: 1 });
  if (!valid) return res.status(401).json({ message: 'Invalid code' });

  await AuthService.enableTotp(user.user_id);
  res.json({ message: '2FA enabled successfully' });
}

export async function disableTotp(req: AuthRequest, res: Response) {
  const { password, code } = req.body;
  const user = await AuthService.findById(req.user!.id);
  if (!user?.totp_enabled || !user.totp_secret) {
    return res.status(400).json({ message: '2FA is not enabled' });
  }

  const validPw = await bcrypt.compare(password, user.password_hash);
  if (!validPw) return res.status(401).json({ message: 'Incorrect password' });

  const validCode = speakeasy.totp.verify({ secret: user.totp_secret, encoding: 'base32', token: code, window: 1 });
  if (!validCode) return res.status(401).json({ message: 'Invalid 2FA code' });

  await AuthService.disableTotp(user.user_id);
  res.json({ message: '2FA disabled' });
}

export async function me(req: AuthRequest, res: Response) {
  const user = await AuthService.findById(req.user!.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(toPublicUser(user));
}
