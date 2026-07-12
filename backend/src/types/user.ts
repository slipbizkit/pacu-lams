export type UserRole = 'admin' | 'lawyer' | 'personnel' | 'support_staff';
export type UserSex = 'male' | 'female';

export interface User {
  user_id: number;
  password_hash: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  position: string | null;
  email: string;
  sex: UserSex | null;
  role: UserRole;
  totp_secret: string | null;
  totp_enabled: boolean;
  must_change_password: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PublicUser = Omit<User, 'password_hash' | 'totp_secret'>;

export interface AccessTokenPayload {
  id: number;
  email: string;
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
  email: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  position?: string;
  sex?: UserSex;
  role: UserRole;
}

export interface UpdateUserBody {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  position?: string;
  email?: string;
  sex?: UserSex;
  role?: UserRole;
  is_active?: boolean;
}
