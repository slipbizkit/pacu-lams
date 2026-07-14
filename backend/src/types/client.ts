import { ClientFeedback } from './feedback';

export type ClientStatus = 'waiting' | 'assigned' | 'in_progress' | 'incomplete' | 'completed' | 'cancelled';
export type ClientSex = 'male' | 'female';
export type PendingComplaintType = 'NLRC' | 'DOLE Regional/Field Office' | 'NCMB' | 'DMW' | 'OWWA' | 'Others';

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

  email_sent_at: string | null;

  status: ClientStatus;
  cancellation_reason: string | null;

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
  issue_description?: string; // required when the 'Others' category is tagged
  legal_advice?: string;
  referred_office_id?: number | null;
  referred_reason?: string | null;
  mark_incomplete: boolean;
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
  feedback: ClientFeedback | null;
}
