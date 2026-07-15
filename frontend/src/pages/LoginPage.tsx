import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { ApiError, authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { OtpInput } from '../components/OtpInput';

type Step = 'credentials' | 'password-change' | 'totp' | 'totp-setup';
type Direction = 'forward' | 'back';

const MIN_PASSWORD_LENGTH = 12;

const PASSWORD_RULES = [
  { label: 'At least 12 characters', test: (v: string) => v.length >= MIN_PASSWORD_LENGTH },
  { label: 'Contains uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Contains lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'Contains number', test: (v: string) => /[0-9]/.test(v) },
  { label: 'Contains symbol', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

// Password resets and 2FA resets are admin-performed by design — there is no
// self-service path — so the login screen has to say where to go instead.
const ADMIN_HELP = 'Contact your PACU administrator to have your password or authenticator reset.';

const GENERIC_CREDENTIALS_ERROR = 'Invalid email or password.';
const GENERIC_TOTP_ERROR = 'Invalid verification code.';

// A 429 is the rate limiter, not a bad credential. It has to be told apart from a
// 401: the vague "invalid email or password" message is deliberate for a genuine
// auth failure (it must not reveal whether an account exists), but showing it to a
// locked-out user is a lie that invites them to keep retrying and extend the
// lockout. The limiter's own message says how to recover, so surface it verbatim.
function isRateLimited(err: unknown): err is ApiError {
  return err instanceof ApiError && err.status === 429;
}

function CapsLockWarning() {
  return (
    <p className="pacu-auth-caps" role="status">
      <i className="bi bi-capslock" />
      Caps Lock is on.
    </p>
  );
}

export default function LoginPage() {
  const [step, setStep] = useState<Step>('credentials');
  const [direction, setDirection] = useState<Direction>('forward');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  // True only for field-level problems (mismatch / unmet rules), which turn the inputs
  // red. Server errors (e.g. a rate limit) show the message without flagging the fields.
  const [passwordFieldsInvalid, setPasswordFieldsInvalid] = useState(false);
  const [showPasswordChecklist, setShowPasswordChecklist] = useState(false);
  const [code, setCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [credentialsError, setCredentialsError] = useState('');
  const [totpError, setTotpError] = useState('');
  const [shake, setShake] = useState(false);
  const [otpFocusSignal, setOtpFocusSignal] = useState(0);
  const [capsLock, setCapsLock] = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);

  // Caps Lock state is only readable from a keyboard/mouse event, never queryable
  // directly — so track it from events on the password fields themselves. Cleared
  // on blur so a stale warning can't linger on a field the user has left.
  function trackCapsLock(e: React.KeyboardEvent | React.MouseEvent) {
    setCapsLock(e.getModifierState('CapsLock'));
  }

  const auth = useAuth();
  const navigate = useNavigate();

  function fireShake() {
    setShake(false);
    requestAnimationFrame(() => setShake(true));
  }

  function goTo(nextStep: Step, dir: Direction) {
    setDirection(dir);
    setStep(nextStep);
  }

  // Route the pre-auth response into the correct next step. Shared by the credentials
  // form and the forced password-change form (which also returns a 2FA hand-off).
  async function routeAfterAuthStep(data: Awaited<ReturnType<typeof authService.login>>) {
    if (data.requiresPasswordChange && data.tempToken) {
      setTempToken(data.tempToken);
      goTo('password-change', 'forward');
    } else if (data.requiresTOTP && data.tempToken) {
      setTempToken(data.tempToken);
      setOtpFocusSignal((n) => n + 1);
      goTo('totp', 'forward');
    } else if (data.requiresTOTPSetup && data.tempToken) {
      setTempToken(data.tempToken);
      goTo('totp-setup', 'forward');
    } else if (data.token) {
      await finishLogin(data.token);
    }
  }

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setCredentialsError('');
    setLoading(true);
    try {
      const data = await authService.login(email, password);
      await routeAfterAuthStep(data);
    } catch (err) {
      if (isRateLimited(err)) {
        // Keep what they typed: the password wasn't necessarily wrong, and clearing
        // it would make the retry after the cooldown needlessly punishing.
        setCredentialsError(err.message);
      } else {
        // Generic message regardless of backend detail — never reveal whether the username exists.
        setCredentialsError(GENERIC_CREDENTIALS_ERROR);
        setPassword('');
        requestAnimationFrame(() => passwordRef.current?.focus());
      }
      fireShake();
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordChangeError('');
    setPasswordFieldsInvalid(false);
    const allRulesMet = PASSWORD_RULES.every((r) => r.test(newPassword));
    if (!allRulesMet) {
      setShowPasswordChecklist(true);
      setPasswordChangeError('Please meet all password requirements.');
      setPasswordFieldsInvalid(true);
      fireShake();
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordChangeError('Passwords do not match.');
      setPasswordFieldsInvalid(true);
      fireShake();
      return;
    }
    setLoading(true);
    try {
      const data = await authService.changePasswordForced(tempToken, newPassword);
      setNewPassword('');
      setConfirmPassword('');
      await routeAfterAuthStep(data);
    } catch (err) {
      // Server-side failure (e.g. rate limit): show the message, but don't flag the
      // password fields as invalid — they aren't the problem.
      setPasswordChangeError(err instanceof Error ? err.message : 'Could not change password.');
      fireShake();
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
        goTo('credentials', 'back');
      });
  }, [step, tempToken]);

  async function finishLogin(token: string) {
    setSuccess(true);
    auth.login(token);
    await new Promise((resolve) => setTimeout(resolve, 550));
    navigate('/dashboard');
  }

  async function handleTotp(codeValue?: string) {
    setTotpError('');
    setLoading(true);
    try {
      const data = await authService.verifyTotp(tempToken, codeValue ?? code);
      if (data.token) {
        await finishLogin(data.token);
      }
    } catch (err) {
      if (isRateLimited(err)) {
        setTotpError(err.message);
      } else {
        setTotpError(GENERIC_TOTP_ERROR);
        setCode('');
        setOtpFocusSignal((n) => n + 1);
      }
      fireShake();
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
        await finishLogin(data.token);
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Setup failed', text: err instanceof Error ? err.message : 'Invalid code' });
      setLoading(false);
    }
  }

  function handleBackToCredentials() {
    setTotpError('');
    setCode('');
    setPassword('');
    goTo('credentials', 'back');
    requestAnimationFrame(() => passwordRef.current?.focus());
  }

  const stepTitle =
    step === 'totp-setup' ? 'Set up two-factor authentication'
      : step === 'totp' ? 'Verify it\'s you'
      : step === 'password-change' ? 'Set a new password'
      : 'Welcome back';
  const stepSubtitle =
    step === 'totp-setup'
      ? 'Required before your first login can continue.'
      : step === 'totp'
        ? 'Enter the 6-digit code from your authenticator app.'
        : step === 'password-change'
          ? 'Choose a new password to replace the temporary one.'
          : 'Sign in with the account provided by your administrator.';

  return (
    <div className="pacu-auth-shell">
      {/* Brand panel — fixed institutional identity, deliberately distinct from the themed form panel */}
      <div className="pacu-auth-hero d-none d-lg-flex">
        <div className="d-flex flex-column" style={{ lineHeight: 1.15 }}>
          <span className="pacu-display fs-4">PACU</span>
          <span className="pacu-display fs-4">Legal Assistance</span>
          <span className="pacu-display fs-4">Monitoring System</span>
        </div>

        <div>
          <p className="pacu-eyebrow pacu-auth-hero-eyebrow mb-3">
            Department of Labor and Employment
          </p>
          <h1 className="pacu-display pacu-auth-hero-title mb-3" style={{ fontSize: '2.25rem' }}>
            Public Assistance and Complaints Unit
          </h1>
          <p className="pacu-auth-hero-lead mb-0">
            Internal case management for legal assistance provided to walk-in clients.
          </p>
        </div>

        <div className="d-flex flex-column gap-3">
          <div className="pacu-auth-hero-panel">
            <p className="pacu-auth-hero-panel-title">
              <i className="bi bi-question-circle" />
              Trouble signing in?
            </p>
            <p className="pacu-auth-hero-panel-body">{ADMIN_HELP}</p>
          </div>

          <div className="pacu-auth-hero-panel">
            <p className="pacu-auth-hero-panel-title">
              <i className="bi bi-shield-lock" />
              Authorized access only
            </p>
            <p className="pacu-auth-hero-panel-body">
              This system holds confidential client information. Access is limited to authorized
              DOLE personnel, and activity is recorded.
            </p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="pacu-auth-formside">
        <div className="pacu-auth-topnav">
          <div />
          <div className="pacu-dole-banner">
            <img src="/dole-logo.png" alt="DOLE" className="pacu-dole-banner-logo" />
            <div className="pacu-dole-banner-text">
              <div className="pacu-dole-banner-republic">
                <span>Republic of the Philippines</span>
                <span className="pacu-dole-banner-rule" />
              </div>
              <div className="pacu-dole-banner-dept">Department of Labor and Employment</div>
            </div>
            <img src="/Bagong Pilipinas Logo.png" alt="Bagong Pilipinas" className="pacu-dole-banner-logo" />
          </div>
          <div className="pacu-auth-topnav-right">
            <ThemeToggle />
          </div>
        </div>

        <div className="pacu-auth-card-viewport">
          {/* System name above the card — shown only on mobile, where the hero panel
              (which already carries it) is hidden. */}
          <div className="pacu-auth-mobile-brand d-lg-none">
            <span className="pacu-display">PACU Legal Assistance Monitoring System</span>
          </div>

          <div
            key={step}
            data-dir={direction}
            className={`pacu-auth-card pacu-auth-step${shake ? ' pacu-auth-shake' : ''}${success ? ' pacu-auth-success' : ''}`}
            onAnimationEnd={() => setShake(false)}
          >
            {success ? (
              <div className="text-center py-4" role="status" aria-live="polite">
                <div
                  className="d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: 'var(--pacu-accent-soft)', color: 'var(--pacu-accent)' }}
                >
                  <i className="bi bi-check-lg fs-3" />
                </div>
                <h5 className="pacu-display mb-1">Signed in</h5>
                <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                  Taking you to your dashboard&hellip;
                </p>
              </div>
            ) : (
              <>
                <h4 className="pacu-display mb-1">{stepTitle}</h4>
                <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
                  {stepSubtitle}
                </p>

                {step === 'credentials' && (
                  <form onSubmit={handleCredentials} noValidate>
                    <div className="mb-3 pacu-auth-field">
                      <label className="form-label" htmlFor="auth-email">
                        Email address
                      </label>
                      <input
                        id="auth-email"
                        type="email"
                        className="form-control"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                        autoComplete="email"
                        disabled={loading}
                      />
                    </div>
                    <div className={`mb-2 pacu-auth-field${credentialsError ? ' is-error' : ''}`}>
                      <label className="form-label" htmlFor="auth-password">
                        Password
                      </label>
                      <input
                        id="auth-password"
                        ref={passwordRef}
                        type="password"
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={trackCapsLock}
                        onKeyUp={trackCapsLock}
                        onClick={trackCapsLock}
                        onBlur={() => setCapsLock(false)}
                        required
                        autoComplete="current-password"
                        disabled={loading}
                        aria-invalid={!!credentialsError}
                        aria-describedby={credentialsError ? 'auth-credentials-error' : undefined}
                      />
                      {capsLock && <CapsLockWarning />}
                    </div>
                    {credentialsError && (
                      <p id="auth-credentials-error" className="pacu-auth-error" role="alert">
                        <i className="bi bi-exclamation-circle" />
                        {credentialsError}
                      </p>
                    )}
                    <button className="btn btn-primary w-100 mt-3" type="submit" disabled={loading}>
                      {loading ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : null}
                      Sign In
                    </button>
                  </form>
                )}

                {step === 'password-change' && (
                  <form onSubmit={handlePasswordChange} noValidate>
                    <div className="mb-3 pacu-auth-field">
                      <label className="form-label" htmlFor="auth-new-password">
                        New password
                      </label>
                      <input
                        id="auth-new-password"
                        type="password"
                        className="form-control"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onFocus={() => setShowPasswordChecklist(true)}
                        onKeyDown={trackCapsLock}
                        onKeyUp={trackCapsLock}
                        onClick={trackCapsLock}
                        onBlur={() => setCapsLock(false)}
                        required
                        autoFocus
                        autoComplete="new-password"
                        disabled={loading}
                        aria-invalid={passwordFieldsInvalid}
                      />
                      {capsLock && <CapsLockWarning />}
                      {showPasswordChecklist && (
                        <ul className="list-unstyled mt-2 mb-0" style={{ fontSize: '0.8rem' }}>
                          {PASSWORD_RULES.map((rule) => {
                            const met = rule.test(newPassword);
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
                    <div className={`mb-2 pacu-auth-field${passwordFieldsInvalid ? ' is-error' : ''}`}>
                      <label className="form-label" htmlFor="auth-confirm-password">
                        Confirm new password
                      </label>
                      <input
                        id="auth-confirm-password"
                        type="password"
                        className="form-control"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={trackCapsLock}
                        onKeyUp={trackCapsLock}
                        onClick={trackCapsLock}
                        onBlur={() => setCapsLock(false)}
                        required
                        autoComplete="new-password"
                        disabled={loading}
                        aria-invalid={passwordFieldsInvalid}
                        aria-describedby={passwordChangeError ? 'auth-password-change-error' : undefined}
                      />
                      {capsLock && <CapsLockWarning />}
                    </div>
                    {passwordChangeError && (
                      <p id="auth-password-change-error" className="pacu-auth-error" role="alert">
                        <i className="bi bi-exclamation-circle" />
                        {passwordChangeError}
                      </p>
                    )}
                    <button className="btn btn-primary w-100 mt-3" type="submit" disabled={loading}>
                      {loading ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : null}
                      Set Password &amp; Continue
                    </button>
                  </form>
                )}

                {step === 'totp' && (
                  <div>
                    <div className="mb-2">
                      <label className="form-label d-block text-center" htmlFor="auth-otp-0">
                        Verification code
                      </label>
                      <OtpInput
                        value={code}
                        onChange={setCode}
                        onComplete={(full) => handleTotp(full)}
                        disabled={loading}
                        error={!!totpError}
                        focusSignal={otpFocusSignal}
                      />
                    </div>
                    {totpError && (
                      <p className="pacu-auth-error justify-content-center" role="alert">
                        <i className="bi bi-exclamation-circle" />
                        {totpError}
                      </p>
                    )}
                    <button
                      className="btn btn-primary w-100 mt-4"
                      type="button"
                      disabled={loading || code.length !== 6}
                      onClick={() => handleTotp()}
                    >
                      {loading ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : null}
                      Verify
                    </button>
                    <button
                      className="btn btn-outline-secondary w-100 mt-2"
                      type="button"
                      onClick={handleBackToCredentials}
                      disabled={loading}
                    >
                      <i className="bi bi-arrow-left me-2" />
                      Back
                    </button>
                  </div>
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
                        <div className="spinner-border spinner-border-sm" role="status" aria-label="Loading QR code" />
                      </div>
                    )}
                    <div className="mb-2">
                      <label className="form-label d-block text-center">Enter the 6-digit code to confirm</label>
                      <OtpInput
                        value={code}
                        onChange={setCode}
                        disabled={loading || !qrCode}
                        focusSignal={qrCode ? 1 : 0}
                      />
                    </div>
                    <button className="btn btn-primary w-100 mt-4" type="submit" disabled={loading || !qrCode || code.length !== 6}>
                      {loading ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : null}
                      Confirm & Finish Setup
                    </button>
                  </form>
                )}
              </>
            )}
          </div>

          {/* Below-card notices — mobile only. On desktop the hero panel carries
              the same help + access notice, so repeating them here is redundant. */}
          {!success && (
            <div className="pacu-auth-notice d-lg-none">
              <p className="mb-1">
                <i className="bi bi-question-circle" />
                {ADMIN_HELP}
              </p>
              <p className="mb-0">
                <i className="bi bi-shield-lock" />
                Authorized DOLE personnel only. Activity is recorded.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
