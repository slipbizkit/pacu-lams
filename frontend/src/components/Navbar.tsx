import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeSwitcher } from './ThemeSwitcher';

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
    <header className="pacu-navbar d-flex align-items-center justify-content-between px-4" style={{ height: 68 }}>
      <div />
      <div className="d-flex align-items-center gap-3">
        <ThemeSwitcher />

        {user && (
          <div className="d-flex align-items-center gap-2 ps-3 border-start" style={{ borderColor: 'var(--pacu-border)' }}>
            <span className="pacu-avatar">{initials(user.first_name, user.last_name)}</span>
            <div className="lh-sm d-none d-sm-block">
              <div className="fw-semibold" style={{ fontSize: '0.875rem' }}>
                {user.first_name} {user.last_name}
              </div>
              <span className="pacu-badge">{user.role}</span>
            </div>
          </div>
        )}

        <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={handleLogout}>
          <i className="bi bi-box-arrow-right" />
          <span className="d-none d-md-inline">Log out</span>
        </button>
      </div>
    </header>
  );
}
