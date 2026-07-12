import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as UserService from '../services/userService';
import { sendPasswordReset } from '../services/emailService';
import { CreateUserBody, UpdateUserBody, UserRole, UserSex } from '../types/user';

const ROLE_VALUES: UserRole[] = ['admin', 'lawyer', 'personnel'];
const SEX_VALUES: UserSex[] = ['male', 'female'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function listLawyers(_req: AuthRequest, res: Response) {
  const lawyers = await UserService.listActiveLawyers();
  res.json(lawyers);
}

export async function listUsers(_req: AuthRequest, res: Response) {
  const users = await UserService.listAllUsers();
  res.json(users);
}

export async function createUser(req: AuthRequest, res: Response) {
  const body = req.body as CreateUserBody;

  if (!body.email?.trim()) {
    return res.status(400).json({ message: 'Email address is required' });
  }
  const email = body.email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ message: 'Invalid email address' });
  }
  if (!body.first_name?.trim() || !body.last_name?.trim()) {
    return res.status(400).json({ message: 'First name and last name are required' });
  }
  if (!body.role || !ROLE_VALUES.includes(body.role)) {
    return res.status(400).json({ message: 'A valid role is required' });
  }
  if (body.sex && !SEX_VALUES.includes(body.sex)) {
    return res.status(400).json({ message: 'Invalid sex value' });
  }
  if (await UserService.findByEmailExists(email)) {
    return res.status(409).json({ message: 'An account with this email already exists' });
  }

  const { user, tempPassword } = await UserService.createUser({
    ...body,
    email,
    first_name: body.first_name.trim(),
    last_name: body.last_name.trim(),
  });

  res.status(201).json({ user, tempPassword });
}

export async function updateUser(req: AuthRequest, res: Response) {
  const userId = Number(req.params.id);
  const body = req.body as UpdateUserBody;

  if (body.role && !ROLE_VALUES.includes(body.role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  if (body.email) {
    const email = body.email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    body.email = email;
  }

  const user = await UserService.updateUser(userId, body);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
}

export async function resetTotp(req: AuthRequest, res: Response) {
  const userId = Number(req.params.id);
  const user = await UserService.resetTotp(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
}

export async function resetPassword(req: AuthRequest, res: Response) {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  const result = await UserService.resetPassword(userId);
  if (!result) return res.status(404).json({ message: 'User not found' });

  const { user, tempPassword } = result;

  // The reset is already persisted; if the email fails we still return success so
  // the admin can relay the temporary password shown on screen.
  let emailSent = false;
  try {
    await sendPasswordReset({
      toEmail: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      tempPassword,
    });
    emailSent = true;
  } catch {
    emailSent = false;
  }

  res.json({ user, tempPassword, emailSent });
}
