import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { clientService, lookupService, userService } from '../services/api';
import type { CityMunicipality, ClientSex, LawyerOption, ManualIntakeBody, PendingComplaintType } from '../types/client';
import { PENDING_COMPLAINT_TYPES } from '../types/client';
import { SearchableSelect } from './SearchableSelect';
import { MultiSelectChips } from './MultiSelectChips';

interface ManualIntakeModalProps {
  onClose: () => void;
  onCreated: () => void;
}

type FieldErrors = Partial<Record<keyof ManualIntakeBody, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function formatContactNo(digits: string): string {
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return digits.slice(0, 4) + '-' + digits.slice(4);
  return digits.slice(0, 4) + '-' + digits.slice(4, 7) + '-' + digits.slice(7);
}

function toCityOptions(cities: CityMunicipality[]) {
  return cities.map((c) => ({ value: c.id, label: `${c.city_municipality}, ${c.province}` }));
}

function validate(form: ManualIntakeBody): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.transaction_date) errors.transaction_date = 'Transaction date is required';
  if (!form.assigned_lawyer_id) errors.assigned_lawyer_id = 'Please assign a lawyer';
  if (!form.is_anonymous) {
    if (!form.first_name?.trim()) errors.first_name = 'First name is required';
    if (!form.last_name?.trim()) errors.last_name = 'Last name is required';
    if (!form.sex) errors.sex = 'Sex is required';
  }
  const rawContact = form.contact_no?.replace(/-/g, '') ?? '';
  if (rawContact.length > 0 && rawContact.length < 11) errors.contact_no = 'Enter a valid 11-digit mobile number';
  if (form.email?.trim() && !EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Enter a valid email address';
  if (form.pending_complaint_types?.includes('Others') && !form.pending_complaint_other?.trim()) {
    errors.pending_complaint_other = 'Please describe the "Others" complaint type';
  }
  return errors;
}

const EMPTY_FORM: ManualIntakeBody = {
  first_name: '',
  middle_name: '',
  last_name: '',
  suffix: '',
  sex: undefined,
  contact_no: '',
  telephone_no: '',
  email: '',
  city_id: undefined,
  occupation: '',
  date_of_employment: '',
  union_member: undefined,
  employer: '',
  company_city_id: undefined,
  pending_complaint_types: [],
  pending_complaint_other: '',
  is_pwd: false,
  is_senior: false,
  is_pregnant: false,
  is_anonymous: false,
  transaction_date: todayStr(),
  assigned_lawyer_id: 0,
  concern: '',
};

