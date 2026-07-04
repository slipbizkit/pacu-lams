import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as LookupService from '../services/lookupService';
import {
  CreateIssueCategoryBody,
  CreateReferredOfficeBody,
  UpdateIssueCategoryBody,
  UpdateReferredOfficeBody,
} from '../types/lookup';

export async function listIssueCategories(_req: AuthRequest, res: Response) {
  const categories = await LookupService.listActiveIssueCategories();
  res.json(categories);
}

export async function listAllIssueCategories(_req: AuthRequest, res: Response) {
  const categories = await LookupService.listAllIssueCategories();
  res.json(categories);
}

export async function createIssueCategory(req: AuthRequest, res: Response) {
  const body = req.body as CreateIssueCategoryBody;
  if (!body.category_group?.trim() || !body.category_name?.trim()) {
    return res.status(400).json({ message: 'category_group and category_name are required' });
  }
  const category = await LookupService.createIssueCategory({
    category_group: body.category_group.trim(),
    category_name: body.category_name.trim(),
    description: body.description,
  });
  res.status(201).json(category);
}

export async function updateIssueCategory(req: AuthRequest, res: Response) {
  const categoryId = Number(req.params.id);
  const body = req.body as UpdateIssueCategoryBody;
  const category = await LookupService.updateIssueCategory(categoryId, body);
  if (!category) return res.status(404).json({ message: 'Issue category not found' });
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
