export type ClientStatus = 'waiting' | 'assigned' | 'in_progress' | 'completed';
export type ClientSex = 'male' | 'female';
export type CivilStatus = 'single' | 'married' | 'widowed' | 'separated' | 'divorced';

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
  birth_date: string | null;
  civil_status: CivilStatus | null;

  contact_no: string | null;
  email: string | null;

  address: string | null;
  city: string | null;
  province: string | null;

  occupation: string | null;
  employer: string | null;

  concern: string | null;

  is_pwd: boolean;
  is_senior: boolean;
  is_pregnant: boolean;

  assigned_lawyer_id: number | null;
  legal_advice: string | null;
  referred_office_id: number | null;
  referred_reason: string | null;
  status: ClientStatus;

  created_at: string;
  updated_at: string;
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
  birth_date?: string;
  civil_status?: CivilStatus;
  contact_no?: string;
  email?: string;
  address?: string;
  city?: string;
  province?: string;
  occupation?: string;
  employer?: string;
  concern?: string;
  is_pwd?: boolean;
  is_senior?: boolean;
  is_pregnant?: boolean;
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
  min_age?: number;
  max_age?: number;
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
  age: number | null;
  city: string | null;
  province: string | null;
  is_senior: boolean;
  is_pwd: boolean;
  is_pregnant: boolean;
  lawyer_name: string | null;
  issue_categories: string | null;
  referred_office: string | null;
  status: string;
}
