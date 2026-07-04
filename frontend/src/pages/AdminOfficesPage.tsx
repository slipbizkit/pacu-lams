import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { lookupService } from '../services/api';
import type { ReferredOffice } from '../types/client';

const EMPTY_FORM = { office_name: '', office_type: '' };

export default function AdminOfficesPage() {
  const [offices, setOffices] = useState<ReferredOffice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setOffices(await lookupService.allReferredOffices());
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not load referral offices', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await lookupService.createReferredOffice(form);
      setOffices((prev) => [...prev, created].sort((a, b) => a.office_name.localeCompare(b.office_name)));
      setForm(EMPTY_FORM);
      setShowForm(false);
      Swal.fire({ icon: 'success', title: 'Office added', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not add office', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(office: ReferredOffice) {
    const action = office.is_active ? 'Deactivate' : 'Activate';
    const result = await Swal.fire({
      icon: 'warning',
      title: `${action} "${office.office_name}"?`,
      showCancelButton: true,
      confirmButtonText: action,
      confirmButtonColor: office.is_active ? 'var(--pacu-danger)' : 'var(--pacu-accent)',
    });
    if (!result.isConfirmed) return;

    try {
      const updated = await lookupService.updateReferredOffice(office.office_id, { is_active: !office.is_active });
      setOffices((prev) => prev.map((o) => (o.office_id === updated.office_id ? updated : o)));
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not update office', text: err instanceof Error ? err.message : 'Please try again' });
    }
  }

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-1">
        <h1 className="pacu-display mb-0">Referral Offices</h1>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          <i className="bi bi-plus-lg me-2" />
          New Office
        </button>
      </div>
      <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
        Offices lawyers can refer a client to, when a referral is needed.
      </p>

      {showForm && (
        <div className="card mb-4">
          <div className="card-body p-4">
            <form onSubmit={handleCreate}>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label">Office name *</label>
                  <input className="form-control" value={form.office_name} onChange={(e) => setForm({ ...form, office_name: e.target.value })} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Office type</label>
                  <input className="form-control" placeholder="e.g. Adjudication" value={form.office_type} onChange={(e) => setForm({ ...form, office_type: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                Add Office
              </button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead>
                <tr>
                  <th className="ps-4">Office</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {offices.map((o) => (
                  <tr key={o.office_id}>
                    <td className="ps-4">{o.office_name}</td>
                    <td className="text-muted">{o.office_type || '—'}</td>
                    <td>{o.is_active ? <span className="text-success">Active</span> : <span className="text-muted">Inactive</span>}</td>
                    <td className="text-end pe-4">
                      <button
                        className={`btn btn-sm ${o.is_active ? 'btn-outline-danger' : 'btn-outline-secondary'}`}
                        onClick={() => handleToggleActive(o)}
                      >
                        {o.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
