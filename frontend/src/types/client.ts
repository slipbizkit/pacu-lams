export type ClientStatus = 'waiting' | 'assigned' | 'in_progress' | 'incomplete' | 'completed' | 'cancelled';
export type ClientSex = 'male' | 'female';
export type PendingComplaintType = 'NLRC' | 'DOLE Regional/Field Office' | 'NCMB' | 'DMW' | 'OWWA' | 'Others';

export interface CityMunicipality {
  id: number;
  city_municipality: string;
  province: string;
  region: string;
  is_city: boolean;
}

export const PENDING_COMPLAINT_TYPES: PendingComplaintType[] = [
  'NLRC',
  'DOLE Regional/Field Office',
  'NCMB',
  'DMW',
  'OWWA',
  'Others',
];

export interface Client {
  client_id: number;
  reference_no: string;
  queue_number: number;
  transaction_date: string;

  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  sex: ClientSex | null;

  contact_no: string | null;
  email: string | null;

  city_id: number | null;

  occupation: string | null;
  employer: string | null;
  date_of_employment: string | null;
  union_member: boolean | null;
  company_city_id: number | null;
  pending_complaint_types: PendingComplaintType[] | null;

  concern: string | null;

  is_pwd: boolean;
  is_senior: boolean;
  is_pregnant: boolean;
  is_anonymous: boolean;

  assigned_lawyer_id: number | null;
  legal_advice: string | null;
  referred_office_id: number | null;
  referred_reason: string | null;

  feedback_rating: number | null;
  feedback_comments: string | null;

  email_sent_at: string | null;

  status: ClientStatus;
  cancellation_reason: string | null;

  created_at: string;
  updated_at: string;
}

export interface HistoryFilters {
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface CompletedTransaction extends Client {
  referred_office_name: string | null;
  issue_categories: string | null;
  city: string | null;
  province: string | null;
  company_city: string | null;
  lawyer_name: string | null;
}

export interface ActivityItem {
  client_id: number;
  first_name: string;
  last_name: string;
  queue_number: number;
  status: ClientStatus;
  updated_at: string;
  cancellation_reason: string | null;
  lawyer_name: string | null;
}

export interface DashboardCharts {
  daily: { date: string; count: number }[];
  categories?: { name: string; count: number }[];
}

export interface Dashboard {
  queue: {
    waiting: number;
    priority_waiting: number;
    in_progress: number;
    incomplete: number;
    completed_today: number;
    cancelled_today: number;
  };
  my?: {
    in_progress: number;
    incomplete: number;
    completed_today: number;
    completed_this_month: number;
  };
}

export interface SupportStaffDashboard {
  stats: { waiting: number; served_today: number; removed_today: number };
  queue: Client[];
  recent_activity: ActivityItem[];
}

export interface IssueTag {
  category_id: number;
  category_group: string;
  category_name: string;
  issue_description: string | null;
}

export interface ConsultationBody {
  issue_category_ids: number[];
  issue_description?: string;
  legal_advice?: string;
  referred_office_id?: number | null;
  referred_reason?: string | null;
  mark_incomplete: boolean;
}

export interface IssueCategory {
  category_id: number;
  category_group: string;
  category_name: string;
  description: string | null;
  is_active: boolean;
}

export interface ReferredOffice {
  office_id: number;
  office_name: string;
  office_type: string | null;
  is_active: boolean;
}

export interface IntakeBody {
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  sex?: ClientSex;
  contact_no?: string;
  email?: string;
  city_id?: number;
  occupation?: string;
  date_of_employment?: string;
  union_member?: boolean;
  employer?: string;
  company_city_id?: number;
  pending_complaint_types?: PendingComplaintType[];
  is_pwd?: boolean;
  is_senior?: boolean;
  is_pregnant?: boolean;
  is_anonymous?: boolean;
}

export interface IntakeResult {
  reference_no: string;
  queue_number: number;
  transaction_date: string;
}

export interface LawyerOption {
  user_id: number;
  first_name: string;
  last_name: string;
}

export interface CreateIssueCategoryBody {
  category_group: string;
  category_name: string;
  description?: string;
}

export interface UpdateIssueCategoryBody {
  category_group?: string;
  category_name?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateReferredOfficeBody {
  office_name: string;
  office_type?: string;
}

export interface UpdateReferredOfficeBody {
  office_name?: string;
  office_type?: string;
  is_active?: boolean;
}

export interface ReportFilters {
  date_from?: string;
  date_to?: string;
  lawyer_id?: number;
  issue_category_id?: number;
  referred_office_id?: number;
  sex?: string;
  city?: string;
  province?: string;
  priority_only?: boolean;
  status?: string;
}

export interface FeedbackStatus {
  first_name: string;
  status: ClientStatus;
  already_submitted: boolean;
}

export interface SubmitFeedbackBody {
  rating: number;
  comments?: string;
}

export interface ReportRow {
  client_id: number;
  reference_no: string;
  queue_number: number;
  transaction_date: string;
  first_name: string;
  last_name: string;
  sex: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  is_senior: boolean;
  is_pwd: boolean;
  is_pregnant: boolean;
  lawyer_name: string | null;
  issue_categories: string | null;
  referred_office: string | null;
  status: string;
}
