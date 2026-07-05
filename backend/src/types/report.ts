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
  region: string | null;
  is_senior: boolean;
  is_pwd: boolean;
  is_pregnant: boolean;
  lawyer_name: string | null;
  issue_categories: string | null;
  referred_office: string | null;
  status: string;
}
