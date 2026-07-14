import sql from '../db';
import {
  CityMunicipality,
  CreateIssueCategoryBody,
  CreateIssueCategoryGroupBody,
  CreateReferredOfficeBody,
  IssueCategory,
  IssueCategoryGroup,
  ReferredOffice,
  UpdateIssueCategoryBody,
  UpdateIssueCategoryGroupBody,
  UpdateReferredOfficeBody,
} from '../types/lookup';

export async function listCitiesMunicipalities(): Promise<CityMunicipality[]> {
  const rows = await sql`
    SELECT id, city_municipality, province, region, is_city
    FROM cities_municipalities
    ORDER BY city_municipality
  `;
  return rows as CityMunicipality[];
}

export async function listIssueCategoryGroups(): Promise<IssueCategoryGroup[]> {
  const rows = await sql`
    SELECT group_id, group_name, is_active
    FROM issue_category_groups
    ORDER BY group_name
  `;
  return rows as IssueCategoryGroup[];
}

export async function createIssueCategoryGroup(
  body: CreateIssueCategoryGroupBody
): Promise<IssueCategoryGroup> {
  const rows = await sql`
    INSERT INTO issue_category_groups (group_name)
    VALUES (${body.group_name})
    RETURNING group_id, group_name, is_active
  `;
  return rows[0] as IssueCategoryGroup;
}

export async function findIssueCategoryGroupByName(
  groupName: string
): Promise<IssueCategoryGroup | null> {
  const rows = await sql`
    SELECT group_id, group_name, is_active
    FROM issue_category_groups
    WHERE LOWER(group_name) = LOWER(${groupName})
  `;
  return (rows[0] as IssueCategoryGroup) ?? null;
}

export async function findIssueCategoryGroupById(
  groupId: number
): Promise<IssueCategoryGroup | null> {
  const rows = await sql`
    SELECT group_id, group_name, is_active
    FROM issue_category_groups
    WHERE group_id = ${groupId}
  `;
  return (rows[0] as IssueCategoryGroup) ?? null;
}

export async function updateIssueCategoryGroup(
  groupId: number,
  body: UpdateIssueCategoryGroupBody
): Promise<IssueCategoryGroup | null> {
  const rows = await sql`
    UPDATE issue_category_groups
    SET group_name = COALESCE(${body.group_name ?? null}, group_name),
        is_active = COALESCE(${body.is_active ?? null}, is_active)
    WHERE group_id = ${groupId}
    RETURNING group_id, group_name, is_active
  `;
  return (rows[0] as IssueCategoryGroup) ?? null;
}

export async function listActiveIssueCategories(): Promise<IssueCategory[]> {
  const rows = await sql`
    SELECT ic.category_id, ic.group_id, g.group_name AS category_group,
           ic.category_name, ic.description, ic.is_active
    FROM issue_categories ic
    JOIN issue_category_groups g ON g.group_id = ic.group_id
    WHERE ic.is_active = TRUE AND g.is_active = TRUE
    ORDER BY g.group_name, ic.category_name
  `;
  return rows as IssueCategory[];
}

export async function listAllIssueCategories(): Promise<IssueCategory[]> {
  const rows = await sql`
    SELECT ic.category_id, ic.group_id, g.group_name AS category_group,
           ic.category_name, ic.description, ic.is_active
    FROM issue_categories ic
    JOIN issue_category_groups g ON g.group_id = ic.group_id
    ORDER BY g.group_name, ic.category_name
  `;
  return rows as IssueCategory[];
}

export async function createIssueCategory(body: CreateIssueCategoryBody): Promise<IssueCategory> {
  const rows = await sql`
    WITH inserted AS (
      INSERT INTO issue_categories (group_id, category_name, description)
      VALUES (${body.group_id}, ${body.category_name}, ${body.description ?? null})
      RETURNING category_id, group_id, category_name, description, is_active
    )
    SELECT i.category_id, i.group_id, g.group_name AS category_group,
           i.category_name, i.description, i.is_active
    FROM inserted i
    JOIN issue_category_groups g ON g.group_id = i.group_id
  `;
  return rows[0] as IssueCategory;
}

export async function updateIssueCategory(
  categoryId: number,
  body: UpdateIssueCategoryBody
): Promise<IssueCategory | null> {
  const rows = await sql`
    WITH updated AS (
      UPDATE issue_categories
      SET group_id = COALESCE(${body.group_id ?? null}, group_id),
          category_name = COALESCE(${body.category_name ?? null}, category_name),
          description = COALESCE(${body.description ?? null}, description),
          is_active = COALESCE(${body.is_active ?? null}, is_active)
      WHERE category_id = ${categoryId}
      RETURNING category_id, group_id, category_name, description, is_active
    )
    SELECT u.category_id, u.group_id, g.group_name AS category_group,
           u.category_name, u.description, u.is_active
    FROM updated u
    JOIN issue_category_groups g ON g.group_id = u.group_id
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
