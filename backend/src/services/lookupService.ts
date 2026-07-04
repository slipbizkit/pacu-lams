import sql from '../db';
import {
  CreateIssueCategoryBody,
  CreateReferredOfficeBody,
  IssueCategory,
  ReferredOffice,
  UpdateIssueCategoryBody,
  UpdateReferredOfficeBody,
} from '../types/lookup';

export async function listActiveIssueCategories(): Promise<IssueCategory[]> {
  const rows = await sql`
    SELECT category_id, category_group, category_name, description, is_active
    FROM issue_categories
    WHERE is_active = TRUE
    ORDER BY category_group, category_name
  `;
  return rows as IssueCategory[];
}

export async function listAllIssueCategories(): Promise<IssueCategory[]> {
  const rows = await sql`
    SELECT category_id, category_group, category_name, description, is_active
    FROM issue_categories
    ORDER BY category_group, category_name
  `;
  return rows as IssueCategory[];
}

export async function createIssueCategory(body: CreateIssueCategoryBody): Promise<IssueCategory> {
  const rows = await sql`
    INSERT INTO issue_categories (category_group, category_name, description)
    VALUES (${body.category_group}, ${body.category_name}, ${body.description ?? null})
    RETURNING category_id, category_group, category_name, description, is_active
  `;
  return rows[0] as IssueCategory;
}

export async function updateIssueCategory(
  categoryId: number,
  body: UpdateIssueCategoryBody
): Promise<IssueCategory | null> {
  const rows = await sql`
    UPDATE issue_categories
    SET category_group = COALESCE(${body.category_group ?? null}, category_group),
        category_name = COALESCE(${body.category_name ?? null}, category_name),
        description = COALESCE(${body.description ?? null}, description),
        is_active = COALESCE(${body.is_active ?? null}, is_active)
    WHERE category_id = ${categoryId}
    RETURNING category_id, category_group, category_name, description, is_active
  `;
  return (rows[0] as IssueCategory) ?? null;
}

export async function listActiveReferredOffices(): Promise<ReferredOffice[]> {
  const rows = await sql`
    SELECT office_id, office_name, office_type, is_active
    FROM referred_offices
    WHERE is_active = TRUE
    ORDER BY office_name
  `;
  return rows as ReferredOffice[];
}

export async function findReferredOfficeById(officeId: number): Promise<ReferredOffice | null> {
  const rows = await sql`
    SELECT office_id, office_name, office_type, is_active
    FROM referred_offices
    WHERE office_id = ${officeId}
  `;
  return (rows[0] as ReferredOffice) ?? null;
}

export async function listAllReferredOffices(): Promise<ReferredOffice[]> {
  const rows = await sql`
    SELECT office_id, office_name, office_type, is_active
    FROM referred_offices
    ORDER BY office_name
  `;
  return rows as ReferredOffice[];
}

export async function createReferredOffice(body: CreateReferredOfficeBody): Promise<ReferredOffice> {
  const rows = await sql`
    INSERT INTO referred_offices (office_name, office_type)
    VALUES (${body.office_name}, ${body.office_type ?? null})
    RETURNING office_id, office_name, office_type, is_active
  `;
  return rows[0] as ReferredOffice;
}

export async function updateReferredOffice(
  officeId: number,
  body: UpdateReferredOfficeBody
): Promise<ReferredOffice | null> {
  const rows = await sql`
    UPDATE referred_offices
    SET office_name = COALESCE(${body.office_name ?? null}, office_name),
        office_type = COALESCE(${body.office_type ?? null}, office_type),
        is_active = COALESCE(${body.is_active ?? null}, is_active)
    WHERE office_id = ${officeId}
    RETURNING office_id, office_name, office_type, is_active
  `;
  return (rows[0] as ReferredOffice) ?? null;
}
