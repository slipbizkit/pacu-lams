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
