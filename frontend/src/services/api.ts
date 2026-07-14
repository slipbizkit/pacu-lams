import type { CreateUserBody, CreateUserResult, LoginResponse, ResetPasswordResult, TotpSetupResponse, UpdateUserBody, User } from '../types/user';
import type {
  CityMunicipality,
  Client,
  ClientFeedback,
  CompletedTransaction,
  ConsultationBody,
  CreateIssueCategoryBody,
  CreateIssueCategoryGroupBody,
  CreateReferredOfficeBody,
  Dashboard,
  DashboardCharts,
  FeedbackStatus,
  HistoryFilters,
  IntakeBody,
  IntakeResult,
  IssueCategory,
  IssueCategoryGroup,
  IssueTag,
  LawyerOption,
  ReferredOffice,
  MonthlyReport,
  SubmitFeedbackBody,
  SupportStaffDashboard,
  UpdateIssueCategoryBody,
  UpdateIssueCategoryGroupBody,
  UpdateReferredOfficeBody,
} from '../types/client';

const BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Carries the HTTP status alongside the message, so callers can tell *why* a request
 * failed. Without this, a 429 rate-limit is indistinguishable from a 401 bad
 * credential — and the login form, which must show a deliberately vague message for
 * 401, would show that same "invalid password" text to a user who is merely
 * rate-limited, prompting them to retry and deepen the lockout.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (res.status === 401 && token) {
    // Only an expired/invalidated *session* (a token was actually sent) warrants
    // the app-wide expiry redirect — a 401 from /auth/login or /auth/verify-totp
    // is just a wrong credential/code and is handled inline by those forms.
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('auth:session-expired'));
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new ApiError(err.message || 'Request failed', res.status);
  }

  return res.json() as Promise<T>;
}

// For binary exports (xlsx/pdf) — triggers a browser download instead of returning JSON.
export async function apiDownload(path: string, filename: string): Promise<void> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Export failed' }));
    throw new Error(err.message || 'Export failed');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toQueryString(params: object): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const authService = {
  login: (email: string, password: string) =>
    apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  verifyTotp: (tempToken: string, code: string) =>
    apiFetch<LoginResponse>('/auth/verify-totp', {
      method: 'POST',
      body: JSON.stringify({ tempToken, code }),
    }),
  setupInit: (tempToken: string) =>
    apiFetch<TotpSetupResponse>('/auth/totp/setup-init', {
      method: 'POST',
      body: JSON.stringify({ tempToken }),
    }),
  setupConfirm: (tempToken: string, code: string) =>
    apiFetch<LoginResponse>('/auth/totp/setup-confirm', {
      method: 'POST',
      body: JSON.stringify({ tempToken, code }),
    }),
  changePasswordForced: (tempToken: string, newPassword: string) =>
    apiFetch<LoginResponse>('/auth/change-password-forced', {
      method: 'POST',
      body: JSON.stringify({ tempToken, new_password: newPassword }),
    }),
  me: () => apiFetch<User>('/auth/me'),
  refresh: () => apiFetch<{ token: string }>('/auth/refresh', { method: 'POST' }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),
};

