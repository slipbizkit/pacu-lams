import { type FormEvent, useState } from 'react';
import Swal from 'sweetalert2';
import { terminalService } from '../services/api';

export default function AdminSettingsPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      Swal.fire({ icon: 'error', title: 'Passwords do not match', text: 'Please re-enter the passwords.' });
      return;
    }
    setLoading(true);
    try {
      await terminalService.setPassword(password);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Terminal password updated', timer: 3000, showConfirmButton: false });
      setPassword('');
      setConfirm('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password';
      Swal.fire({ icon: 'error', title: 'Error', text: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-fluid py-4">
      <h2 className="h5 fw-bold mb-1">Settings</h2>
      <p className="text-muted small mb-4">System-wide configuration.</p>

      <div className="card border shadow-sm" style={{ maxWidth: 480 }}>
        <div className="card-header py-3">
          <h3 className="h6 fw-semibold mb-0">
            <i className="bi bi-tv me-2 text-primary" />
            Terminal Password
          </h3>
          <p className="text-muted small mb-0 mt-1">
            Used to unlock the intake form and the queue board TV. Enter once per device; valid for 16 hours.
          </p>
        </div>
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="tp-password" className="form-label fw-semibold">New password</label>
              <input
                id="tp-password"
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
              />
              <div className="form-text">Minimum 8 characters.</div>
            </div>
            <div className="mb-4">
              <label htmlFor="tp-confirm" className="form-label fw-semibold">Confirm password</label>
              <input
                id="tp-confirm"
                type="password"
                className="form-control"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ backgroundColor: 'var(--pacu-accent)', border: 'none' }}
              disabled={loading || !password || !confirm}
            >
              {loading ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : null}
              {loading ? 'Saving…' : 'Set Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
