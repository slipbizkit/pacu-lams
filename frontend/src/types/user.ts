export type UserRole = 'admin' | 'lawyer' | 'personnel';

export interface User {
  user_id: number;
  username: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  position: string | null;
  role: UserRole;
  totp_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  token?: string;
  user?: User;
  requiresTOTP?: boolean;
  requiresTOTPSetup?: boolean;
  tempToken?: string;
}

export interface TotpSetupResponse {
  qrCode: string;
  secret: string;
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

export interface CreateUserResult {
  user: User;
  tempPassword: string;
}
