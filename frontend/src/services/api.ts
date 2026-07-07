import type { CreateUserBody, CreateUserResult, LoginResponse, TotpSetupResponse, UpdateUserBody, User } from '../types/user';
import type {
  CityMunicipality,
  Client,
  CompletedTransaction,
  ConsultationBody,
  CreateIssueCategoryBody,
  CreateReferredOfficeBody,
  FeedbackStatus,
  HistoryFilters,
  IntakeBody,
  IntakeResult,
  IssueCategory,
  IssueTag,
  LawyerOption,
  ReferredOffice,
  ReportFilters,
  ReportRow,
  SubmitFeedbackBody,
  SupportStaffDashboard,
  UpdateIssueCategoryBody,
  UpdateReferredOfficeBody,
} from '../types/client';

const BASE_URL = import.meta.env.VITE_API_URL;

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
    throw new Error(err.message || 'Request failed');
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
  login: (username: string, password: string) =>
    apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
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
  me: () => apiFetch<User>('/auth/me'),
  refresh: () => apiFetch<{ token: string }>('/auth/refresh', { method: 'POST' }),
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
  listAllHistory: (filters?: HistoryFilters) =>
    apiFetch<CompletedTransaction[]>(`/clients/all-history${toQueryString(filters ?? {})}`),
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
  allReferredOffices: () => apiFetch<ReferredOffice[]>('/lookups/referred-offices/all'),
  createReferredOffice: (body: CreateReferredOfficeBody) =>
    apiFetch<ReferredOffice>('/lookups/referred-offices', { method: 'POST', body: JSON.stringify(body) }),
  updateReferredOffice: (officeId: number, body: UpdateReferredOfficeBody) =>
    apiFetch<ReferredOffice>(`/lookups/referred-offices/${officeId}`, { method: 'PATCH', body: JSON.stringify(body) }),
};

export const reportService = {
  run: (filters: ReportFilters) => apiFetch<ReportRow[]>(`/reports${toQueryString(filters)}`),
  exportExcel: (filters: ReportFilters) =>
    apiDownload(`/reports/export.xlsx${toQueryString(filters)}`, `pacu-report-${Date.now()}.xlsx`),
  exportPdf: (filters: ReportFilters) =>
    apiDownload(`/reports/export.pdf${toQueryString(filters)}`, `pacu-report-${Date.now()}.pdf`),
};
