export interface CityMunicipality {
  id: number;
  city_municipality: string;
  province: string;
  region: string;
  is_city: boolean;
}

export interface IssueCategoryGroup {
  group_id: number;
  group_name: string;
  is_active: boolean;
}

// `category_group` is the group's name, joined in from issue_category_groups.
// Kept on the response so existing consumers (consultation panel, history, PDFs)
// read the same shape they always have.
export interface IssueCategory {
  category_id: number;
  group_id: number;
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

export interface CreateIssueCategoryGroupBody {
  group_name: string;
}

export interface UpdateIssueCategoryGroupBody {
  group_name?: string;
  is_active?: boolean;
}

export interface CreateIssueCategoryBody {
  group_id: number;
  category_name: string;
  description?: string;
}

export interface UpdateIssueCategoryBody {
  group_id?: number;
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