export const clientService = {
  intake: (body: IntakeBody) =>
    apiFetch<IntakeResult>('/clients', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  listQueue: () => apiFetch<Client[]>('/clients/queue'),
  assign: (clientId: number, lawyerId: number) =>
    apiFetch<Client>(`/clients/${clientId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ lawyer_id: lawyerId }),
    }),
  claim: (clientId: number) =>
    apiFetch<Client>(`/clients/${clientId}/claim`, { method: 'POST' }),
  listMine: () => apiFetch<Client[]>('/clients/mine'),
  getMine: (clientId: number) =>
    apiFetch<{ client: Client; issues: IssueTag[] }>(`/clients/mine/${clientId}`),
  saveConsultation: (clientId: number, body: ConsultationBody) =>
    apiFetch<Client>(`/clients/${clientId}/consultation`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  cancelTransaction: (clientId: number, reason: string) =>
    apiFetch<Client>(`/clients/${clientId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  feedbackStatus: (referenceNo: string) =>
    apiFetch<FeedbackStatus>(`/clients/feedback/${encodeURIComponent(referenceNo)}`),
  submitFeedback: (referenceNo: string, body: SubmitFeedbackBody) =>
    apiFetch<{ message: string }>(`/clients/feedback/${encodeURIComponent(referenceNo)}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  encodeFeedback: (clientId: number, body: SubmitFeedbackBody) =>
    apiFetch<{ message: string; feedback: ClientFeedback }>(`/clients/${clientId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  sendEmail: (clientId: number) =>
    apiFetch<{ message: string; email_sent_at: string }>(`/clients/${clientId}/send-email`, { method: 'POST' }),
  downloadReferralPdf: (clientId: number, referenceNo: string) =>
    apiDownload(`/clients/${clientId}/referral.pdf`, `referral-${referenceNo}.pdf`),
  listHistory: (filters?: HistoryFilters) =>
    apiFetch<CompletedTransaction[]>(`/clients/history${toQueryString(filters ?? {})}`),
  listCancelled: (filters?: HistoryFilters) =>
    apiFetch<Client[]>(`/clients/cancelled${toQueryString(filters ?? {})}`),
  removeFromQueue: (clientId: number, reason: string) =>
    apiFetch<Client>(`/clients/${clientId}/remove`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  getSupportStaffDashboard: () =>
    apiFetch<SupportStaffDashboard>('/clients/ss-dashboard'),
  getDashboard: () =>
    apiFetch<Dashboard>('/clients/dashboard'),
  getDashboardCharts: () =>
    apiFetch<DashboardCharts>('/clients/dashboard/charts'),
  listAllHistory: (filters?: HistoryFilters) =>
    apiFetch<CompletedTransaction[]>(`/clients/all-history${toQueryString(filters ?? {})}`),
  listAllCancelled: (filters?: HistoryFilters) =>
    apiFetch<(Client & { cancelled_by_name: string | null })[]>(`/clients/all-cancelled${toQueryString(filters ?? {})}`),
  restoreToQueue: (clientId: number) =>
    apiFetch<Client>(`/clients/${clientId}/restore`, { method: 'POST' }),
};

export const userService = {
  listLawyers: () => apiFetch<LawyerOption[]>('/users/lawyers'),
  listAll: () => apiFetch<User[]>('/users'),
  create: (body: CreateUserBody) =>
    apiFetch<CreateUserResult>('/users', { method: 'POST', body: JSON.stringify(body) }),
  update: (userId: number, body: UpdateUserBody) =>
    apiFetch<User>(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  resetTotp: (userId: number) =>
    apiFetch<User>(`/users/${userId}/reset-totp`, { method: 'POST' }),
  resetPassword: (userId: number) =>
    apiFetch<ResetPasswordResult>(`/users/${userId}/reset-password`, { method: 'POST' }),
};

export const lookupService = {
  citiesMunicipalities: () => apiFetch<CityMunicipality[]>('/lookups/cities-municipalities'),
  issueCategories: () => apiFetch<IssueCategory[]>('/lookups/issue-categories'),
  referredOffices: () => apiFetch<ReferredOffice[]>('/lookups/referred-offices'),
  allIssueCategories: () => apiFetch<IssueCategory[]>('/lookups/issue-categories/all'),
  createIssueCategory: (body: CreateIssueCategoryBody) =>
    apiFetch<IssueCategory>('/lookups/issue-categories', { method: 'POST', body: JSON.stringify(body) }),
  updateIssueCategory: (categoryId: number, body: UpdateIssueCategoryBody) =>
    apiFetch<IssueCategory>(`/lookups/issue-categories/${categoryId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  issueCategoryGroups: () => apiFetch<IssueCategoryGroup[]>('/lookups/issue-category-groups'),
  createIssueCategoryGroup: (body: CreateIssueCategoryGroupBody) =>
    apiFetch<IssueCategoryGroup>('/lookups/issue-category-groups', { method: 'POST', body: JSON.stringify(body) }),
  updateIssueCategoryGroup: (groupId: number, body: UpdateIssueCategoryGroupBody) =>
    apiFetch<IssueCategoryGroup>(`/lookups/issue-category-groups/${groupId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  allReferredOffices: () => apiFetch<ReferredOffice[]>('/lookups/referred-offices/all'),
  createReferredOffice: (body: CreateReferredOfficeBody) =>
    apiFetch<ReferredOffice>('/lookups/referred-offices', { method: 'POST', body: JSON.stringify(body) }),
  updateReferredOffice: (officeId: number, body: UpdateReferredOfficeBody) =>
    apiFetch<ReferredOffice>(`/lookups/referred-offices/${officeId}`, { method: 'PATCH', body: JSON.stringify(body) }),
};

export const reportService = {
  getMonthly: (month: string) => apiFetch<MonthlyReport>(`/reports${toQueryString({ month })}`),
  exportExcel: (month: string) =>
    apiDownload(`/reports/export.xlsx${toQueryString({ month })}`, `pacu-monthly-report-${month}.xlsx`),
  exportPdf: (month: string) =>
    apiDownload(`/reports/export.pdf${toQueryString({ month })}`, `pacu-monthly-report-${month}.pdf`),
};
