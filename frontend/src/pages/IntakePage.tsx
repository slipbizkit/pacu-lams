import { useState } from 'react';
import Swal from 'sweetalert2';
import { clientService } from '../services/api';
import type { CivilStatus, ClientSex, IntakeBody, IntakeResult } from '../types/client';
import { BrandMark } from '../components/BrandMark';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

const EMPTY_FORM: IntakeBody = {
  first_name: '',
  middle_name: '',
  last_name: '',
  suffix: '',
  sex: undefined,
  birth_date: '',
  civil_status: undefined,
  contact_no: '',
  email: '',
  address: '',
  city: '',
  province: '',
  occupation: '',
  employer: '',
  concern: '',
  is_pwd: false,
  is_senior: false,
  is_pregnant: false,
};

export default function IntakePage() {
  const [form, setForm] = useState<IntakeBody>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<IntakeResult | null>(null);

  function update<K extends keyof IntakeBody>(key: K, value: IntakeBody[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await clientService.intake(form);
      setResult(data);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not submit', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setSubmitting(false);
    }
  }

  function startNewEntry() {
    setForm(EMPTY_FORM);
    setResult(null);
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="d-flex justify-content-between align-items-center p-4">
        <div className="d-flex align-items-center gap-2">
          <BrandMark size={30} />
          <span className="pacu-display fs-5">PACU Intake</span>
        </div>
        <ThemeSwitcher />
      </div>

      <div className="d-flex justify-content-center px-3 pb-5">
        <div style={{ width: '100%', maxWidth: 640 }}>
          {result ? (
            <div className="card">
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
            <form onSubmit={handleSubmit}>
              <h1 className="pacu-display mb-1">Welcome</h1>
              <p className="text-muted mb-4">Please tell us about yourself and what brings you in today.</p>

              <p className="pacu-eyebrow mb-3">Personal Information</p>
              <div className="row g-3 mb-2">
                <div className="col-md-4">
                  <label className="form-label">First name *</label>
                  <input className="form-control" value={form.first_name} onChange={(e) => update('first_name', e.target.value)} required autoFocus />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Middle name</label>
                  <input className="form-control" value={form.middle_name} onChange={(e) => update('middle_name', e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Last name *</label>
                  <input className="form-control" value={form.last_name} onChange={(e) => update('last_name', e.target.value)} required />
                </div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-md-3">
                  <label className="form-label">Suffix</label>
                  <input className="form-control" placeholder="Jr., Sr., III" value={form.suffix} onChange={(e) => update('suffix', e.target.value)} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Sex</label>
                  <select className="form-select" value={form.sex ?? ''} onChange={(e) => update('sex', (e.target.value || undefined) as ClientSex | undefined)}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Birth date</label>
                  <input type="date" className="form-control" value={form.birth_date} onChange={(e) => update('birth_date', e.target.value)} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Civil status</label>
                  <select
                    className="form-select"
                    value={form.civil_status ?? ''}
                    onChange={(e) => update('civil_status', (e.target.value || undefined) as CivilStatus | undefined)}
                  >
                    <option value="">Select</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="widowed">Widowed</option>
                    <option value="separated">Separated</option>
                    <option value="divorced">Divorced</option>
                  </select>
                </div>
              </div>

              <p className="pacu-eyebrow mb-3">Contact</p>
              <div className="row g-3 mb-2">
                <div className="col-md-6">
                  <label className="form-label">Contact number</label>
                  <input className="form-control" value={form.contact_no} onChange={(e) => update('contact_no', e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" value={form.email} onChange={(e) => update('email', e.target.value)} />
                </div>
              </div>
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="form-label">Address</label>
                  <input className="form-control" value={form.address} onChange={(e) => update('address', e.target.value)} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">City</label>
                  <input className="form-control" value={form.city} onChange={(e) => update('city', e.target.value)} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Province</label>
                  <input className="form-control" value={form.province} onChange={(e) => update('province', e.target.value)} />
                </div>
              </div>

              <p className="pacu-eyebrow mb-3">Employment</p>
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="form-label">Occupation</label>
                  <input className="form-control" value={form.occupation} onChange={(e) => update('occupation', e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Employer</label>
                  <input className="form-control" value={form.employer} onChange={(e) => update('employer', e.target.value)} />
                </div>
              </div>

              <p className="pacu-eyebrow mb-3">Your Concern</p>
              <div className="mb-4">
                <label className="form-label">What would you like help with today?</label>
                <textarea className="form-control" rows={4} value={form.concern} onChange={(e) => update('concern', e.target.value)} />
              </div>

              <div className="card mb-4">
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

              <button className="btn btn-primary w-100" type="submit" disabled={submitting}>
                {submitting ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                Join the Queue
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
