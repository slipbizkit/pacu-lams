import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { BrandMark } from '../components/BrandMark';

type Step = 'credentials' | 'totp' | 'totp-setup';

const FEATURES = [
  { icon: 'bi-people', label: 'Queue & intake' },
  { icon: 'bi-chat-square-text', label: 'Consultation records' },
  { icon: 'bi-signpost-2', label: 'Referrals & reports' },
];

export default function LoginPage() {
  const [step, setStep] = useState<Step>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authService.login(username, password);
      if (data.requiresTOTP && data.tempToken) {
        setTempToken(data.tempToken);
        setStep('totp');
      } else if (data.requiresTOTPSetup && data.tempToken) {
        setTempToken(data.tempToken);
        setStep('totp-setup');
      } else if (data.token) {
        auth.login(data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Login failed', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setLoading(false);
    }
  }

  // Fetch the QR code as soon as we land on the forced-setup step.
  useEffect(() => {
    if (step !== 'totp-setup' || !tempToken) return;
    authService
      .setupInit(tempToken)
      .then((data) => {
        setQrCode(data.qrCode);
        setSecret(data.secret);
      })
      .catch((err) => {
        Swal.fire({ icon: 'error', title: 'Could not start 2FA setup', text: err instanceof Error ? err.message : 'Please try again' });
        setStep('credentials');
      });
  }, [step, tempToken]);

  async function handleTotp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authService.verifyTotp(tempToken, code);
      if (data.token) {
        auth.login(data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Verification failed', text: err instanceof Error ? err.message : 'Invalid code' });
    } finally {
      setLoading(false);
    }
  }

  async function handleTotpSetupConfirm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authService.setupConfirm(tempToken, code);
      if (data.token) {
        Swal.fire({
          icon: 'success',
          title: '2FA enabled',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
        });
        auth.login(data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Setup failed', text: err instanceof Error ? err.message : 'Invalid code' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      {/* Brand panel — a fixed institutional identity that doesn't shift with the
          interface theme, deliberately distinct from the themed form panel. */}
      <div
        className="d-none d-lg-flex flex-column justify-content-between p-5"
        style={{
          width: 440,
          flexShrink: 0,
          backgroundColor: '#4c1d95',
          color: '#f5f3ff',
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <BrandMark size={36} />
          <span className="pacu-display fs-4">PACU</span>
        </div>

        <div>
          <p className="pacu-eyebrow mb-3" style={{ color: '#c4b5fd' }}>
            DOLE &middot; Public Assistance and Complaints Unit
          </p>
          <h1 className="pacu-display mb-3" style={{ fontSize: '2.25rem', color: '#f5f3ff' }}>
            Every case, properly recorded.
          </h1>
          <p style={{ color: '#ddd6fe', fontSize: '0.95rem' }}>
            Sign in to manage intake, consultations, and referrals for walk-in clients.
          </p>
        </div>

        <ul className="list-unstyled d-flex flex-column gap-3 mb-0">
          {FEATURES.map((f) => (
            <li key={f.label} className="d-flex align-items-center gap-3">
              <span
                className="d-inline-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(196, 181, 253, 0.18)', color: '#ddd6fe' }}
              >
                <i className={`bi ${f.icon}`} />
              </span>
              <span style={{ fontSize: '0.9rem', color: '#ede9fe' }}>{f.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Form panel */}
      <div className="flex-grow-1 d-flex flex-column">
        <div className="d-flex justify-content-between align-items-center p-4">
          <div className="d-lg-none d-flex align-items-center gap-2">
            <BrandMark size={28} />
            <span className="pacu-display fs-5">PACU</span>
          </div>
          <div className="ms-auto">
            <ThemeSwitcher />
          </div>
        </div>

        <div className="flex-grow-1 d-flex align-items-center justify-content-center p-4">
          <div style={{ width: 360 }}>
            <h4 className="pacu-display mb-1">
              {step === 'totp-setup' ? 'Set up two-factor authentication' : 'Sign in'}
            </h4>
            <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
              {step === 'totp-setup'
                ? 'Required before your first login can continue.'
                : step === 'totp'
                  ? 'Enter the code from your authenticator app.'
                  : 'Use the account provided by your administrator.'}
            </p>

            {step === 'credentials' && (
              <form onSubmit={handleCredentials}>
                <div className="mb-3">
                  <label className="form-label">Username</label>
                  <input
                    className="form-control"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button className="btn btn-primary w-100" type="submit" disabled={loading}>
                  {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                  Sign In
                </button>
              </form>
            )}

            {step === 'totp' && (
              <form onSubmit={handleTotp}>
                <div className="mb-4">
                  <label className="form-label">6-digit authentication code</label>
                  <input
                    className="form-control pacu-mono fs-5 text-center"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <button className="btn btn-primary w-100" type="submit" disabled={loading}>
                  {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                  Verify
                </button>
              </form>
            )}

            {step === 'totp-setup' && (
              <form onSubmit={handleTotpSetupConfirm}>
                {qrCode ? (
                  <div className="text-center mb-4 p-3" style={{ backgroundColor: 'var(--pacu-bg)', borderRadius: 'var(--pacu-radius)' }}>
                    <img src={qrCode} alt="2FA QR code" className="img-fluid mb-2 bg-white p-2" style={{ maxWidth: 176, borderRadius: 'var(--pacu-radius-sm)' }} />
                    <p className="text-muted small mb-1">Scan with an authenticator app.</p>
                    <p className="text-muted small mb-0">
                      Can't scan? Enter manually: <code className="pacu-mono">{secret}</code>
                    </p>
                  </div>
                ) : (
                  <div className="d-flex justify-content-center mb-4">
                    <div className="spinner-border spinner-border-sm" />
                  </div>
                )}
                <div className="mb-4">
                  <label className="form-label">Enter the 6-digit code to confirm</label>
                  <input
                    className="form-control pacu-mono fs-5 text-center"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    autoFocus
                    disabled={!qrCode}
                  />
                </div>
                <button className="btn btn-primary w-100" type="submit" disabled={loading || !qrCode}>
                  {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                  Confirm & Finish Setup
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
