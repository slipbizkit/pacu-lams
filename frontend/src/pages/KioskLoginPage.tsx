import { type FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { terminalService } from '../services/api';

export default function TerminalLoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const redirect = searchParams.get('redirect') || '/intake';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { token } = await terminalService.login(password);
      localStorage.setItem('terminal_token', token);
      navigate(redirect, { replace: true });
    } catch {
      Swal.fire({ icon: 'error', title: 'Access denied', text: 'Incorrect password. Please try again.' });
      setPassword('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--pacu-bg)',
        padding: '1.5rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div className="text-center mb-4">
          <img src="/dole-logo.png" alt="DOLE" style={{ width: 56, height: 56, objectFit: 'contain' }} />
          <h1 className="h5 mt-3 mb-1 fw-bold">Terminal Access</h1>
          <p className="text-muted small mb-0">Enter the terminal password to continue.</p>
        </div>

        <div className="card border shadow-sm">
          <div className="card-body p-4">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="terminal-password" className="form-label fw-semibold">
                  Password
                </label>
                <input
                  id="terminal-password"
                  type="password"
                  className="form-control form-control-lg"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  required
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w-100"
                style={{ backgroundColor: 'var(--pacu-accent)', border: 'none' }}
                disabled={loading || !password}
              >
                {loading ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : null}
                {loading ? 'Verifying…' : 'Continue'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
