import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { clientService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Dashboard, DashboardCharts } from '../types/client';
import SupportStaffDashboardPage from './SupportStaffDashboardPage';

// 14 distinct colours for the donut slices
const DONUT_COLORS = [
  '#4f7ef7', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#10b981', '#6366f1',
];

function StatCard({
  icon, label, value, color, muted,
}: {
  icon: string; label: string; value: number | string; color: string; muted?: boolean;
}) {
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
            <div className={`fw-bold fs-4 lh-1 mb-1${muted ? ' text-muted' : ''}`}>{value}</div>
            <div className="text-muted" style={{ fontSize: '0.8rem' }}>{label}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="pacu-eyebrow mb-2 mt-4" style={{ fontSize: '0.7rem' }}>{children}</p>
  );
}

function fmtDay(dateStr: string) {
  const [, m, d] = dateStr.slice(0, 10).split('-');
  const month = new Date(0, Number(m) - 1).toLocaleString('en-US', { month: 'short' });
  return `${month} ${Number(d)}`;
}

function DailyBarChart({ data }: { data: DashboardCharts['daily'] }) {
  const formatted = data.map((p) => ({ ...p, label: fmtDay(p.date) }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--bs-border-color)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: 'var(--bs-secondary-color)' }}
          axisLine={false}
          tickLine={false}
          interval={1}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: 'var(--bs-secondary-color)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--bs-body-bg)',
            border: '1px solid var(--bs-border-color)',
            borderRadius: 8,
            fontSize: '0.82rem',
          }}
          labelStyle={{ color: 'var(--bs-body-color)', fontWeight: 600 }}
          itemStyle={{ color: 'var(--bs-body-color)' }}
          cursor={{ fill: 'var(--bs-border-color)', opacity: 0.4 }}
          formatter={(v: number) => [v, 'Completed']}
        />
        <Bar dataKey="count" fill="#4f7ef7" radius={[4, 4, 0, 0]} name="Completed" maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function CategoryDonut({ data }: { data: NonNullable<DashboardCharts['categories']> }) {
  if (data.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100 text-muted" style={{ minHeight: 220, fontSize: '0.85rem' }}>
        No issue data yet.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          innerRadius={46}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--bs-body-bg)',
            border: '1px solid var(--bs-border-color)',
            borderRadius: 8,
            fontSize: '0.82rem',
          }}
          labelStyle={{ color: 'var(--bs-body-color)' }}
          itemStyle={{ color: 'var(--bs-body-color)' }}
          formatter={(v: number, name: string) => [v, name]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '0.75rem', paddingTop: 8 }}
          formatter={(value: string) => (
            <span style={{ color: 'var(--bs-body-color)' }}>
              {value.length > 22 ? value.slice(0, 22) + '…' : value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function DashboardPage() {
  const { role } = useAuth();
  if (role === 'support_staff') return <SupportStaffDashboardPage />;
  return <MainDashboard />;
}

function MainDashboard() {
  const { role } = useAuth();
  const [data, setData] = useState<Dashboard | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [dash, chartData] = await Promise.all([
        clientService.getDashboard(),
        clientService.getDashboardCharts(),
      ]);
      setData(dash);
      setCharts(chartData);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not load dashboard', text: err instanceof Error ? err.message : 'Please try again' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const isLawyer = role === 'lawyer';
  const showCategories = false;

  return (
    <div>
      <div className="mb-1">
        <h1 className="pacu-display mb-0">Dashboard</h1>
      </div>
      <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
        {isLawyer ? 'Your consultation activity and live queue overview.' : 'Live overview of today\'s queue and transaction activity.'}
      </p>

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      ) : data ? (
        <>
          {/* Charts */}
          {charts && (
            <>
              <SectionLabel>Trends</SectionLabel>
              <div className="row g-4 mb-2">
                <div className="col-12">
                  <div className="card">
                    <div className="card-body p-4">
                      <p className="fw-semibold mb-1" style={{ fontSize: '0.85rem' }}>
                        {isLawyer ? 'My Completed Transactions' : 'Completed Transactions'} — Last 14 Days
                      </p>
                      <p className="text-muted mb-3" style={{ fontSize: '0.78rem' }}>Daily count of completed transactions</p>
                      <DailyBarChart data={charts.daily} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Lawyer-specific stats */}
          {isLawyer && data.my && (
            <>
              <SectionLabel>My Activity</SectionLabel>
              <div className="row g-3">
                <StatCard icon="bi-person-fill" label="Active Client" value={data.my.in_progress} color="var(--pacu-accent)" />
                <StatCard icon="bi-hourglass-split" label="My Incomplete" value={data.my.incomplete} color="var(--bs-warning)" muted={data.my.incomplete === 0} />
                <StatCard icon="bi-check2-circle" label="My Completed Today" value={data.my.completed_today} color="var(--bs-success)" muted={data.my.completed_today === 0} />
                <StatCard icon="bi-calendar-check" label="Completed This Month" value={data.my.completed_this_month} color="var(--bs-info)" />
              </div>
              <SectionLabel>Queue Overview</SectionLabel>
            </>
          )}

          {/* Queue / global stats */}
          <div className="row g-3">
            <StatCard icon="bi-hourglass-split" label="Waiting" value={data.queue.waiting} color="var(--pacu-accent)" />
            <StatCard icon="bi-star-fill" label="Priority Waiting" value={data.queue.priority_waiting} color="var(--bs-warning)" muted={data.queue.priority_waiting === 0} />
            <StatCard icon="bi-pause-circle" label="Incomplete" value={data.queue.incomplete} color="var(--bs-secondary)" muted={data.queue.incomplete === 0} />
            <StatCard icon="bi-check-circle" label="Total Completed Today" value={data.queue.completed_today} color="var(--bs-success)" muted={data.queue.completed_today === 0} />
          </div>
        </>
      ) : null}
    </div>
  );
}
