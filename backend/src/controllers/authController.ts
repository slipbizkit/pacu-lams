import { Response } from 'express';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { Request } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as AuthService from '../services/authService';
import { signAccessToken, signTempToken, verifyTempToken } from '../utils/jwt';
import { PublicUser } from '../types/user';

function toPublicUser(user: Awaited<ReturnType<typeof AuthService.findByEmail>>): PublicUser {
  const { password_hash, totp_secret, ...publicUser } = user!;
  return publicUser;
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await AuthService.findByEmail(email);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

  const tempToken = signTempToken(user.user_id);

  // A forced password change takes precedence — the user sets a new password,
  // then continues into 2FA (setup or verify) from that step.
  if (user.must_change_password) {
    return res.json({ requiresPasswordChange: true, tempToken });
  }
  if (user.totp_enabled) {
    return res.json({ requiresTOTP: true, tempToken });
  }
  return res.json({ requiresTOTPSetup: true, tempToken });
}

// Pre-auth forced password change, gated by the tempToken from /login. Clears the
// must_change_password flag, then hands off to the 2FA step the account needs.
export async function changePasswordForced(req: Request, res: Response) {
  const { tempToken, new_password } = req.body;
  if (!tempToken || !new_password) {
    return res.status(400).json({ message: 'tempToken and new_password are required' });
  }
  if (new_password.length < 12) {
    return res.status(400).json({ message: 'New password must be at least 12 characters' });
  }

  let payload;
  try {
    payload = verifyTempToken(tempToken);
  } catch {
    return res.status(401).json({ message: 'Session expired, please log in again' });
  }

  const user = await AuthService.findById(payload.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const sameAsOld = await bcrypt.compare(new_password, user.password_hash);
  if (sameAsOld) {
    return res.status(400).json({ message: 'New password must be different from the temporary password' });
  }

  const hash = await bcrypt.hash(new_password, 12);
  await AuthService.changePassword(user.user_id, hash);

  // Fresh temp token so the follow-on 2FA step gets a full window.
  const nextTempToken = signTempToken(user.user_id);
  if (user.totp_enabled) {
    return res.json({ requiresTOTP: true, tempToken: nextTempToken });
  }
  return res.json({ requiresTOTPSetup: true, tempToken: nextTempToken });
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

  const secret = speakeasy.generateSecret({ name: `PACU System (${user.email})`, length: 20 });
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

  const secret = speakeasy.generateSecret({ name: `PACU System (${user.email})`, length: 20 });
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

export async function changePassword(req: AuthRequest, res: Response) {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ message: 'current_password and new_password are required' });
  }
  if (new_password.length < 12) {
    return res.status(400).json({ message: 'New password must be at least 12 characters' });
  }

  const user = await AuthService.findById(req.user!.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const valid = await bcrypt.compare(current_password, user.password_hash);
  if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });

  const hash = await bcrypt.hash(new_password, 12);
  await AuthService.changePassword(user.user_id, hash);

  res.json({ message: 'Password changed successfully' });
}

export async function refresh(req: AuthRequest, res: Response) {
  const user = await AuthService.findById(req.user!.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const token = signAccessToken(user);
  res.json({ token });
}
