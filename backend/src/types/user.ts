export type UserRole = 'admin' | 'lawyer' | 'personnel' | 'support_staff';

export interface User {
  user_id: number;
  username: string;
  password_hash: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  position: string | null;
  role: UserRole;
  totp_secret: string | null;
  totp_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PublicUser = Omit<User, 'password_hash' | 'totp_secret'>;

export interface AccessTokenPayload {
  id: number;
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface TempTokenPayload {
  id: number;
  pending2FA: true;
  iat: number;
  exp: number;
}

export interface CreateUserBody {
  username: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  position?: string;
  role: UserRole;
}

export interface UpdateUserBody {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  position?: string;
  role?: UserRole;
  is_active?: boolean;
}
