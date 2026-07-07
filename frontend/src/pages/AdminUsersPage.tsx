import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { userService } from '../services/api';
import type { User, UserRole } from '../types/user';

const ROLE_LABELS: Record<UserRole, string> = { admin: 'Admin', lawyer: 'Lawyer', personnel: 'Personnel', support_staff: 'Support Staff' };

const EMPTY_FORM = { username: '', first_name: '', middle_name: '', last_name: '', position: '', role: 'personnel' as UserRole };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setUsers(await userService.listAll());
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not load users', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function update<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { user, tempPassword } = await userService.create(form);
      setUsers((prev) => [...prev, user].sort((a, b) => a.last_name.localeCompare(b.last_name)));
      setForm(EMPTY_FORM);
      setShowForm(false);
      await Swal.fire({
        icon: 'success',
        title: 'Account created',
        html: `Share these credentials with <b>${user.first_name} ${user.last_name}</b>. They'll set up 2FA on first login.<br><br>
               Username: <code>${user.username}</code><br>Temporary password: <code>${tempPassword}</code>`,
        confirmButtonText: 'Got it',
      });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not create account', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(user: User) {
    const action = user.is_active ? 'Deactivate' : 'Activate';
    const result = await Swal.fire({
      icon: 'warning',
      title: `${action} ${user.first_name} ${user.last_name}?`,
      showCancelButton: true,
      confirmButtonText: action,
      confirmButtonColor: user.is_active ? 'var(--pacu-danger)' : 'var(--pacu-accent)',
    });
    if (!result.isConfirmed) return;

    try {
      const updated = await userService.update(user.user_id, { is_active: !user.is_active });
      setUsers((prev) => prev.map((u) => (u.user_id === updated.user_id ? updated : u)));
      Swal.fire({ icon: 'success', title: `${action}d`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not update account', text: err instanceof Error ? err.message : 'Please try again' });
    }
  }

  async function handleResetTotp(user: User) {
    const result = await Swal.fire({
      icon: 'warning',
      title: `Reset 2FA for ${user.first_name} ${user.last_name}?`,
      text: 'They will be forced through QR setup again on their next login.',
      showCancelButton: true,
      confirmButtonText: 'Reset 2FA',
      confirmButtonColor: 'var(--pacu-danger)',
    });
    if (!result.isConfirmed) return;

    try {
      const updated = await userService.resetTotp(user.user_id);
      setUsers((prev) => prev.map((u) => (u.user_id === updated.user_id ? updated : u)));
      Swal.fire({ icon: 'success', title: '2FA reset', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not reset 2FA', text: err instanceof Error ? err.message : 'Please try again' });
    }
  }

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-1">
        <h1 className="pacu-display mb-0">Users</h1>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          <i className="bi bi-person-plus me-2" />
          New Account
        </button>
      </div>
      <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
        PACU personnel, lawyer, and admin accounts. New accounts get a temporary password and set up 2FA on first login.
      </p>

      {showForm && (
        <div className="card mb-4">
          <div className="card-body p-4">
            <form onSubmit={handleCreate}>
              <div className="row g-3 mb-3">
                <div className="col-md-4">
                  <label className="form-label">Username *</label>
                  <input className="form-control" value={form.username} onChange={(e) => update('username', e.target.value)} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Role *</label>
                  <select className="form-select" value={form.role} onChange={(e) => update('role', e.target.value as UserRole)}>
                    <option value="personnel">Personnel</option>
                    <option value="lawyer">Lawyer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Position</label>
                  <input className="form-control" value={form.position} onChange={(e) => update('position', e.target.value)} />
                </div>
              </div>
              <div className="row g-3 mb-3">
                <div className="col-md-4">
                  <label className="form-label">First name *</label>
                  <input className="form-control" value={form.first_name} onChange={(e) => update('first_name', e.target.value)} required />
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
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                Create Account
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
                  <th className="ps-4">Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>2FA</th>
                  <th>Status</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.user_id}>
                    <td className="ps-4">{u.first_name} {u.last_name}</td>
                    <td className="pacu-mono text-muted">{u.username}</td>
                    <td><span className="pacu-badge">{ROLE_LABELS[u.role]}</span></td>
                    <td>{u.totp_enabled ? <i className="bi bi-shield-check text-success" /> : <span className="text-muted">Not set up</span>}</td>
                    <td>
                      {u.is_active ? <span className="text-success">Active</span> : <span className="text-muted">Inactive</span>}
                    </td>
                    <td className="text-end pe-4">
                      <div className="d-flex gap-2 justify-content-end">
                        {u.totp_enabled && (
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => handleResetTotp(u)}>
                            Reset 2FA
                          </button>
                        )}
                        <button
                          className={`btn btn-sm ${u.is_active ? 'btn-outline-danger' : 'btn-outline-secondary'}`}
                          onClick={() => handleToggleActive(u)}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
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
