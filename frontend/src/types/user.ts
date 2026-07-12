export type UserRole = 'admin' | 'lawyer' | 'personnel' | 'support_staff';
export type UserSex = 'male' | 'female';

export interface User {
  user_id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  position: string | null;
  email: string;
  sex: UserSex | null;
  role: UserRole;
  totp_enabled: boolean;
  must_change_password: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  token?: string;
  user?: User;
  requiresTOTP?: boolean;
  requiresTOTPSetup?: boolean;
  requiresPasswordChange?: boolean;
  tempToken?: string;
}

export interface ResetPasswordResult {
  user: User;
  tempPassword: string;
  emailSent: boolean;
}

export interface TotpSetupResponse {
  qrCode: string;
  secret: string;
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

export interface CreateUserResult {
  user: User;
  tempPassword: string;
}
