import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { clientService } from '../services/api';
import type { SupportStaffDashboard, ActivityItem, Client } from '../types/client';

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number | string; color: string }) {
  return (
    <div className="col-sm-6 col-lg-3">
      <div className="card h-100">
        <div className="card-body p-4 d-flex align-items-center gap-3">
          <span
            className="d-inline-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: 44, height: 44, borderRadius: 'var(--pacu-radius-sm)', backgroundColor: color + '20', color }}
          >
            <i className={`bi ${icon} fs-5`} />
          </span>
          <div>
            <div className="fw-bold fs-4 lh-1 mb-1">{value}</div>
            <div className="text-muted" style={{ fontSize: '0.8rem' }}>{label}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function isPriority(c: Client) {
  return c.is_senior || c.is_pwd || c.is_pregnant;
}

function statusBadge(item: ActivityItem) {
  if (item.status === 'completed') {
    return <span className="pacu-badge" style={{ fontSize: '0.65rem' }}>Served</span>;
  }
  return <span className="pacu-badge pacu-badge--warning" style={{ fontSize: '0.65rem' }}>Removed</span>;
}

export default function SupportStaffDashboardPage() {
  const [data, setData] = useState<SupportStaffDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setData(await clientService.getSupportStaffDashboard());
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not load dashboard', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-1">
        <h1 className="pacu-display mb-0">Dashboard</h1>
        <button className="btn btn-sm btn-outline-secondary" onClick={load} disabled={loading}>
          <i className="bi bi-arrow-clockwise me-1" />
          Refresh
        </button>
      </div>
      <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>Queue management overview for today.</p>

      {/* Stats */}
      <div className="row g-3 mb-4">
        <StatCard icon="bi-hourglass-split" label="Clients Waiting" value={data.stats.waiting} color="var(--pacu-accent)" />
        <StatCard icon="bi-check2-circle" label="Clients Served Today" value={data.stats.served_today} color="var(--bs-success)" />
        <StatCard icon="bi-x-circle" label="Queue Removed Today" value={data.stats.removed_today} color="var(--bs-danger)" />
        <StatCard icon="bi-stopwatch" label="Avg. Wait Time" value="—" color="var(--bs-secondary)" />
      </div>

      <div className="row g-3">
        {/* Current Queue */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header d-flex align-items-center justify-content-between py-3 px-4">
              <span className="fw-semibold" style={{ fontSize: '0.9rem' }}>Current Queue</span>
              <span className="badge rounded-pill" style={{ backgroundColor: data.stats.waiting === 0 ? 'var(--bs-success)' : 'var(--bs-danger)', fontSize: '0.7rem' }}>
                {data.stats.waiting}
              </span>
            </div>
            {data.queue.length === 0 ? (
              <div className="card-body p-4 text-center text-muted">
                <i className="bi bi-check2-circle fs-2 d-block mb-2" />
                No one is waiting.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table mb-0 align-middle" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th className="ps-4">Queue #</th>
                      <th>Name</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.queue.map((c) => (
                      <tr key={c.client_id}>
                        <td className="ps-4"><span className="pacu-mono fw-semibold">{c.queue_number}</span></td>
                        <td>{c.first_name} {c.last_name}</td>
                        <td>
                          {isPriority(c) ? (
                            <div className="d-flex gap-1 flex-wrap">
                              {c.is_senior && <span className="pacu-badge" style={{ fontSize: '0.65rem' }}>Senior</span>}
                              {c.is_pwd && <span className="pacu-badge" style={{ fontSize: '0.65rem' }}>PWD</span>}
                              {c.is_pregnant && <span className="pacu-badge" style={{ fontSize: '0.65rem' }}>Pregnant</span>}
                            </div>
                          ) : <span className="text-muted">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header py-3 px-4">
              <span className="fw-semibold" style={{ fontSize: '0.9rem' }}>Recent Queue Activity</span>
            </div>
            {data.recent_activity.length === 0 ? (
              <div className="card-body p-4 text-center text-muted">
                <i className="bi bi-clock-history fs-2 d-block mb-2" />
                No activity yet today.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table mb-0 align-middle" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th className="ps-4">Time</th>
                      <th>Name</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_activity.map((item) => (
                      <tr key={item.client_id}>
                        <td className="ps-4 text-muted" style={{ whiteSpace: 'nowrap' }}>{fmtTime(item.updated_at)}</td>
                        <td>{item.first_name} {item.last_name}</td>
                        <td>{statusBadge(item)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
