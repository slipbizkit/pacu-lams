import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { userService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { User, UserRole, UserSex } from '../types/user';

const ROLE_LABELS: Record<UserRole, string> = { admin: 'Admin', lawyer: 'Lawyer', personnel: 'Personnel', support_staff: 'Support Staff' };

const EMPTY_FORM = { email: '', first_name: '', middle_name: '', last_name: '', position: '', sex: '' as UserSex | '', role: 'personnel' as UserRole };

// ── Three-dot dropdown ────────────────────────────────────────────────────────
// Portal-rendered with fixed coordinates so it isn't clipped by table overflow.

interface ActionsDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  user: User;
  isSelf: boolean;
  onResetPassword: () => void;
  onResetTotp: () => void;
  onToggleActive: () => void;
}

const MENU_WIDTH = 200;

function ActionsDropdown({ isOpen, onToggle, onClose, user, isSelf, onResetPassword, onResetTotp, onToggleActive }: ActionsDropdownProps) {
  if (isSelf) return <span className="text-muted" style={{ fontSize: '0.8rem' }}>—</span>;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // ~40px per item + a little padding; enough to decide flip-up near the viewport bottom.
  const itemCount = (user.is_active ? 1 : 0) + (user.totp_enabled ? 1 : 0) + 1;

  function measure() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const MENU_HEIGHT = itemCount * 40 + 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < MENU_HEIGHT ? rect.top - MENU_HEIGHT : rect.bottom + 4;
    setPos({ top, left: Math.max(8, rect.right - MENU_WIDTH) });
  }

  function handleToggle() {
    if (!isOpen) measure();
    onToggle();
  }

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) onClose();
    }
    function handleDismiss() { onClose(); }
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [isOpen, onClose]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Actions"
      >
        <i className="bi bi-three-dots" />
      </button>
      {isOpen && pos &&
        createPortal(
          <ul
            ref={menuRef}
            className="dropdown-menu show shadow-sm"
            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 1070, minWidth: MENU_WIDTH }}
          >
            {user.is_active && (
              <li>
                <button className="dropdown-item" onClick={() => { onClose(); onResetPassword(); }}>
                  <i className="bi bi-key me-2 text-primary" />
                  Reset Password
                </button>
              </li>
            )}
            {user.totp_enabled && (
              <li>
                <button className="dropdown-item" onClick={() => { onClose(); onResetTotp(); }}>
                  <i className="bi bi-shield-x me-2 text-warning" />
                  Reset 2FA
                </button>
              </li>
            )}
            <li>
              <button
                className={`dropdown-item${user.is_active ? ' text-danger' : ''}`}
                onClick={() => { onClose(); onToggleActive(); }}
              >
                <i className={`bi ${user.is_active ? 'bi-person-slash' : 'bi-person-check'} me-2`} />
                {user.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </li>
          </ul>,
          document.body
        )
      }
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

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

  // Reset form whenever the modal opens
  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    const handler = () => setForm(EMPTY_FORM);
    el.addEventListener('show.bs.modal', handler);
    return () => el.removeEventListener('show.bs.modal', handler);
  }, []);

  function getModalInstance() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BS = (window as any).bootstrap;
    return BS ? BS.Modal.getOrCreateInstance(modalRef.current!) : null;
  }

  function hideModal() {
    getModalInstance()?.hide();
  }

  function update<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { user, tempPassword } = await userService.create({
        ...form,
        sex: form.sex || undefined,
      });
      setUsers((prev) => [...prev, user].sort((a, b) => a.last_name.localeCompare(b.last_name)));
      hideModal();
      await Swal.fire({
        icon: 'success',
        title: 'Account created',
        html: `Share these credentials with <b>${user.first_name} ${user.last_name}</b>. They'll set up 2FA on first login.<br><br>
               Email: <code>${user.email}</code><br>Temporary password: <code>${tempPassword}</code>`,
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

  async function handleResetPassword(user: User) {
    const result = await Swal.fire({
      icon: 'warning',
      title: `Reset password for ${user.first_name} ${user.last_name}?`,
      html: `A new temporary password will be emailed to <b>${user.email}</b>.<br>
             Their 2FA will be removed, and they'll set a new password and 2FA on next login.`,
      showCancelButton: true,
      confirmButtonText: 'Reset password',
      confirmButtonColor: 'var(--pacu-danger)',
    });
    if (!result.isConfirmed) return;

    try {
      const { user: updated, tempPassword, emailSent } = await userService.resetPassword(user.user_id);
      setUsers((prev) => prev.map((u) => (u.user_id === updated.user_id ? updated : u)));
      await Swal.fire({
        icon: emailSent ? 'success' : 'warning',
        title: emailSent ? 'Password reset' : 'Password reset — email not sent',
        html: emailSent
          ? `A temporary password was emailed to <b>${updated.email}</b>.<br><br>
             In case they don't receive it, the temporary password is:<br><code>${tempPassword}</code>`
          : `The password was reset, but the email could not be sent. Share this temporary password with
             <b>${updated.first_name} ${updated.last_name}</b> directly:<br><br><code>${tempPassword}</code>`,
        confirmButtonText: 'Got it',
      });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not reset password', text: err instanceof Error ? err.message : 'Please try again' });
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
        <button className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#newAccountModal">
          <i className="bi bi-person-plus me-2" />
          New Account
        </button>
      </div>
      <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
        PACU personnel, lawyer, and admin accounts. New accounts get a temporary password and set up 2FA on first login.
      </p>

      {/* New Account Modal */}
      <div className="modal fade" id="newAccountModal" ref={modalRef} tabIndex={-1} aria-labelledby="newAccountModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="newAccountModalLabel">
                <i className="bi bi-person-plus me-2" />
                New Account
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body p-4">
                <div className="row g-3 mb-3">
                  <div className="col-md-8">
                    <label className="form-label">Email address *</label>
                    <input className="form-control" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="user@example.com" required />
                    <div className="form-text">Used to log in to the system.</div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Sex *</label>
                    <select className="form-select" value={form.sex} onChange={(e) => update('sex', e.target.value as UserSex | '')} required>
                      <option value="" disabled>Nothing is Selected</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Role *</label>
                    <select className="form-select" value={form.role} onChange={(e) => update('role', e.target.value as UserRole)}>
                      <option value="personnel">Personnel</option>
                      <option value="lawyer">Lawyer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Position *</label>
                    <input className="form-control" value={form.position} onChange={(e) => update('position', e.target.value)} required />
                  </div>
                </div>
                <div className="row g-3">
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
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button className="btn btn-primary" type="submit" disabled={submitting}>
                  {submitting ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

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
                  <th>Email</th>
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
                    <td className="text-muted" style={{ fontSize: '0.875rem' }}>{u.email}</td>
                    <td><span className="pacu-badge">{ROLE_LABELS[u.role]}</span></td>
                    <td>{u.totp_enabled ? <i className="bi bi-shield-check text-success" /> : <span className="text-muted">Not set up</span>}</td>
                    <td>
                      {u.is_active ? <span className="text-success">Active</span> : <span className="text-muted">Inactive</span>}
                    </td>
                    <td className="text-end pe-4" style={{ position: 'relative' }}>
                      <ActionsDropdown
                        isOpen={openDropdownId === u.user_id}
                        onToggle={() => setOpenDropdownId((prev) => (prev === u.user_id ? null : u.user_id))}
                        onClose={() => setOpenDropdownId(null)}
                        user={u}
                        isSelf={u.user_id === currentUser?.user_id}
                        onResetPassword={() => handleResetPassword(u)}
                        onResetTotp={() => handleResetTotp(u)}
                        onToggleActive={() => handleToggleActive(u)}
                      />
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
