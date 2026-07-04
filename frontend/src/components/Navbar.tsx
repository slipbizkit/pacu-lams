import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { ThemeToggle } from './ThemeToggle';

// Drives both the greeting bucket and the date/time display off one ticking
// clock, so a long-lived session crosses "morning" -> "afternoon" -> "evening"
// and the displayed time stays current without a page reload.
function useClock(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function greetingFor(date: Date) {
  const hour = date.getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

export function Navbar() {
  const { user } = useAuth();
  const { collapsed, toggle } = useSidebar();
  const now = useClock();

  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const timeLabel = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <header className="pacu-navbar d-flex align-items-center justify-content-between px-4" style={{ height: 68 }}>
      <div className="d-flex align-items-center gap-3" style={{ minWidth: 0 }}>
        <button
          type="button"
          className={`btn btn-sm btn-outline-secondary pacu-sidebar-toggle d-flex align-items-center justify-content-center flex-shrink-0${!collapsed ? ' is-active' : ''}`}
          onClick={toggle}
          title="Toggle Sidebar"
          aria-label="Toggle Sidebar"
          aria-pressed={!collapsed}
        >
          <i className="bi bi-list" style={{ fontSize: '1.1rem' }} />
        </button>

        <span className="pacu-display text-truncate" style={{ fontSize: '1.05rem' }}>
          {greetingFor(now)}
          {user ? `, ${user.first_name}` : ''}
        </span>
      </div>

      <div className="d-flex align-items-center gap-3">
        <span className="text-muted d-none d-md-inline" style={{ fontSize: '0.8rem' }}>
          {dateLabel} &bull; {timeLabel}
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}