export function ManualIntakeModal({ onClose, onCreated }: ManualIntakeModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lawyers, setLawyers] = useState<LawyerOption[]>([]);
  const [cities, setCities] = useState<CityMunicipality[]>([]);
  const [form, setForm] = useState<ManualIntakeBody>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    Promise.all([userService.listLawyers(), lookupService.citiesMunicipalities()])
      .then(([lawyerList, cityList]) => {
        setLawyers(lawyerList);
        setCities(cityList);
      })
      .catch((err) => {
        Swal.fire({ icon: 'error', title: 'Could not load data', text: err instanceof Error ? err.message : 'Please try again' });
        onClose();
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update<K extends keyof ManualIntakeBody>(key: K, value: ManualIntakeBody[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      const result = await clientService.manualIntake(form);
      await Swal.fire({
        icon: 'success',
        title: 'Client Added',
        html: `Reference No: <strong class="pacu-mono">${result.reference_no}</strong><br>Queue #: <strong>${result.queue_number}</strong><br><span class="text-muted" style="font-size:0.9rem">Assigned as Incomplete to the selected lawyer.</span>`,
        confirmButtonColor: 'var(--pacu-accent)',
      });
      onCreated();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not add client', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setSubmitting(false);
    }
  }

  const cityOptions = toCityOptions(cities);

  const modal = (
    <>
      <div className="modal-backdrop show" style={{ zIndex: 1050 }} onClick={onClose} />
      <div className="modal show d-block" style={{ zIndex: 1055 }} aria-modal="true" role="dialog">
        <div className="modal-dialog modal-xl modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h5 className="modal-title mb-0">Add Client Manually</h5>
                <p className="text-muted mb-0" style={{ fontSize: '0.82rem' }}>
                  Client will be assigned directly to the selected lawyer as Incomplete.
                </p>
              </div>
              <button type="button" className="btn-close ms-3" onClick={onClose} aria-label="Close" />
            </div>

            {loading ? (
              <div className="modal-body d-flex justify-content-center py-5">
                <div className="spinner-border text-primary" />
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="modal-body">

                  {/* Transaction Details */}
                  <p className="pacu-eyebrow mb-3">Transaction Details</p>
                  <div className="row g-3 mb-4">
                    <div className="col-md-4">
                      <label className="form-label">Transaction Date <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        className={`form-control${errors.transaction_date ? ' is-invalid' : ''}`}
                        value={form.transaction_date}
                        onChange={(e) => update('transaction_date', e.target.value)}
                      />
                      {errors.transaction_date && <div className="invalid-feedback">{errors.transaction_date}</div>}
                    </div>
                    <div className="col-md-8">
                      <label className="form-label">Assign to Lawyer <span className="text-danger">*</span></label>
                      <select
                        className={`form-select${errors.assigned_lawyer_id ? ' is-invalid' : ''}`}
                        value={form.assigned_lawyer_id || ''}
                        onChange={(e) => update('assigned_lawyer_id', Number(e.target.value))}
                      >
                        <option value="">Select a lawyer…</option>
                        {lawyers.map((l) => (
                          <option key={l.user_id} value={l.user_id}>{l.first_name} {l.last_name}</option>
                        ))}
                      </select>
                      {errors.assigned_lawyer_id && <div className="invalid-feedback">{errors.assigned_lawyer_id}</div>}
                    </div>
                  </div>

                  {/* Anonymous toggle */}
                  <div className="form-check form-switch mb-4">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="manual-anon"
                      checked={form.is_anonymous ?? false}
                      onChange={(e) => update('is_anonymous', e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="manual-anon">Anonymous client</label>
                  </div>

                  {/* Client Information */}
                  <p className="pacu-eyebrow mb-3">Client Information</p>
                  {!form.is_anonymous && (
                    <>
                      <div className="row g-3 mb-3">
                        <div className="col-md-4">
                          <label className="form-label">First Name <span className="text-danger">*</span></label>
                          <input
                            className={`form-control${errors.first_name ? ' is-invalid' : ''}`}
                            value={form.first_name ?? ''}
                            onChange={(e) => update('first_name', e.target.value)}
                          />
                          {errors.first_name && <div className="invalid-feedback">{errors.first_name}</div>}
                        </div>
                        <div className="col-md-3">
                          <label className="form-label">Middle Name</label>
                          <input className="form-control" value={form.middle_name ?? ''} onChange={(e) => update('middle_name', e.target.value)} />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Last Name <span className="text-danger">*</span></label>
                          <input
                            className={`form-control${errors.last_name ? ' is-invalid' : ''}`}
                            value={form.last_name ?? ''}
                            onChange={(e) => update('last_name', e.target.value)}
                          />
                          {errors.last_name && <div className="invalid-feedback">{errors.last_name}</div>}
                        </div>
                        <div className="col-md-1">
                          <label className="form-label">Suffix</label>
                          <input className="form-control" value={form.suffix ?? ''} onChange={(e) => update('suffix', e.target.value)} />
                        </div>
                      </div>
                      <div className="row g-3 mb-3">
                        <div className="col-md-4">
                          <label className="form-label">Sex <span className="text-danger">*</span></label>
                          <select
                            className={`form-select${errors.sex ? ' is-invalid' : ''}`}
                            value={form.sex ?? ''}
                            onChange={(e) => update('sex', (e.target.value as ClientSex) || undefined)}
                          >
                            <option value="">Select sex…</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                          {errors.sex && <div className="invalid-feedback">{errors.sex}</div>}
                        </div>
                        <div className="col-md-8">
                          <label className="form-label">City / Municipality</label>
                          <SearchableSelect
                            options={cityOptions}
                            value={form.city_id ?? null}
                            onChange={(id) => update('city_id', id ?? undefined)}
                            placeholder="Search city or municipality…"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Contact Details */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label className="form-label">Mobile Number</label>
                      <input
                        className={`form-control${errors.contact_no ? ' is-invalid' : ''}`}
                        value={form.contact_no ?? ''}
                        placeholder="0917-000-0000"
                        maxLength={13}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                          update('contact_no', formatContactNo(digits));
                        }}
                      />
                      {errors.contact_no && <div className="invalid-feedback">{errors.contact_no}</div>}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Telephone Number</label>
                      <input
                        className="form-control"
                        value={form.telephone_no ?? ''}
                        placeholder="(02) 8XXX-XXXX"
                        onChange={(e) => update('telephone_no', e.target.value)}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className={`form-control${errors.email ? ' is-invalid' : ''}`}
                        value={form.email ?? ''}
                        onChange={(e) => update('email', e.target.value)}
                      />
                      {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                    </div>
                  </div>

                  {/* Special Status */}
                  <div className="d-flex gap-4 mb-4">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="manual-senior" checked={form.is_senior ?? false} onChange={(e) => update('is_senior', e.target.checked)} />
                      <label className="form-check-label" htmlFor="manual-senior">Senior Citizen</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="manual-pwd" checked={form.is_pwd ?? false} onChange={(e) => update('is_pwd', e.target.checked)} />
                      <label className="form-check-label" htmlFor="manual-pwd">PWD</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="manual-pregnant" checked={form.is_pregnant ?? false} onChange={(e) => update('is_pregnant', e.target.checked)} />
                      <label className="form-check-label" htmlFor="manual-pregnant">Pregnant</label>
                    </div>
                  </div>

                  {/* Employment — only for non-anonymous */}
                  {!form.is_anonymous && (
                    <>
                      <p className="pacu-eyebrow mb-3">Employment</p>
                      <div className="row g-3 mb-4">
                        <div className="col-md-4">
                          <label className="form-label">Work Position / Occupation</label>
                          <input className="form-control" value={form.occupation ?? ''} onChange={(e) => update('occupation', e.target.value)} />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Date of Employment</label>
                          <input type="date" className="form-control" value={form.date_of_employment ?? ''} onChange={(e) => update('date_of_employment', e.target.value)} />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Union Member</label>
                          <select
                            className="form-select"
                            value={form.union_member === undefined ? '' : form.union_member ? 'yes' : 'no'}
                            onChange={(e) => update('union_member', e.target.value === '' ? undefined : e.target.value === 'yes')}
                          >
                            <option value="">Select…</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Company Details */}
                  <p className="pacu-eyebrow mb-3">Company Details</p>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Company Name</label>
                      <input className="form-control" value={form.employer ?? ''} onChange={(e) => update('employer', e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Company Address (City / Municipality)</label>
                      <SearchableSelect
                        options={cityOptions}
                        value={form.company_city_id ?? null}
                        onChange={(id) => update('company_city_id', id ?? undefined)}
                        placeholder="Search city or municipality…"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="form-label">Presence of Pending Labor Complaint / Case Against the Company</label>
                    <MultiSelectChips
                      options={PENDING_COMPLAINT_TYPES}
                      selected={form.pending_complaint_types ?? []}
                      onChange={(values) => update('pending_complaint_types', values as PendingComplaintType[])}
                      placeholder="Search complaint types…"
                    />
                    {form.pending_complaint_types?.includes('Others') && (
                      <div className="mt-2">
                        <input
                          className={`form-control${errors.pending_complaint_other ? ' is-invalid' : ''}`}
                          placeholder="Please specify…"
                          value={form.pending_complaint_other ?? ''}
                          onChange={(e) => update('pending_complaint_other', e.target.value)}
                        />
                        {errors.pending_complaint_other && <div className="invalid-feedback">{errors.pending_complaint_other}</div>}
                      </div>
                    )}
                  </div>

                  {/* Client's Stated Concern */}
                  <p className="pacu-eyebrow mb-3">Client's Stated Concern <span className="text-muted fw-normal" style={{ textTransform: 'none', letterSpacing: 0 }}>(Optional)</span></p>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Enter the client's own description of their concern…"
                    value={form.concern ?? ''}
                    onChange={(e) => update('concern', e.target.value)}
                  />

                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting && <span className="spinner-border spinner-border-sm me-2" />}
                    Add Client
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}
