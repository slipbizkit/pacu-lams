import { useState } from 'react';
import Swal from 'sweetalert2';
import { authService } from '../services/api';

const RULES = [
  { label: 'At least 12 characters', test: (v: string) => v.length >= 12 },
  { label: 'Contains uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Contains lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'Contains number', test: (v: string) => /[0-9]/.test(v) },
  { label: 'Contains symbol', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

function allRulesMet(v: string) {
  return RULES.every((r) => r.test(v));
}

export default function MyAccountPage() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allRulesMet(form.next)) {
      Swal.fire({ icon: 'error', title: 'Password too weak', text: 'Please meet all password requirements.' });
      return;
    }
    if (form.next !== form.confirm) {
      Swal.fire({ icon: 'error', title: 'Passwords do not match', text: 'New password and confirmation must be the same.' });
      return;
    }

    setSubmitting(true);
    try {
      await authService.changePassword(form.current, form.next);
      Swal.fire({ icon: 'success', title: 'Password changed', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
      setForm({ current: '', next: '', confirm: '' });
      setShowChecklist(false);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not change password', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="pacu-display mb-1">My Account</h1>
        <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
          Manage your account settings.
        </p>
      </div>

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="card">
            <div className="card-header py-3 px-4">
              <span className="fw-semibold" style={{ fontSize: '0.9rem' }}>Change Password</span>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label" style={{ fontSize: '0.85rem' }}>Current Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={form.current}
                    onChange={(e) => update('current', e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label" style={{ fontSize: '0.85rem' }}>New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={form.next}
                    onChange={(e) => update('next', e.target.value)}
                    onFocus={() => setShowChecklist(true)}
                    required
                    autoComplete="new-password"
                  />
                  {showChecklist && (
                    <ul className="list-unstyled mt-2 mb-0" style={{ fontSize: '0.8rem' }}>
                      {RULES.map((rule) => {
                        const met = rule.test(form.next);
                        return (
                          <li key={rule.label} style={{ color: met ? 'var(--bs-success)' : 'var(--bs-danger)' }}>
                            <i className={`bi ${met ? 'bi-check-circle-fill' : 'bi-x-circle-fill'} me-1`} />
                            {rule.label}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="mb-4">
                  <label className="form-label" style={{ fontSize: '0.85rem' }}>Confirm New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={form.confirm}
                    onChange={(e) => update('confirm', e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <button type="submit" className="btn btn-sm btn-primary" disabled={submitting}>
                  {submitting ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : 'Change Password'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
