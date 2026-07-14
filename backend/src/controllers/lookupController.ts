import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as LookupService from '../services/lookupService';
import {
  CreateIssueCategoryBody,
  CreateIssueCategoryGroupBody,
  CreateReferredOfficeBody,
  UpdateIssueCategoryBody,
  UpdateIssueCategoryGroupBody,
  UpdateReferredOfficeBody,
} from '../types/lookup';

// Public — no auth. Backs the City/Municipality dropdown on the public intake form.
export async function listCitiesMunicipalities(_req: Request, res: Response) {
  const cities = await LookupService.listCitiesMunicipalities();
  res.json(cities);
}

export async function listIssueCategories(_req: AuthRequest, res: Response) {
  const categories = await LookupService.listActiveIssueCategories();
  res.json(categories);
}

export async function listAllIssueCategories(_req: AuthRequest, res: Response) {
  const categories = await LookupService.listAllIssueCategories();
  res.json(categories);
}

export async function listIssueCategoryGroups(_req: AuthRequest, res: Response) {
  const groups = await LookupService.listIssueCategoryGroups();
  res.json(groups);
}

export async function createIssueCategoryGroup(req: AuthRequest, res: Response) {
  const body = req.body as CreateIssueCategoryGroupBody;
  if (!body.group_name?.trim()) {
    return res.status(400).json({ message: 'group_name is required' });
  }
  const groupName = body.group_name.trim();

  const existing = await LookupService.findIssueCategoryGroupByName(groupName);
  if (existing) {
    return res.status(409).json({ message: `Category "${existing.group_name}" already exists` });
  }

  const group = await LookupService.createIssueCategoryGroup({ group_name: groupName });
  res.status(201).json(group);
}

export async function updateIssueCategoryGroup(req: AuthRequest, res: Response) {
  const groupId = Number(req.params.id);
  const body = req.body as UpdateIssueCategoryGroupBody;

  if (body.group_name !== undefined) {
    const groupName = body.group_name.trim();
    if (!groupName) {
      return res.status(400).json({ message: 'group_name cannot be empty' });
    }
    const existing = await LookupService.findIssueCategoryGroupByName(groupName);
    if (existing && existing.group_id !== groupId) {
      return res.status(409).json({ message: `Category "${existing.group_name}" already exists` });
    }
    body.group_name = groupName;
  }

  const group = await LookupService.updateIssueCategoryGroup(groupId, body);
  if (!group) return res.status(404).json({ message: 'Category not found' });
  res.json(group);
}

export async function createIssueCategory(req: AuthRequest, res: Response) {
  const body = req.body as CreateIssueCategoryBody;
  if (!body.group_id || !body.category_name?.trim()) {
    return res.status(400).json({ message: 'group_id and category_name are required' });
  }

  const group = await LookupService.findIssueCategoryGroupById(body.group_id);
  if (!group) return res.status(404).json({ message: 'Category not found' });

  const category = await LookupService.createIssueCategory({
    group_id: body.group_id,
    category_name: body.category_name.trim(),
    description: body.description,
  });
  res.status(201).json(category);
}

export async function updateIssueCategory(req: AuthRequest, res: Response) {
  const categoryId = Number(req.params.id);
  const body = req.body as UpdateIssueCategoryBody;

  if (body.group_id !== undefined) {
    const group = await LookupService.findIssueCategoryGroupById(body.group_id);
    if (!group) return res.status(404).json({ message: 'Category not found' });
  }

  const category = await LookupService.updateIssueCategory(categoryId, body);
  if (!category) return res.status(404).json({ message: 'Issue not found' });
  res.json(category);
}

export async function listReferredOffices(_req: AuthRequest, res: Response) {
  const offices = await LookupService.listActiveReferredOffices();
  res.json(offices);
}

export async function listAllReferredOffices(_req: AuthRequest, res: Response) {
  const offices = await LookupService.listAllReferredOffices();
  res.json(offices);
}

export async function createReferredOffice(req: AuthRequest, res: Response) {
  const body = req.body as CreateReferredOfficeBody;
  if (!body.office_name?.trim()) {
    return res.status(400).json({ message: 'office_name is required' });
  }
  const office = await LookupService.createReferredOffice({
    office_name: body.office_name.trim(),
    office_type: body.office_type,
  });
  res.status(201).json(office);
}

export async function updateReferredOffice(req: AuthRequest, res: Response) {
  const officeId = Number(req.params.id);
  const body = req.body as UpdateReferredOfficeBody;
  const office = await LookupService.updateReferredOffice(officeId, body);
  if (!office) return res.status(404).json({ message: 'Referral office not found' });
  res.json(office);
}
