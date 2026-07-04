import { useAuth } from '../context/AuthContext';

const ROADMAP = [
  { icon: 'bi-people', title: 'Queue & intake', body: 'Kiosk self-encode and personnel-assisted intake, with priority clients surfaced first.' },
  { icon: 'bi-chat-square-text', title: 'Consultation console', body: 'Tag issues, record legal advice, and log the action taken on each case.' },
  { icon: 'bi-signpost-2', title: 'Referrals & reports', body: 'Optional referrals to partner offices, plus filterable PDF/Excel reporting.' },
];

export default function DashboardPage() {
  const { user, role } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      <p className="pacu-eyebrow mb-2">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      <h1 className="pacu-display mb-1">
        {greeting}{user ? `, ${user.first_name}` : ''}.
      </h1>
      <p className="text-muted" style={{ fontSize: '0.95rem' }}>
        Signed in as <span className="pacu-badge">{role}</span>
      </p>

      <div className="row g-3 mt-4">
        {ROADMAP.map((item) => (
          <div key={item.title} className="col-md-4">
            <div className="card h-100">
              <div className="card-body p-4">
                <span
                  className="d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ width: 40, height: 40, borderRadius: 'var(--pacu-radius-sm)', backgroundColor: 'var(--pacu-accent-soft)', color: 'var(--pacu-accent)' }}
                >
                  <i className={`bi ${item.icon} fs-5`} />
                </span>
                <h6 className="fw-semibold mb-2">{item.title}</h6>
                <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>{item.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-3">
        <div className="card-body p-4 d-flex align-items-center gap-3">
          <span
            className="d-inline-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: 40, height: 40, borderRadius: 'var(--pacu-radius-sm)', backgroundColor: 'var(--pacu-accent-soft)', color: 'var(--pacu-accent)' }}
          >
            <i className="bi bi-cone-striped fs-5" />
          </span>
          <div>
            <h6 className="fw-semibold mb-1">Foundation complete</h6>
            <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>
              Authentication and the dashboard shell are live. The screens above land in the next build phases.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
