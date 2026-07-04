import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/user';
import { BrandMark } from './BrandMark';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles?: UserRole[];
  section?: 'main' | 'admin';
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'bi-grid-1x2', section: 'main' },
  { to: '/queue', label: 'Queue', icon: 'bi-people', roles: ['personnel', 'lawyer', 'admin'], section: 'main' },
  { to: '/clients', label: 'My Clients', icon: 'bi-person-lines-fill', roles: ['lawyer'], section: 'main' },
  { to: '/admin/users', label: 'Users', icon: 'bi-person-badge', roles: ['admin'], section: 'admin' },
  { to: '/admin/categories', label: 'Issue Categories', icon: 'bi-tags', roles: ['admin'], section: 'admin' },
  { to: '/admin/offices', label: 'Referral Offices', icon: 'bi-building', roles: ['admin'], section: 'admin' },
  { to: '/admin/reports', label: 'Reports', icon: 'bi-bar-chart-line', roles: ['admin'], section: 'admin' },
];

export function Sidebar() {
  const { role } = useAuth();
  const items = NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role)));
  const mainItems = items.filter((i) => i.section !== 'admin');
  const adminItems = items.filter((i) => i.section === 'admin');

  return (
    <aside className="pacu-sidebar d-flex flex-column py-4" style={{ width: 252, minHeight: '100vh' }}>
      <div className="d-flex align-items-center gap-2 px-4 mb-4">
        <BrandMark size={32} />
        <div className="lh-1">
          <div className="pacu-display fs-5">PACU</div>
          <div className="pacu-eyebrow" style={{ letterSpacing: '0.1em', fontSize: '0.62rem' }}>
            Legal Assistance
          </div>
        </div>
      </div>

      <nav className="d-flex flex-column gap-1 px-3">
        {mainItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `pacu-nav-link nav-link d-flex align-items-center gap-2 px-3 py-2 ${isActive ? 'active' : ''}`}
          >
            <i className={`bi ${item.icon}`} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {adminItems.length > 0 && (
        <>
          <div className="pacu-eyebrow px-4 mt-4 mb-2">Administration</div>
          <nav className="d-flex flex-column gap-1 px-3">
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `pacu-nav-link nav-link d-flex align-items-center gap-2 px-3 py-2 ${isActive ? 'active' : ''}`}
              >
                <i className={`bi ${item.icon}`} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </>
      )}
    </aside>
  );
}
