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

  feedback_rating: number | null;
  feedback_comments: string | null;

  status: ClientStatus;
  encoded_by: number | null;

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
