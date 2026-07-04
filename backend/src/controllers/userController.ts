import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as UserService from '../services/userService';
import { CreateUserBody, UpdateUserBody, UserRole } from '../types/user';

const ROLE_VALUES: UserRole[] = ['admin', 'lawyer', 'personnel'];
const USERNAME_PATTERN = /^[a-z0-9._-]{3,50}$/;

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

  if (!body.username?.trim() || !body.first_name?.trim() || !body.last_name?.trim()) {
    return res.status(400).json({ message: 'Username, first name, and last name are required' });
  }
  const username = body.username.trim().toLowerCase();
  if (!USERNAME_PATTERN.test(username)) {
    return res.status(400).json({ message: 'Username must be 3-50 characters: lowercase letters, numbers, dots, underscores, hyphens' });
  }
  if (!body.role || !ROLE_VALUES.includes(body.role)) {
    return res.status(400).json({ message: 'A valid role is required' });
  }
  if (await UserService.findByUsernameExists(username)) {
    return res.status(409).json({ message: 'Username is already taken' });
  }

  const { user, tempPassword } = await UserService.createUser({
    ...body,
    username,
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
