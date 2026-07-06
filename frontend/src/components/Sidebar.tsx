import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { clientService } from '../services/api';
import type { UserRole } from '../types/user';
import { BrandMark } from './BrandMark';

type NavGroup = 'home' | 'ongoing' | 'history' | 'admin';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles?: UserRole[];
  group: NavGroup;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'bi-grid-1x2', group: 'home' },
  { to: '/queue', label: 'Queue', icon: 'bi-people', roles: ['personnel', 'lawyer', 'admin'], group: 'ongoing' },
  { to: '/clients', label: 'My Clients', icon: 'bi-person-lines-fill', roles: ['lawyer'], group: 'ongoing' },
  { to: '/history', label: 'Completed Transactions', icon: 'bi-clock-history', roles: ['lawyer'], group: 'history' },
  { to: '/admin/users', label: 'Users', icon: 'bi-person-badge', roles: ['admin'], group: 'admin' },
  { to: '/admin/categories', label: 'Issue Categories', icon: 'bi-tags', roles: ['admin'], group: 'admin' },
  { to: '/admin/offices', label: 'Referral Offices', icon: 'bi-building', roles: ['admin'], group: 'admin' },
  { to: '/admin/reports', label: 'Reports', icon: 'bi-bar-chart-line', roles: ['admin'], group: 'admin' },
];

const GROUP_ORDER: NavGroup[] = ['home', 'ongoing', 'history', 'admin'];
const GROUP_LABELS: Record<NavGroup, string> = {
  home: 'Home',
  ongoing: 'Ongoing',
  history: 'History',
  admin: 'Administration',
};

const MOBILE_QUERY = '(max-width: 991.98px)';

export function Sidebar() {
  const { role, logout } = useAuth();
  const { collapsed, close } = useSidebar();
  const navigate = useNavigate();
  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role)));

  const [queueCount, setQueueCount] = useState<number | null>(null);
  const [myClientsCount, setMyClientsCount] = useState<number | null>(null);

  useEffect(() => {
    const canSeeQueue = role && ['personnel', 'lawyer', 'admin'].includes(role);
    const canSeeClients = role === 'lawyer';

    async function fetchCounts() {
      const [queueResult, clientsResult] = await Promise.allSettled([
        canSeeQueue ? clientService.listQueue() : Promise.resolve(null),
        canSeeClients ? clientService.listMine() : Promise.resolve(null),
      ]);
      if (queueResult.status === 'fulfilled' && queueResult.value !== null) {
        setQueueCount(queueResult.value.length);
      }
      if (clientsResult.status === 'fulfilled' && clientsResult.value !== null) {
        setMyClientsCount(clientsResult.value.length);
      }
    }

    fetchCounts();
    const id = setInterval(fetchCounts, 30_000);
    return () => clearInterval(id);
  }, [role]);
  const groups = GROUP_ORDER
    .map((group) => ({ group, label: GROUP_LABELS[group], items: visibleItems.filter((i) => i.group === group) }))
    .filter((g) => g.items.length > 0);

  // On the mobile drawer, picking a destination should close it; on desktop
  // the same click shouldn't collapse the rail, so this only fires below the
  // drawer breakpoint — same toggle state, viewport-conditioned UX only.
  function handleNavClick() {
    if (window.matchMedia(MOBILE_QUERY).matches) close();
  }

  async function handleLogout() {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Log out?',
      showCancelButton: true,
      confirmButtonColor: 'var(--pacu-accent)',
      confirmButtonText: 'Log out',
    });
    if (!result.isConfirmed) return;

    logout();
    navigate('/login');
  }

  return (
    <>
      <aside className={`pacu-sidebar d-flex flex-column py-4${collapsed ? ' is-collapsed' : ''}`}>
        <div className="pacu-sidebar-brand-row d-flex align-items-center gap-2 px-4 mb-3">
          <BrandMark size={32} />
          <div className="lh-1 pacu-sidebar-label">
            <div className="pacu-display fs-5">PACU</div>
            <div className="pacu-eyebrow" style={{ letterSpacing: '0.1em', fontSize: '0.62rem' }}>
              Legal Assistance
            </div>
          </div>
        </div>

        <hr className="pacu-sidebar-divider mx-4 mt-0 mb-3" />

        {groups.map((group, idx) => (
          <div key={group.group} className={idx === 0 ? '' : 'mt-4'}>
            <div className="pacu-eyebrow pacu-sidebar-label px-4 mb-2">{group.label}</div>
            <nav className="d-flex flex-column gap-1 px-3">
              {group.items.map((item) => {
                const badgeCount =
                  item.to === '/queue' ? queueCount :
                  item.to === '/clients' ? myClientsCount :
                  null;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={item.label}
                    onClick={handleNavClick}
                    className={({ isActive }) => `pacu-nav-link nav-link d-flex align-items-center gap-2 px-3 py-2 ${isActive ? 'active' : ''}`}
                  >
                    <i className={`bi ${item.icon}`} />
                    <span className="pacu-sidebar-label">{item.label}</span>
                    {badgeCount !== null && badgeCount > 0 && (
                      <span className="badge rounded-pill ms-auto pacu-sidebar-label" style={{ backgroundColor: 'var(--bs-danger)', fontSize: '0.7rem' }}>
                        {badgeCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}

        <div className="mt-auto px-3 pt-3">
          <button
            type="button"
            title="Log out"
            onClick={handleLogout}
            className="pacu-nav-link nav-link d-flex align-items-center gap-2 px-3 py-2 w-100"
            style={{ border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
          >
            <i className="bi bi-box-arrow-right" />
            <span className="pacu-sidebar-label">Log out</span>
          </button>
        </div>
      </aside>

      {/* Backdrop only renders visibly on the mobile drawer (see sidebar.css) */}
      <div
        className={`pacu-sidebar-backdrop${!collapsed ? ' is-visible' : ''}`}
        onClick={close}
        aria-hidden="true"
      />
    </>
  );
}
