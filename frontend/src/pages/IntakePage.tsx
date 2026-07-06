import { Fragment, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { clientService, lookupService } from '../services/api';
import type { CityMunicipality, ClientSex, IntakeBody, IntakeResult, PendingComplaintType } from '../types/client';
import { PENDING_COMPLAINT_TYPES } from '../types/client';
import { BrandMark } from '../components/BrandMark';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { SearchableSelect } from '../components/SearchableSelect';
import { MultiSelectChips } from '../components/MultiSelectChips';

const EMPTY_FORM: IntakeBody = {
  first_name: '',
  middle_name: '',
  last_name: '',
  suffix: '',
  sex: undefined,
  contact_no: '',
  email: '',
  city_id: undefined,
  occupation: '',
  date_of_employment: '',
  union_member: undefined,
  employer: '',
  company_city_id: undefined,
  pending_complaint_types: [],
  is_pwd: false,
  is_senior: false,
  is_pregnant: false,
};

const STEP_TITLES = ['Client Information', 'Employment & Status', 'Company Details', 'Review'];
const TOTAL_STEPS = STEP_TITLES.length;

type FieldErrors = Partial<Record<keyof IntakeBody, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateStep(step: number, form: IntakeBody): FieldErrors {
  const errors: FieldErrors = {};

  if (step === 0) {
    if (!form.first_name?.trim()) errors.first_name = 'First name is required';
    if (!form.last_name?.trim()) errors.last_name = 'Last name is required';
    if (form.email?.trim() && !EMAIL_PATTERN.test(form.email.trim())) {
      errors.email = 'Enter a valid email address';
    }
  }

  return errors;
}

export default function IntakePage() {
  const [form, setForm] = useState<IntakeBody>(EMPTY_FORM);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [cities, setCities] = useState<CityMunicipality[]>([]);

  useEffect(() => {
    lookupService.citiesMunicipalities()
      .then(setCities)
      .catch((err) => {
        Swal.fire({
          icon: 'error',
          title: 'Could not load cities',
          text: err instanceof Error ? err.message : 'Please try again',
        });
      });
  }, []);

  function update<K extends keyof IntakeBody>(key: K, value: IntakeBody[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function goNext() {
    const stepErrors = validateStep(step, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      setShake(true);
      setTimeout(() => setShake(false), 420);
      return;
    }
    setErrors({});
    setDirection('forward');
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function goBack() {
    setErrors({});
    setDirection('back');
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const confirm = await Swal.fire({
      icon: 'warning',
      title: 'Confirm Submission',
      text: 'Please review the information carefully. Are you sure all the details you have provided are complete and correct?',
      showCancelButton: true,
      confirmButtonText: 'Yes, Submit',
      cancelButtonText: 'Cancel',
      confirmButtonColor: 'var(--pacu-accent)',
    });
    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    try {
      const data = await clientService.intake(form);
      setResult(data);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Could not submit',
        text: err instanceof Error ? err.message : 'Please try again',
      });
      setDirection('back');
      setStep(0);
    } finally {
      setSubmitting(false);
    }
  }

  function startNewEntry() {
    setForm(EMPTY_FORM);
    setErrors({});
    setStep(0);
    setResult(null);
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="d-flex justify-content-between align-items-center p-4">
        <div className="d-flex align-items-center gap-2">
          <BrandMark size={30} />
          <span className="pacu-display fs-5">Assistance Form</span>
        </div>
        <ThemeSwitcher />
      </div>

      <div className="d-flex justify-content-center px-3 pb-5">
        <div className="pacu-intake-shell">
          {result ? (
            <div className="card pacu-auth-success">
              <div className="card-body p-5 text-center">
                <p className="pacu-eyebrow mb-2">You're in the queue</p>
                <div className="pacu-display pacu-mono" style={{ fontSize: '4.5rem', lineHeight: 1, color: 'var(--pacu-accent)' }}>
                  {result.queue_number}
                </div>
                <p className="text-muted mb-4">Please have a seat. You'll be called by this number.</p>
                <p className="mb-4">
                  Reference number: <code className="pacu-mono">{result.reference_no}</code>
                </p>
                <button className="btn btn-primary" onClick={startNewEntry}>
                  <i className="bi bi-plus-lg me-2" />
                  Start a New Entry
                </button>
              </div>
            </div>
          ) : (
            <div className="card pacu-intake-card">
              <div className="card-body p-4 p-md-5">
                <form onSubmit={handleSubmit}>
                  <h1 className="pacu-display mb-1">Welcome</h1>
                  <p className="text-muted mb-4">Please tell us about yourself and what brings you in today.</p>

                  <div className="pacu-stepper mb-4">
                    {STEP_TITLES.map((title, idx) => (
                      <Fragment key={title}>
                        <div
                          className={`pacu-step${idx === step ? ' is-active' : ''}${idx < step ? ' is-done' : ''}`}
                        >
                          <div className="pacu-step-circle">
                            {idx < step ? <i className="bi bi-check-lg" /> : idx + 1}
                          </div>
                          <div className="pacu-step-label">{title}</div>
                        </div>
                        {idx < TOTAL_STEPS - 1 && (
                          <div className={`pacu-step-connector${idx < step ? ' is-done' : ''}`} />
                        )}
                      </Fragment>
                    ))}
                  </div>

                  <div
                    key={step}
                    data-dir={direction}
                    className={`pacu-wizard-step${shake ? ' pacu-wizard-shake' : ''}`}
                  >
                    {step === 0 && (
                      <ClientInfoStep form={form} update={update} errors={errors} cities={cities} />
                    )}
                    {step === 1 && (
                      <EmploymentStatusStep form={form} update={update} />
                    )}
                    {step === 2 && (
                      <CompanyDetailsStep form={form} update={update} cities={cities} />
                    )}
                    {step === 3 && <ReviewStep form={form} cities={cities} />}
                  </div>

                  <div className="pacu-wizard-nav">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={goBack}
                      disabled={step === 0}
                      style={{ visibility: step === 0 ? 'hidden' : 'visible' }}
                    >
                      <i className="bi bi-arrow-left me-2" />
                      Previous
                    </button>

                    {step < TOTAL_STEPS - 1 ? (
                      <button key="next" type="button" className="btn btn-primary" onClick={goNext}>
                        Next
                        <i className="bi bi-arrow-right ms-2" />
                      </button>
                    ) : (
                      <button key="submit" className="btn btn-primary" type="submit" disabled={submitting}>
                        {submitting ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                        Submit Intake
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Client Information
// ---------------------------------------------------------------------------

interface StepProps {
  form: IntakeBody;
  update: <K extends keyof IntakeBody>(key: K, value: IntakeBody[K]) => void;
}

// Dozens of city/municipality names repeat across provinces (e.g. "San Jose" appears 9
// times) — disambiguate same-named entries with their province so the single dropdown
// stays usable, without adding a separate province input.
function toCityOptions(cities: CityMunicipality[]) {
  const nameCounts = new Map<string, number>();
  for (const c of cities) {
    nameCounts.set(c.city_municipality, (nameCounts.get(c.city_municipality) ?? 0) + 1);
  }
  return cities.map((c) => ({
    id: c.id,
    label: (nameCounts.get(c.city_municipality) ?? 0) > 1 ? `${c.city_municipality} (${c.province})` : c.city_municipality,
  }));
}

function ClientInfoStep({ form, update, errors, cities }: StepProps & { errors: FieldErrors; cities: CityMunicipality[] }) {
  return (
    <>
      <p className="pacu-eyebrow mb-3">Name of Client / Pangalan ng Kliyente</p>
      <div className="row g-3 mb-2">
        <div className="col-sm-6 col-lg-4">
          <label className="form-label">First name *</label>
          <div className={`pacu-wizard-field${errors.first_name ? ' is-error' : ''}`}>
            <input
              className="form-control"
              value={form.first_name}
              onChange={(e) => update('first_name', e.target.value)}
              autoFocus
            />
            {errors.first_name && (
              <div className="pacu-wizard-error"><i className="bi bi-exclamation-circle" />{errors.first_name}</div>
            )}
          </div>
        </div>
        <div className="col-sm-6 col-lg-4">
          <label className="form-label">Middle name</label>
          <input className="form-control" value={form.middle_name} onChange={(e) => update('middle_name', e.target.value)} />
        </div>
        <div className="col-sm-6 col-lg-4">
          <label className="form-label">Last name *</label>
          <div className={`pacu-wizard-field${errors.last_name ? ' is-error' : ''}`}>
            <input className="form-control" value={form.last_name} onChange={(e) => update('last_name', e.target.value)} />
            {errors.last_name && (
              <div className="pacu-wizard-error"><i className="bi bi-exclamation-circle" />{errors.last_name}</div>
            )}
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-3">
          <label className="form-label">Suffix</label>
          <input className="form-control" placeholder="Jr., Sr., III" value={form.suffix} onChange={(e) => update('suffix', e.target.value)} />
        </div>
        <div className="col-sm-6 col-lg-3">
          <label className="form-label">Sex</label>
          <select className="form-select" value={form.sex ?? ''} onChange={(e) => update('sex', (e.target.value || undefined) as ClientSex | undefined)}>
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div className="col-sm-6 col-lg-3">
          <label className="form-label">Contact number</label>
          <input className="form-control" value={form.contact_no} onChange={(e) => update('contact_no', e.target.value)} />
        </div>
        <div className="col-sm-6 col-lg-3">
          <label className="form-label">Email</label>
          <div className={`pacu-wizard-field${errors.email ? ' is-error' : ''}`}>
            <input type="email" className="form-control" value={form.email} onChange={(e) => update('email', e.target.value)} />
            {errors.email && (
              <div className="pacu-wizard-error"><i className="bi bi-exclamation-circle" />{errors.email}</div>
            )}
          </div>
        </div>
      </div>

      <p className="pacu-eyebrow mb-3">Address / Tirahan</p>
      <div className="mb-2">
        <label className="form-label">City/Municipality</label>
        <SearchableSelect
          options={toCityOptions(cities)}
          value={form.city_id ?? null}
          onChange={(id) => update('city_id', id ?? undefined)}
          placeholder="Search for a city or municipality…"
        />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Employment & Status
// ---------------------------------------------------------------------------

function EmploymentStatusStep({ form, update }: StepProps) {
  return (
    <>
      <p className="pacu-eyebrow mb-3">Employment</p>
      <div className="row g-3 mb-4">
        <div className="col-sm-6">
          <label className="form-label">Work Position / Posisyon sa Trabaho</label>
          <input className="form-control" value={form.occupation} onChange={(e) => update('occupation', e.target.value)} />
        </div>
        <div className="col-sm-6">
          <label className="form-label">Date of Employment / Kailan Nakapasok sa Trabaho</label>
          <input
            type="date"
            className="form-control"
            value={form.date_of_employment}
            onChange={(e) => update('date_of_employment', e.target.value)}
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="form-label d-block">Union Membership / Miyembro ng Unyon ng Manggagawa</label>
        <div className="d-flex gap-4">
          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name="union_member"
              id="union_member_yes"
              checked={form.union_member === true}
              onChange={() => update('union_member', true)}
            />
            <label className="form-check-label" htmlFor="union_member_yes">Yes</label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name="union_member"
              id="union_member_no"
              checked={form.union_member === false}
              onChange={() => update('union_member', false)}
            />
            <label className="form-check-label" htmlFor="union_member_no">No</label>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-3">
          <p className="pacu-eyebrow mb-3">Does any of this apply to you?</p>
          <div className="d-flex flex-wrap gap-4">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="is_senior" checked={form.is_senior} onChange={(e) => update('is_senior', e.target.checked)} />
              <label className="form-check-label" htmlFor="is_senior">Senior citizen</label>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="is_pwd" checked={form.is_pwd} onChange={(e) => update('is_pwd', e.target.checked)} />
              <label className="form-check-label" htmlFor="is_pwd">Person with disability</label>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="is_pregnant" checked={form.is_pregnant} onChange={(e) => update('is_pregnant', e.target.checked)} />
              <label className="form-check-label" htmlFor="is_pregnant">Pregnant</label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Company Details
// ---------------------------------------------------------------------------

function CompanyDetailsStep({ form, update, cities }: StepProps & { cities: CityMunicipality[] }) {
  return (
    <>
      <p className="pacu-eyebrow mb-3">Company Details</p>
      <div className="row g-3 mb-4">
        <div className="col-lg-6">
          <label className="form-label">Name of Company / Pangalan ng Kumpanya</label>
          <input className="form-control" value={form.employer} onChange={(e) => update('employer', e.target.value)} />
        </div>

        <div className="col-lg-6">
          <label className="form-label">Address of Company (City/Municipality)</label>
          <SearchableSelect
            options={toCityOptions(cities)}
            value={form.company_city_id ?? null}
            onChange={(id) => update('company_city_id', id ?? undefined)}
            placeholder="Search for a city or municipality…"
          />
        </div>
      </div>

      <div className="mb-2">
        <label className="form-label">Presence of Pending Labor Complaint/Case Against the Company</label>
        <MultiSelectChips
          options={PENDING_COMPLAINT_TYPES}
          selected={form.pending_complaint_types ?? []}
          onChange={(values) => update('pending_complaint_types', values as PendingComplaintType[])}
          placeholder="Search complaint types…"
        />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Review & Submit
// ---------------------------------------------------------------------------

function ReviewStep({ form, cities }: { form: IntakeBody; cities: CityMunicipality[] }) {
  const fullName = [form.first_name, form.middle_name, form.last_name, form.suffix].filter(Boolean).join(' ');
  const cityName = cities.find((c) => c.id === form.city_id)?.city_municipality;
  const companyCityName = cities.find((c) => c.id === form.company_city_id)?.city_municipality;

  return (
    <>
      <p className="text-muted mb-4">Please review your information before submitting.</p>

      <div className="pacu-wizard-review-section mb-4">
        <p className="pacu-eyebrow mb-2">Client Information</p>
        <div className="card">
          <div className="card-body p-3">
            <div className="pacu-wizard-review-row"><span className="text-muted">Name</span><span className="fw-medium">{fullName || '—'}</span></div>
            <div className="pacu-wizard-review-row"><span className="text-muted">Sex</span><span className="fw-medium text-capitalize">{form.sex ?? '—'}</span></div>
            <div className="pacu-wizard-review-row"><span className="text-muted">Contact number</span><span className="fw-medium">{form.contact_no || '—'}</span></div>
            <div className="pacu-wizard-review-row"><span className="text-muted">Email</span><span className="fw-medium">{form.email || '—'}</span></div>
            <div className="pacu-wizard-review-row"><span className="text-muted">Address</span><span className="fw-medium">{cityName || '—'}</span></div>
            <div className="pacu-wizard-review-row"><span className="text-muted">Work Position</span><span className="fw-medium">{form.occupation || '—'}</span></div>
            <div className="pacu-wizard-review-row"><span className="text-muted">Date of Employment</span><span className="fw-medium">{form.date_of_employment || '—'}</span></div>
            <div className="pacu-wizard-review-row">
              <span className="text-muted">Union Membership</span>
              <span className="fw-medium">{form.union_member === undefined ? '—' : form.union_member ? 'Yes' : 'No'}</span>
            </div>
            <div className="pacu-wizard-review-row">
              <span className="text-muted">Special status</span>
              <span className="fw-medium">
                {[form.is_senior && 'Senior citizen', form.is_pwd && 'PWD', form.is_pregnant && 'Pregnant'].filter(Boolean).join(', ') || '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="pacu-wizard-review-section">
        <p className="pacu-eyebrow mb-2">Company Details</p>
        <div className="card">
          <div className="card-body p-3">
            <div className="pacu-wizard-review-row"><span className="text-muted">Company Name</span><span className="fw-medium">{form.employer || '—'}</span></div>
            <div className="pacu-wizard-review-row"><span className="text-muted">Company Address</span><span className="fw-medium">{companyCityName || '—'}</span></div>
            <div className="pacu-wizard-review-row">
              <span className="text-muted">Pending Labor Complaint/Case</span>
              <span className="d-flex flex-wrap gap-1 justify-content-end">
                {form.pending_complaint_types && form.pending_complaint_types.length > 0 ? (
                  form.pending_complaint_types.map((t) => (
                    <span key={t} className="pacu-badge">{t}</span>
                  ))
                ) : (
                  <span className="fw-medium">—</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
